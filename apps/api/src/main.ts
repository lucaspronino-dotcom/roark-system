import { NestFactory } from "@nestjs/core"
import { ValidationPipe } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"

import { AppModule } from "./app.module"

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  const configService = app.get(ConfigService)

  app.enableCors()
  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      whitelist: true,
    })
  )

  await app.listen(configService.get("PORT", 3000))
}

bootstrap()
