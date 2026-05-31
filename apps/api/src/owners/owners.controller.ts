import { Controller, Get, Param } from "@nestjs/common"

import { OwnersService } from "./owners.service"

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
}
