import { Injectable, NotFoundException } from "@nestjs/common"

import { PrismaService } from "../prisma/prisma.service"

const propertyInclude = {
  owner: {
    include: {
      person: true,
    },
  },
}

@Injectable()
export class PropertiesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
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
}
