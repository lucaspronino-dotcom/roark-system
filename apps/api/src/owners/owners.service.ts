import { ConflictException, Injectable, NotFoundException } from "@nestjs/common"
import { Prisma } from "@prisma/client"

import { PrismaService } from "../prisma/prisma.service"
import { CreateOwnerDto } from "./dto/create-owner.dto"
import { UpdateOwnerDto } from "./dto/update-owner.dto"

const ownerInclude = {
  person: true,
} satisfies Prisma.OwnerInclude

@Injectable()
export class OwnersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.owner.findMany({
      include: ownerInclude,
      orderBy: {
        createdAt: "desc",
      },
    })
  }

  async findOne(id: string) {
    const owner = await this.prisma.owner.findUnique({
      where: { id },
      include: ownerInclude,
    })

    if (!owner) {
      throw new NotFoundException("Owner not found")
    }

    return owner
  }

  async create(createOwnerDto: CreateOwnerDto) {
    try {
      return await this.prisma.owner.create({
        data: {
          address: createOwnerDto.address,
          city: createOwnerDto.city,
          transferAliasOrCbu: createOwnerDto.transferAliasOrCbu,
          person: {
            create: {
              firstName: createOwnerDto.firstName,
              lastName: createOwnerDto.lastName,
              dni: createOwnerDto.dni,
              phone: createOwnerDto.phone,
              email: createOwnerDto.email,
            },
          },
        },
        include: ownerInclude,
      })
    } catch (error) {
      this.handleKnownRequestError(error)
    }
  }

  async update(id: string, updateOwnerDto: UpdateOwnerDto) {
    await this.findOne(id)

    try {
      return await this.prisma.owner.update({
        where: { id },
        data: {
          address: updateOwnerDto.address,
          city: updateOwnerDto.city,
          transferAliasOrCbu: updateOwnerDto.transferAliasOrCbu,
          person: {
            update: {
              firstName: updateOwnerDto.firstName,
              lastName: updateOwnerDto.lastName,
              dni: updateOwnerDto.dni,
              phone: updateOwnerDto.phone,
              email: updateOwnerDto.email,
            },
          },
        },
        include: ownerInclude,
      })
    } catch (error) {
      this.handleKnownRequestError(error)
    }
  }

  async remove(id: string) {
    await this.findOne(id)

    try {
      return await this.prisma.owner.delete({
        where: { id },
        include: ownerInclude,
      })
    } catch (error) {
      this.handleKnownRequestError(error)
    }
  }

  private handleKnownRequestError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        throw new ConflictException("A person with this DNI already exists")
      }

      if (error.code === "P2003") {
        throw new ConflictException("This owner is being used")
      }
    }

    throw error
  }
}
