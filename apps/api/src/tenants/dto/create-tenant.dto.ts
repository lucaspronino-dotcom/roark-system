import { IsEmail, IsNotEmpty, IsOptional, IsString } from "class-validator"

export class CreateTenantDto {
  @IsString()
  @IsNotEmpty()
  firstName: string

  @IsString()
  @IsNotEmpty()
  lastName: string

  @IsString()
  @IsOptional()
  dni?: string | null

  @IsString()
  @IsNotEmpty()
  phone: string

  @IsEmail()
  @IsOptional()
  email?: string

  @IsString()
  @IsNotEmpty()
  rentalAddress: string
}
