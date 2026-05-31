import { Injectable, NotFoundException } from "@nestjs/common"
import { ContractStatus, Prisma } from "@prisma/client"

import { PrismaService } from "../prisma/prisma.service"

const contractInclude = {
  owner: {
    include: {
      person: true,
    },
  },
  property: true,
  tenant: {
    include: {
      person: true,
    },
  },
} satisfies Prisma.ContractInclude

@Injectable()
export class ContractsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const contracts = await this.prisma.contract.findMany({
      include: contractInclude,
      orderBy: {
        createdAt: "desc",
      },
    })

    return contracts.map(toContractListItem)
  }

  async findOne(id: string) {
    const contract = await this.prisma.contract.findUnique({
      where: { id },
      include: contractInclude,
    })

    if (!contract) {
      throw new NotFoundException("Contract not found")
    }

    return toContractListItem(contract)
  }
}

function toContractListItem(contract: ContractWithRelations) {
  return {
    id: contract.id,
    folder: contract.folder,
    end: formatDate(contract.endDate),
    address: contract.property.address,
    status:
      contract.status === ContractStatus.EXPIRED ? "Vencido" : "Alquiler",
    tenant: formatPersonName(contract.tenant.person),
    owner: formatPersonName(contract.owner.person),
    propertyId: contract.property.id,
    tenantId: contract.tenant.id,
    ownerId: contract.owner.id,
  }
}

function formatPersonName(person: { firstName: string; lastName: string }) {
  return `${person.lastName}, ${person.firstName}`.toLowerCase()
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date)
}

type ContractWithRelations = Awaited<
  Prisma.ContractGetPayload<{ include: typeof contractInclude }>
>
