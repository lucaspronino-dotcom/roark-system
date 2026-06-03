import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common"
import { Prisma } from "@prisma/client"

import { PrismaService } from "../prisma/prisma.service"
import { CreatePropertyDto, PropertyOwnerDto } from "./dto/create-property.dto"
import { UpdatePropertyDto } from "./dto/update-property.dto"

const propertyInclude = {
  owners: {
    include: {
      owner: {
        include: {
          person: true,
        },
      },
    },
  },
} satisfies Prisma.PropertyInclude

@Injectable()
export class PropertiesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.property.findMany({
      include: propertyInclude,
      orderBy: {
        createdAt: "desc",
      },
    })
  }

  async findOne(id: string) {
    const property = await this.prisma.property.findUnique({
      where: { id },
      include: propertyInclude,
    })

    if (!property) {
      throw new NotFoundException("Property not found")
    }

    return property
  }

  async create(createPropertyDto: CreatePropertyDto) {
    this.ensureOwners(createPropertyDto.owners)

    try {
      return await this.prisma.property.create({
        data: {
          folder: createPropertyDto.folder,
          address: createPropertyDto.address,
          type: createPropertyDto.type,
          status: createPropertyDto.status,
          city: createPropertyDto.city,
          owners: {
            create: this.toPropertyOwnerCreateMany(createPropertyDto.owners),
          },
        },
        include: propertyInclude,
      })
    } catch (error) {
      this.handleKnownRequestError(error)
    }
  }

  async update(id: string, updatePropertyDto: UpdatePropertyDto) {
    await this.findOne(id)

    if (updatePropertyDto.owners) {
      this.ensureOwners(updatePropertyDto.owners)
    }

    try {
      return await this.prisma.property.update({
        where: { id },
        data: {
          folder: updatePropertyDto.folder,
          address: updatePropertyDto.address,
          type: updatePropertyDto.type,
          status: updatePropertyDto.status,
          city: updatePropertyDto.city,
          owners: updatePropertyDto.owners
            ? {
                deleteMany: {},
                create: this.toPropertyOwnerCreateMany(updatePropertyDto.owners),
              }
            : undefined,
        },
        include: propertyInclude,
      })
    } catch (error) {
      this.handleKnownRequestError(error)
    }
  }

  async remove(id: string) {
    await this.findOne(id)

    try {
      return await this.prisma.property.delete({
        where: { id },
        include: propertyInclude,
      })
    } catch (error) {
      this.handleKnownRequestError(error)
    }
  }

  private ensureOwners(owners: PropertyOwnerDto[]) {
    if (!owners.length) {
      throw new BadRequestException("A property needs at least one owner")
    }
  }

  private toPropertyOwnerCreateMany(owners: PropertyOwnerDto[]) {
    return owners.map((owner, index) => ({
      ownerId: owner.ownerId,
      isPrimary: owner.isPrimary ?? index === 0,
      participation: owner.participation ?? 100,
      administration: owner.administration ?? 0,
      commission: owner.commission ?? 0,
    }))
  }

  private handleKnownRequestError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        throw new ConflictException("A property with this folder and address already exists")
      }

      if (error.code === "P2003") {
        throw new ConflictException("This property references missing or used data")
      }
    }

    throw error
  }
}
