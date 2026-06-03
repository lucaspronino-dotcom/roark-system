import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common"

import { CreatePropertyDto } from "./dto/create-property.dto"
import { PropertiesService } from "./properties.service"
import { UpdatePropertyDto } from "./dto/update-property.dto"

@Controller("properties")
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) {}

  @Get()
  findAll() {
    return this.propertiesService.findAll()
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.propertiesService.findOne(id)
  }

  @Post()
  create(@Body() createPropertyDto: CreatePropertyDto) {
    return this.propertiesService.create(createPropertyDto)
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() updatePropertyDto: UpdatePropertyDto,
  ) {
    return this.propertiesService.update(id, updatePropertyDto)
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.propertiesService.remove(id)
  }
}
