import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common"

import { CreateOwnerDto } from "./dto/create-owner.dto"
import { OwnersService } from "./owners.service"
import { UpdateOwnerDto } from "./dto/update-owner.dto"

@Controller("owners")
export class OwnersController {
  constructor(private readonly ownersService: OwnersService) {}

  @Get()
  findAll() {
    return this.ownersService.findAll()
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.ownersService.findOne(id)
  }

  @Post()
  create(@Body() createOwnerDto: CreateOwnerDto) {
    return this.ownersService.create(createOwnerDto)
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() updateOwnerDto: UpdateOwnerDto) {
    return this.ownersService.update(id, updateOwnerDto)
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.ownersService.remove(id)
  }
}
