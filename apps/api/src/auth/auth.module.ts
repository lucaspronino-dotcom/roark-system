import { Body, CanActivate, Controller, ExecutionContext, Get, HttpCode, Injectable, Module, Post, Req, Res, UnauthorizedException, ForbiddenException, HttpException } from "@nestjs/common"
import { APP_GUARD } from "@nestjs/core"
import { IsString, Length } from "class-validator"
import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto"
import { PrismaService } from "../prisma/prisma.service"

const cookieName = "roark_session"
const ttl = 8 * 60 * 60 * 1000
export const allowedOrigins = () => (process.env.AUTH_ALLOWED_ORIGINS ?? "http://localhost:5173,http://127.0.0.1:5173,http://dev.roark.uno,https://dev.roark.uno").split(",").map(value => value.trim())
const digest = (token: string) => createHash("sha256").update(token).digest("hex")
const tokenFrom = (req: any) => (req.headers.cookie ?? "").split(";").map((part: string) => part.trim()).find((part: string) => part.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1)
const cookieOptions = () => ({ httpOnly: true, sameSite: "lax", secure: process.env.AUTH_COOKIE_SECURE === "true", path: "/" })

class LoginDto {
  @IsString() @Length(1, 100) username: string
  @IsString() @Length(1, 200) password: string
}

@Injectable()
class AuthGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}
  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest()
    if (!["GET", "HEAD", "OPTIONS"].includes(req.method) && req.headers.origin && !allowedOrigins().includes(req.headers.origin)) throw new ForbiddenException("Origen no permitido")
    if (context.getClass() === AuthController && context.getHandler().name === "login") return true
    if (req.method === "GET" && req.path === "/health") return true
    const token = tokenFrom(req)
    const session = token ? await this.prisma.session.findUnique({ where: { tokenHash: digest(token) }, include: { user: true } }) : null
    if (!session || session.expiresAt <= new Date() || !session.user.active) throw new UnauthorizedException("Iniciá sesión para continuar")
    req.auth = session
    return true
  }
}

@Controller("auth")
class AuthController {
  private attempts = new Map<string, { count: number, until: number }>()
  constructor(private readonly prisma: PrismaService) {}

  @Post("login") @HttpCode(200)
  async login(@Body() body: LoginDto, @Req() req: any, @Res({ passthrough: true }) res: any) {
    const now = Date.now()
    for (const [key, value] of this.attempts) if (value.until <= now) this.attempts.delete(key)
    const key = req.ip
    const attempt = this.attempts.get(key) ?? { count: 0, until: now + 60000 }
    if (attempt.count >= 10) throw new HttpException("Demasiados intentos. Esperá un minuto.", 429)
    attempt.count++
    this.attempts.set(key, attempt)
    const user = await this.prisma.user.findUnique({ where: { username: body.username } })
    const [salt, hash] = (user?.passwordHash ?? `${"0".repeat(32)}:${"0".repeat(128)}`).split(":")
    const actual = scryptSync(body.password, salt, 64)
    const expected = Buffer.from(hash, "hex")
    if (expected.length !== actual.length || !timingSafeEqual(actual, expected) || !user?.active) throw new UnauthorizedException("Usuario o contraseña incorrectos")
    this.attempts.delete(key)
    const token = randomBytes(32).toString("hex")
    await this.prisma.session.deleteMany({ where: { OR: [{ expiresAt: { lte: new Date() } }, ...(tokenFrom(req) ? [{ tokenHash: digest(tokenFrom(req)) }] : [])] } })
    await this.prisma.session.create({ data: { userId: user.id, tokenHash: digest(token), expiresAt: new Date(now + ttl) } })
    res.cookie(cookieName, token, { ...cookieOptions(), maxAge: ttl })
    res.setHeader("Cache-Control", "no-store")
    return { username: user.username }
  }

  @Get("me")
  me(@Req() req: any, @Res({ passthrough: true }) res: any) {
    res.setHeader("Cache-Control", "no-store")
    return { username: req.auth.user.username }
  }

  @Post("logout") @HttpCode(204)
  async logout(@Req() req: any, @Res({ passthrough: true }) res: any) {
    await this.prisma.session.deleteMany({ where: { id: req.auth.id } })
    res.clearCookie(cookieName, cookieOptions())
  }
}

@Module({ controllers: [AuthController], providers: [{ provide: APP_GUARD, useClass: AuthGuard }] })
export class AuthModule {}
