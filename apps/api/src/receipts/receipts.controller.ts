import { Body, Controller, Get, Post, Query } from "@nestjs/common"
import { ReceiptKind } from "@prisma/client"

import { CreateReceiptDto } from "./dto/create-receipt.dto"
import { ReceiptsService } from "./receipts.service"

@Controller("receipts")
export class ReceiptsController {
  constructor(private readonly receiptsService: ReceiptsService) {}

  @Get()
  findAll(
    @Query("contractId") contractId?: string,
    @Query("kind") kind?: ReceiptKind,
    @Query("personName") personName?: string,
  ) {
    return this.receiptsService.findAll({ contractId, kind, personName })
  }

  @Get("next-number")
  getNextNumber() {
    return this.receiptsService.getNextNumber()
  }

  @Post()
  create(@Body() createReceiptDto: CreateReceiptDto) {
    return this.receiptsService.create(createReceiptDto)
  }
}
