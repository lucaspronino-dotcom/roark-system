import { ContractStatus } from "@prisma/client"
import { IsEnum, IsObject, IsOptional, IsString, IsUUID } from "class-validator"

export class UpdateContractDto {
  @IsString()
  @IsOptional()
  folder?: string

  @IsString()
  @IsOptional()
  startDate?: string

  @IsString()
  @IsOptional()
  endDate?: string

  @IsEnum(ContractStatus)
  @IsOptional()
  status?: ContractStatus

  @IsUUID()
  @IsOptional()
  propertyId?: string

  @IsUUID()
  @IsOptional()
  tenantId?: string

  @IsUUID()
  @IsOptional()
  ownerId?: string

  @IsObject()
  @IsOptional()
  settings?: Record<string, unknown>
}
