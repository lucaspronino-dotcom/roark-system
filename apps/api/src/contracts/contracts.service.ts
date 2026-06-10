import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common"
import { ContractStatus, Prisma } from "@prisma/client"

import { PrismaService } from "../prisma/prisma.service"
import { CreateContractDto } from "./dto/create-contract.dto"
import { UpdateContractDto } from "./dto/update-contract.dto"

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

  async create(createContractDto: CreateContractDto) {
    try {
      const contract = await this.prisma.contract.create({
        data: {
          folder: createContractDto.folder,
          startDate: parseDate(createContractDto.startDate),
          endDate: parseDate(createContractDto.endDate),
          status: createContractDto.status,
          propertyId: createContractDto.propertyId,
          tenantId: createContractDto.tenantId,
          ownerId: createContractDto.ownerId,
          settings: createContractDto.settings as Prisma.InputJsonValue,
        },
        include: contractInclude,
      })

      return toContractListItem(contract)
    } catch (error) {
      this.handleKnownRequestError(error)
    }
  }

  async update(id: string, updateContractDto: UpdateContractDto) {
    await this.findOne(id)

    try {
      const contract = await this.prisma.contract.update({
        where: { id },
        data: {
          folder: updateContractDto.folder,
          startDate: updateContractDto.startDate
            ? parseDate(updateContractDto.startDate)
            : undefined,
          endDate: updateContractDto.endDate
            ? parseDate(updateContractDto.endDate)
            : undefined,
          status: updateContractDto.status,
          propertyId: updateContractDto.propertyId,
          tenantId: updateContractDto.tenantId,
          ownerId: updateContractDto.ownerId,
          settings:
            updateContractDto.settings === undefined
              ? undefined
              : (updateContractDto.settings as Prisma.InputJsonValue),
        },
        include: contractInclude,
      })

      return toContractListItem(contract)
    } catch (error) {
      this.handleKnownRequestError(error)
    }
  }

  async remove(id: string) {
    await this.findOne(id)

    const contract = await this.prisma.contract.delete({
      where: { id },
      include: contractInclude,
    })

    return toContractListItem(contract)
  }

  private handleKnownRequestError(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      throw new ConflictException("This contract references missing data")
    }

    throw error
  }
}

function toContractListItem(contract: ContractWithRelations) {
  return {
    id: contract.id,
    folder: contract.property.folder,
    startDate: formatDate(contract.startDate),
    end: formatDate(contract.endDate),
    address: contract.property.address,
    status:
      contract.status === ContractStatus.EXPIRED ? "Vencido" : "Alquiler",
    tenant: formatPersonName(contract.tenant.person),
    owner: formatPersonName(contract.owner.person),
    propertyId: contract.property.id,
    settings: contract.settings,
    tenantId: contract.tenant.id,
    ownerId: contract.owner.id,
  }
}

function formatPersonName(person: { firstName: string; lastName: string }) {
  return `${person.lastName}, ${person.firstName}`.toLowerCase()
}

function parseDate(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T00:00:00.000Z`)
  }

  const [day, month, year] = value.split("/").map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))

  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException("Invalid date")
  }

  return date
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
