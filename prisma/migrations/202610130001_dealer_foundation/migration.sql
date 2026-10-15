BEGIN;

ALTER TABLE "District" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "DealerTier" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
CREATE INDEX "Dealer_districtId_idx" ON "Dealer"("districtId");
CREATE INDEX "Dealer_tierId_idx" ON "Dealer"("tierId");
CREATE INDEX "Dealer_status_createdAt_idx" ON "Dealer"("status", "createdAt");
CREATE INDEX "Dealer_name_idx" ON "Dealer"("name");

-- All retained dealers count, including inactive/suspended records.
-- A row lock serializes admissions/moves to the same district, including direct SQL writes.
CREATE FUNCTION enforce_dealer_qd1() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  district_active boolean;
  tier_active boolean;
  config jsonb;
  capacity integer := 4;
  used_slots bigint;
BEGIN
  SELECT "isActive" INTO district_active FROM "District"
    WHERE "id" = NEW."districtId" FOR NO KEY UPDATE;
  SELECT "isActive" INTO tier_active FROM "DealerTier"
    WHERE "id" = NEW."tierId" FOR SHARE;
  IF district_active IS DISTINCT FROM true OR tier_active IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'QD1_REFERENCE_INACTIVE' USING ERRCODE = '23514';
  END IF;

  IF TG_OP = 'INSERT' OR NEW."districtId" IS DISTINCT FROM OLD."districtId" THEN
    SELECT "value"::jsonb INTO config FROM "BusinessRule" WHERE "code" = 'QD1' FOR SHARE;
    IF FOUND THEN
      IF jsonb_typeof(config->'maxDealersPerDistrict') IS DISTINCT FROM 'number'
        OR (config->>'maxDealersPerDistrict') !~ '^[1-9][0-9]*$' THEN
        RAISE EXCEPTION 'INVALID_QD1_CONFIG';
      END IF;
      capacity := (config->>'maxDealersPerDistrict')::integer;
    END IF;
    SELECT COUNT(*) INTO used_slots FROM "Dealer"
      WHERE "districtId" = NEW."districtId" AND "id" <> NEW."id";
    IF used_slots >= capacity THEN
      RAISE EXCEPTION 'QD1_CAPACITY' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "Dealer_qd1_guard" BEFORE INSERT OR UPDATE OF "districtId", "tierId" ON "Dealer"
  FOR EACH ROW EXECUTE FUNCTION enforce_dealer_qd1();

COMMIT;
