import { Type } from "class-transformer"
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from "class-validator"

export class PropertyOwnerDto {
  @IsUUID()
  ownerId: string

  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean

  @IsNumber()
  @IsOptional()
  participation?: number

  @IsNumber()
  @IsOptional()
  administration?: number

  @IsNumber()
  @IsOptional()
  commission?: number
}

export class CreatePropertyDto {
  @IsString()
  @IsNotEmpty()
  folder: string

  @IsString()
  @IsNotEmpty()
  address: string

  @IsString()
  @IsNotEmpty()
  type: string

  @IsString()
  @IsNotEmpty()
  status: string

  @IsString()
  @IsNotEmpty()
  city: string

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PropertyOwnerDto)
  owners: PropertyOwnerDto[]
}
