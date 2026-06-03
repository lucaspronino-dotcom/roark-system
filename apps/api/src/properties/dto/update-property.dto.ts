import { Type } from "class-transformer"
import {
  IsArray,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator"

import { PropertyOwnerDto } from "./create-property.dto"

export class UpdatePropertyDto {
  @IsString()
  @IsOptional()
  folder?: string

  @IsString()
  @IsOptional()
  address?: string

  @IsString()
  @IsOptional()
  type?: string

  @IsString()
  @IsOptional()
  status?: string

  @IsString()
  @IsOptional()
  city?: string

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PropertyOwnerDto)
  @IsOptional()
  owners?: PropertyOwnerDto[]
}
