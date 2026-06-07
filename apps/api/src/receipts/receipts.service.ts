import { BadRequestException, ConflictException, Injectable } from "@nestjs/common"
import { Prisma, Receipt, ReceiptKind } from "@prisma/client"

import { PrismaService } from "../prisma/prisma.service"
import { CreateReceiptDto } from "./dto/create-receipt.dto"

@Injectable()
export class ReceiptsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll({
    contractId,
    kind,
    personName,
  }: {
    contractId?: string
    kind?: ReceiptKind
    personName?: string
  }) {
    const receipts = await this.prisma.receipt.findMany({
      orderBy: [
        {
          date: "desc",
        },
        {
          number: "desc",
        },
      ],
      where: {
        contractId,
        kind,
        personName: personName ? { equals: personName, mode: "insensitive" } : undefined,
      },
    })

    if (kind === ReceiptKind.TENANT_SETTLEMENT && contractId) {
      const ownerReceipts = await this.prisma.receipt.findMany({
        where: {
          contractId,
          kind: ReceiptKind.OWNER_SETTLEMENT,
        },
      })
      const ownerReceiptPeriods = new Set(ownerReceipts.map(getReceiptPeriodKey))

      return receipts.map((receipt) =>
        toReceiptListItem(receipt, {
          isDeleteBlocked: ownerReceiptPeriods.has(getReceiptPeriodKey(receipt)),
        }),
      )
    }

    return receipts.map((receipt) => toReceiptListItem(receipt))
  }

  async getNextNumber() {
    return {
      number: await this.getNextReceiptNumber(),
    }
  }

  async create(createReceiptDto: CreateReceiptDto) {
    const number = createReceiptDto.number ?? (await this.getNextReceiptNumber())
    const snapshot = {
      items: createReceiptDto.items.map((item) => ({
        administration: item.administration,
        amount: item.amount,
        description: item.description,
        dueDate: item.dueDate,
        penalties: item.penalties,
        total: item.total,
      })),
      total: createReceiptDto.total,
    }

    try {
      const receipt = await this.prisma.receipt.create({
        data: {
          balance: createReceiptDto.balance,
          contractId: createReceiptDto.contractId,
          date: parseDate(createReceiptDto.date),
          kind: createReceiptDto.kind,
          number,
          paid: createReceiptDto.paid,
          pdfBase64: createReceiptDto.pdfBase64,
          personName: createReceiptDto.personName,
          snapshot,
          total: createReceiptDto.total,
        },
      })

      return toReceiptListItem(receipt)
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictException("Receipt number already exists")
      }

      throw error
    }
  }

  async remove(id: string) {
    const targetReceipt = await this.prisma.receipt.findUnique({
      where: {
        id,
      },
    })

    if (targetReceipt?.kind === ReceiptKind.TENANT_SETTLEMENT) {
      const targetPeriod = getReceiptPeriodKey(targetReceipt)
      const ownerReceipts = await this.prisma.receipt.findMany({
        where: {
          contractId: targetReceipt.contractId,
          kind: ReceiptKind.OWNER_SETTLEMENT,
        },
      })
      const hasOwnerReceipt = ownerReceipts.some(
        (receipt) => getReceiptPeriodKey(receipt) === targetPeriod,
      )

      if (hasOwnerReceipt) {
        throw new BadRequestException(
          "No se puede borrar el recibo del inquilino porque ya existe la liquidacion del propietario para ese periodo",
        )
      }
    }

    const receipt = await this.prisma.receipt.delete({
      where: {
        id,
      },
    })

    return toReceiptListItem(receipt)
  }

  private async getNextReceiptNumber() {
    const lastReceipt = await this.prisma.receipt.findFirst({
      orderBy: {
        number: "desc",
      },
      select: {
        number: true,
      },
    })

    return (lastReceipt?.number ?? 0) + 1
  }
}

function toReceiptListItem(
  receipt: ReceiptListItem,
  options: { isDeleteBlocked?: boolean } = {},
) {
  return {
    balance: receipt.balance,
    id: receipt.id,
    isDeleteBlocked: options.isDeleteBlocked ?? false,
    paid: receipt.paid,
    pdfBase64: receipt.pdfBase64,
    receipt: String(receipt.number),
    receiptDate: formatDate(receipt.date),
    snapshot: receipt.snapshot,
    total: receipt.total,
  }
}

function parseDate(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T00:00:00.000Z`)
  }

  const [day, month, year] = value.split("/").map(Number)

  return new Date(Date.UTC(year, month - 1, day))
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date)
}

function getReceiptPeriodKey(receipt: Receipt) {
  const snapshot = receipt.snapshot as ReceiptSnapshot | null
  const dueDate = snapshot?.items?.[0]?.dueDate

  if (dueDate) {
    return getDateTextMonthKey(dueDate)
  }

  return `${receipt.date.getUTCFullYear()}-${receipt.date.getUTCMonth() + 1}`
}

function getDateTextMonthKey(dateText: string) {
  const [, month, year] = dateText.split("/").map(Number)

  return `${year}-${month}`
}

type ReceiptListItem = Receipt

type ReceiptSnapshot = {
  items?: Array<{
    dueDate?: string
  }>
}
