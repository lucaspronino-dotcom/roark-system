import { IsEmail, IsOptional, IsString } from "class-validator"

export class UpdateTenantDto {
  @IsString()
  @IsOptional()
  firstName?: string

  @IsString()
  @IsOptional()
  lastName?: string

  @IsString()
  @IsOptional()
  dni?: string

  @IsString()
  @IsOptional()
  phone?: string

  @IsEmail()
  @IsOptional()
  email?: string

  @IsString()
  @IsOptional()
  rentalAddress?: string
}
