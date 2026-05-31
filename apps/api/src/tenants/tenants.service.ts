import { ConflictException, Injectable, NotFoundException } from "@nestjs/common"
import { Prisma } from "@prisma/client"

import { PrismaService } from "../prisma/prisma.service"
import { CreateTenantDto } from "./dto/create-tenant.dto"
import { UpdateTenantDto } from "./dto/update-tenant.dto"

const tenantInclude = {
  person: true,
} satisfies Prisma.TenantInclude

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.tenant.findMany({
      include: tenantInclude,
      orderBy: {
        createdAt: "desc",
      },
    })
  }

  async findOne(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: tenantInclude,
    })

    if (!tenant) {
      throw new NotFoundException("Tenant not found")
    }

    return tenant
  }

  async create(createTenantDto: CreateTenantDto) {
    try {
      return await this.prisma.tenant.create({
        data: {
          rentalAddress: createTenantDto.rentalAddress,
          person: {
            create: {
              firstName: createTenantDto.firstName,
              lastName: createTenantDto.lastName,
              dni: createTenantDto.dni,
              phone: createTenantDto.phone,
              email: createTenantDto.email,
            },
          },
        },
        include: tenantInclude,
      })
    } catch (error) {
      this.handleKnownRequestError(error)
    }
  }

  async update(id: string, updateTenantDto: UpdateTenantDto) {
    await this.findOne(id)

    try {
      return await this.prisma.tenant.update({
        where: { id },
        data: {
          rentalAddress: updateTenantDto.rentalAddress,
          person: {
            update: {
              firstName: updateTenantDto.firstName,
              lastName: updateTenantDto.lastName,
              dni: updateTenantDto.dni,
              phone: updateTenantDto.phone,
              email: updateTenantDto.email,
            },
          },
        },
        include: tenantInclude,
      })
    } catch (error) {
      this.handleKnownRequestError(error)
    }
  }

  async remove(id: string) {
    await this.findOne(id)

    return this.prisma.tenant.delete({
      where: { id },
      include: tenantInclude,
    })
  }

  private handleKnownRequestError(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new ConflictException("A person with this DNI already exists")
    }

    throw error
  }
}
