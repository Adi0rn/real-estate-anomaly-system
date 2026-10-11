/*
  Warnings:

  - A unique constraint covering the columns `[propertyId]` on the table `PropertyAnomaly` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "PropertyAnomaly_propertyId_key" ON "PropertyAnomaly"("propertyId");
