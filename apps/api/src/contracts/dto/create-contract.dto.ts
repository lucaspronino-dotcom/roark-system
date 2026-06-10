import { ContractStatus } from "@prisma/client"
import {
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
} from "class-validator"

export class CreateContractDto {
  @IsString()
  @IsNotEmpty()
  folder: string

  @IsString()
  @IsNotEmpty()
  startDate: string

  @IsString()
  @IsNotEmpty()
  endDate: string

  @IsEnum(ContractStatus)
  status: ContractStatus

  @IsUUID()
  propertyId: string

  @IsUUID()
  tenantId: string

  @IsUUID()
  ownerId: string

  @IsObject()
  @IsOptional()
  settings?: Record<string, unknown>
}
