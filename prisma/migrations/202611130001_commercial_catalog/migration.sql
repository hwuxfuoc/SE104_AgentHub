BEGIN;

CREATE TABLE "UnitOfMeasure" (
    "id" TEXT PRIMARY KEY,
    "code" TEXT NOT NULL UNIQUE,
    "name" TEXT NOT NULL UNIQUE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
);

-- Preserve existing SKU units and give them stable catalog identifiers.
INSERT INTO "UnitOfMeasure" ("id", "code", "name", "updatedAt")
SELECT 'unit_' || md5("unit"), 'LEGACY-' || md5("unit"), "unit", CURRENT_TIMESTAMP
FROM (SELECT DISTINCT "unit" FROM "Sku") AS existing;

ALTER TABLE "Sku" ADD CONSTRAINT "Sku_unit_fkey" FOREIGN KEY ("unit")
    REFERENCES "UnitOfMeasure"("name") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");
CREATE INDEX "Sku_productId_idx" ON "Sku"("productId");
CREATE INDEX "Sku_unit_idx" ON "Sku"("unit");
CREATE INDEX "Pricing_skuId_effectiveFrom_idx" ON "Pricing"("skuId", "effectiveFrom");

CREATE TABLE "Promotion" (
    "id" TEXT PRIMARY KEY,
    "code" TEXT NOT NULL UNIQUE,
    "name" TEXT NOT NULL,
    "skuId" TEXT NOT NULL REFERENCES "Sku"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    "minimumQuantity" INTEGER NOT NULL CHECK ("minimumQuantity" > 0),
    "discountPercent" INTEGER NOT NULL CHECK ("discountPercent" BETWEEN 1 AND 100),
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Promotion_effective_window" CHECK ("effectiveTo" > "effectiveFrom")
);
CREATE INDEX "Promotion_skuId_effectiveFrom_idx" ON "Promotion"("skuId", "effectiveFrom");

-- Serialize capacity checks across sessions, including Repeatable Read.
CREATE TABLE "CommercialCatalogGuard" ("id" INTEGER PRIMARY KEY);
INSERT INTO "CommercialCatalogGuard" ("id") VALUES (1);

-- Row insertion checks also cover writes outside the commercial API.
-- AFTER INSERT allows seed upserts at capacity when they update an existing row.
CREATE FUNCTION commercial_check_qd2_insert() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
    config jsonb;
    configured_limit numeric;
    limit_key text;
    catalog_count bigint;
BEGIN
    UPDATE "CommercialCatalogGuard" SET "id" = 1 WHERE "id" = 1;
    SELECT "value"::jsonb INTO config FROM "BusinessRule" WHERE "code" = 'QD2' FOR SHARE;
    IF TG_TABLE_NAME = 'Product' THEN
        limit_key := 'maxProductCount';
        configured_limit := 5;
        SELECT count(*) INTO catalog_count FROM "Product";
    ELSE
        limit_key := 'maxUnitCount';
        configured_limit := 3;
        SELECT count(*) INTO catalog_count FROM "UnitOfMeasure";
    END IF;
    IF config IS NOT NULL THEN
        IF jsonb_typeof(config->limit_key) IS DISTINCT FROM 'number' THEN
            RAISE EXCEPTION 'INVALID_QD2_CONFIG' USING ERRCODE = '23514';
        END IF;
        configured_limit := (config->>limit_key)::numeric;
    END IF;
    IF configured_limit < 1 OR configured_limit <> trunc(configured_limit) THEN
        RAISE EXCEPTION 'INVALID_QD2_CONFIG' USING ERRCODE = '23514';
    END IF;
    IF catalog_count > configured_limit THEN
        RAISE EXCEPTION 'QD2_CAPACITY' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER "Product_qd2_capacity" AFTER INSERT ON "Product"
FOR EACH ROW EXECUTE FUNCTION commercial_check_qd2_insert();
CREATE TRIGGER "UnitOfMeasure_qd2_capacity" AFTER INSERT ON "UnitOfMeasure"
FOR EACH ROW EXECUTE FUNCTION commercial_check_qd2_insert();
COMMIT;
