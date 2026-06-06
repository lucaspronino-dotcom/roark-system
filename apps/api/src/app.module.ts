import { Module } from "@nestjs/common"

import { AppController } from "./app.controller"
import { AppService } from "./app.service"
import { ContractsModule } from "./contracts/contracts.module"
import { OwnersModule } from "./owners/owners.module"
import { PrismaModule } from "./prisma/prisma.module"
import { PropertiesModule } from "./properties/properties.module"
import { ReceiptsModule } from "./receipts/receipts.module"
import { TenantsModule } from "./tenants/tenants.module"

@Module({
  imports: [
    ContractsModule,
    OwnersModule,
    PrismaModule,
    PropertiesModule,
    ReceiptsModule,
    TenantsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
