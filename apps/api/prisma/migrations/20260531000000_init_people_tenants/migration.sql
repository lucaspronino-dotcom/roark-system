CREATE TABLE "people" (
    "id" UUID NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "dni" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "people_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tenants" (
    "id" UUID NOT NULL,
    "personId" UUID NOT NULL,
    "rentalAddress" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "people_dni_key" ON "people"("dni");

CREATE UNIQUE INDEX "tenants_personId_key" ON "tenants"("personId");

ALTER TABLE "tenants" ADD CONSTRAINT "tenants_personId_fkey" FOREIGN KEY ("personId") REFERENCES "people"("id") ON DELETE CASCADE ON UPDATE CASCADE;
