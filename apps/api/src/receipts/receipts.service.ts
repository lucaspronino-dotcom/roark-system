import { ConflictException, Injectable } from "@nestjs/common"
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

    return receipts.map(toReceiptListItem)
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
        amount: item.amount,
        description: item.description,
        dueDate: item.dueDate,
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

function toReceiptListItem(receipt: ReceiptListItem) {
  return {
    balance: receipt.balance,
    id: receipt.id,
    paid: receipt.paid,
    pdfBase64: receipt.pdfBase64,
    receipt: String(receipt.number),
    receiptDate: formatDate(receipt.date),
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

type ReceiptListItem = Receipt
