DROP INDEX "properties_folder_address_key";
CREATE INDEX "properties_folder_address_idx" ON "properties"("folder", "address");
