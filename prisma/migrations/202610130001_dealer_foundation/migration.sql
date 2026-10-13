ALTER TABLE "District" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "DealerTier" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
CREATE INDEX "Dealer_districtId_idx" ON "Dealer"("districtId");
CREATE INDEX "Dealer_tierId_idx" ON "Dealer"("tierId");
CREATE INDEX "Dealer_status_createdAt_idx" ON "Dealer"("status", "createdAt");
CREATE INDEX "Dealer_name_idx" ON "Dealer"("name");

-- All retained dealer records count toward QD1, including suspended/inactive dealers.
-- Read QD1 inside the write statement; do not rely on a process-local cached count.
CREATE TRIGGER "Dealer_capacity_insert" AFTER INSERT ON "Dealer"
WHEN (SELECT COUNT(*) FROM "Dealer" WHERE "districtId" = NEW."districtId") >
  COALESCE((SELECT json_extract("value", '$.maxDealersPerDistrict') FROM "BusinessRule" WHERE "code" = 'QD1'), 4)
BEGIN
  SELECT RAISE(ABORT, 'QD1_CAPACITY');
END;

CREATE TRIGGER "Dealer_capacity_move" AFTER UPDATE OF "districtId" ON "Dealer"
WHEN NEW."districtId" != OLD."districtId" AND
  (SELECT COUNT(*) FROM "Dealer" WHERE "districtId" = NEW."districtId") >
  COALESCE((SELECT json_extract("value", '$.maxDealersPerDistrict') FROM "BusinessRule" WHERE "code" = 'QD1'), 4)
BEGIN
  SELECT RAISE(ABORT, 'QD1_CAPACITY');
END;

CREATE TRIGGER "Dealer_reference_insert" AFTER INSERT ON "Dealer"
WHEN NOT EXISTS (SELECT 1 FROM "District" WHERE "id" = NEW."districtId" AND "isActive" = true)
  OR NOT EXISTS (SELECT 1 FROM "DealerTier" WHERE "id" = NEW."tierId" AND "isActive" = true)
BEGIN
  SELECT RAISE(ABORT, 'QD1_REFERENCE_INACTIVE');
END;

CREATE TRIGGER "Dealer_reference_update" AFTER UPDATE OF "districtId", "tierId" ON "Dealer"
WHEN NOT EXISTS (SELECT 1 FROM "District" WHERE "id" = NEW."districtId" AND "isActive" = true)
  OR NOT EXISTS (SELECT 1 FROM "DealerTier" WHERE "id" = NEW."tierId" AND "isActive" = true)
BEGIN
  SELECT RAISE(ABORT, 'QD1_REFERENCE_INACTIVE');
END;
