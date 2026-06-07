import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from "class-validator"
import { ReceiptKind } from "@prisma/client"

class ReceiptItemDto {
  @IsString()
  dueDate!: string

  @IsString()
  description!: string

  @IsNumber()
  amount!: number

  @IsOptional()
  @IsNumber()
  administration?: number

  @IsOptional()
  @IsNumber()
  penalties?: number

  @IsOptional()
  @IsNumber()
  total?: number
}

export class CreateReceiptDto {
  @IsNumber()
  balance!: number

  @IsUUID()
  contractId!: string

  @IsString()
  date!: string

  @IsArray()
  items!: ReceiptItemDto[]

  @IsEnum(ReceiptKind)
  kind!: ReceiptKind

  @IsString()
  personName!: string

  @IsString()
  pdfBase64!: string

  @IsNumber()
  @Min(0)
  total!: number

  @IsNumber()
  @Min(0)
  paid!: number

  @IsOptional()
  @IsNumber()
  number?: number
}
