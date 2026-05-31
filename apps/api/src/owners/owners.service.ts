import { Injectable, NotFoundException } from "@nestjs/common"

import { PrismaService } from "../prisma/prisma.service"

const ownerInclude = {
  person: true,
}

@Injectable()
export class OwnersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
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
}
