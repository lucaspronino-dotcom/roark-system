-- CreateEnum
CREATE TYPE "ReceiptKind" AS ENUM ('OWNER_SETTLEMENT', 'TENANT_SETTLEMENT');

-- CreateTable
CREATE TABLE "receipts" (
    "id" UUID NOT NULL,
    "number" INTEGER NOT NULL,
    "kind" "ReceiptKind" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "paid" DOUBLE PRECISION NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL,
    "personName" TEXT NOT NULL,
    "contractId" UUID NOT NULL,
    "pdfBase64" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "receipts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "receipts_number_key" ON "receipts"("number");

-- CreateIndex
CREATE INDEX "receipts_personName_kind_idx" ON "receipts"("personName", "kind");

-- AddForeignKey
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
