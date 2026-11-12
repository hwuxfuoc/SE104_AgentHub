BEGIN;

CREATE TABLE "Warehouse" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "address" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Warehouse_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Warehouse_code_key" ON "Warehouse"("code");

CREATE TABLE "Inventory" (
  "id" TEXT NOT NULL,
  "warehouseId" TEXT NOT NULL,
  "skuId" TEXT NOT NULL,
  "onHand" INTEGER NOT NULL DEFAULT 0,
  "reserved" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Inventory_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Inventory_nonnegative_check" CHECK ("onHand" >= 0 AND "reserved" >= 0 AND "reserved" <= "onHand")
);
CREATE UNIQUE INDEX "Inventory_warehouseId_skuId_key" ON "Inventory"("warehouseId", "skuId");
CREATE INDEX "Inventory_skuId_idx" ON "Inventory"("skuId");

CREATE TABLE "InventoryMovement" (
  "id" TEXT NOT NULL,
  "warehouseId" TEXT NOT NULL,
  "skuId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "referenceType" TEXT NOT NULL,
  "referenceId" TEXT NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InventoryMovement_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "InventoryMovement_quantity_check" CHECK ("quantity" <> 0)
);
CREATE INDEX "InventoryMovement_warehouseId_skuId_createdAt_idx" ON "InventoryMovement"("warehouseId", "skuId", "createdAt");
CREATE INDEX "InventoryMovement_referenceType_referenceId_idx" ON "InventoryMovement"("referenceType", "referenceId");

CREATE TABLE "PurchaseReceipt" (
  "id" TEXT NOT NULL,
  "receiptNumber" TEXT NOT NULL,
  "warehouseId" TEXT NOT NULL,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "notes" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PurchaseReceipt_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PurchaseReceipt_receiptNumber_key" ON "PurchaseReceipt"("receiptNumber");

CREATE TABLE "PurchaseReceiptLine" (
  "id" TEXT NOT NULL,
  "purchaseReceiptId" TEXT NOT NULL,
  "skuId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "unitCost" INTEGER NOT NULL,
  "amount" INTEGER NOT NULL,
  CONSTRAINT "PurchaseReceiptLine_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PurchaseReceiptLine_values_check" CHECK ("quantity" > 0 AND "unitCost" > 0 AND "amount" > 0)
);
CREATE INDEX "PurchaseReceiptLine_skuId_idx" ON "PurchaseReceiptLine"("skuId");

CREATE TABLE "StockReservation" (
  "id" TEXT NOT NULL,
  "salesOrderId" TEXT NOT NULL,
  "orderItemId" TEXT NOT NULL,
  "warehouseId" TEXT NOT NULL,
  "skuId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StockReservation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "StockReservation_quantity_check" CHECK ("quantity" > 0)
);
CREATE INDEX "StockReservation_salesOrderId_status_idx" ON "StockReservation"("salesOrderId", "status");
CREATE INDEX "StockReservation_warehouseId_skuId_status_idx" ON "StockReservation"("warehouseId", "skuId", "status");

CREATE TABLE "Return" (
  "id" TEXT NOT NULL,
  "returnNumber" TEXT NOT NULL,
  "salesOrderId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'REQUESTED',
  "reason" TEXT NOT NULL,
  "receivedAt" TIMESTAMP(3),
  "debtCreditAmount" INTEGER NOT NULL DEFAULT 0,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Return_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Return_debtCreditAmount_check" CHECK ("debtCreditAmount" >= 0)
);
CREATE UNIQUE INDEX "Return_returnNumber_key" ON "Return"("returnNumber");
CREATE INDEX "Return_salesOrderId_status_idx" ON "Return"("salesOrderId", "status");

CREATE TABLE "SalesReturnItem" (
  "id" TEXT NOT NULL,
  "returnId" TEXT NOT NULL,
  "orderItemId" TEXT NOT NULL,
  "skuId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "unitPrice" INTEGER NOT NULL,
  "amount" INTEGER NOT NULL,
  CONSTRAINT "SalesReturnItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SalesReturnItem_values_check" CHECK ("quantity" > 0 AND "unitPrice" > 0 AND "amount" > 0)
);
CREATE INDEX "SalesReturnItem_orderItemId_idx" ON "SalesReturnItem"("orderItemId");

ALTER TABLE "SalesOrder" ADD COLUMN "createdById" TEXT;
ALTER TABLE "SalesOrder" ADD COLUMN "warehouseId" TEXT;
ALTER TABLE "Shipment" ALTER COLUMN "shippedDate" DROP NOT NULL;
ALTER TABLE "Shipment" ALTER COLUMN "shippedDate" DROP DEFAULT;
ALTER TABLE "Shipment" ADD COLUMN "deliveredAt" TIMESTAMP(3);
ALTER TABLE "Shipment" ALTER COLUMN "status" SET DEFAULT 'PREPARING';

CREATE INDEX "SalesOrder_dealerId_status_createdAt_idx" ON "SalesOrder"("dealerId", "status", "createdAt");
CREATE UNIQUE INDEX "Invoice_salesOrderId_key" ON "Invoice"("salesOrderId");

ALTER TABLE "Inventory" ADD CONSTRAINT "Inventory_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Inventory" ADD CONSTRAINT "Inventory_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "Sku"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "Sku"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PurchaseReceipt" ADD CONSTRAINT "PurchaseReceipt_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PurchaseReceipt" ADD CONSTRAINT "PurchaseReceipt_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PurchaseReceiptLine" ADD CONSTRAINT "PurchaseReceiptLine_purchaseReceiptId_fkey" FOREIGN KEY ("purchaseReceiptId") REFERENCES "PurchaseReceipt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PurchaseReceiptLine" ADD CONSTRAINT "PurchaseReceiptLine_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "Sku"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockReservation" ADD CONSTRAINT "StockReservation_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "SalesOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockReservation" ADD CONSTRAINT "StockReservation_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockReservation" ADD CONSTRAINT "StockReservation_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockReservation" ADD CONSTRAINT "StockReservation_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "Sku"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Return" ADD CONSTRAINT "Return_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "SalesOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SalesReturnItem" ADD CONSTRAINT "SalesReturnItem_returnId_fkey" FOREIGN KEY ("returnId") REFERENCES "Return"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SalesReturnItem" ADD CONSTRAINT "SalesReturnItem_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SalesReturnItem" ADD CONSTRAINT "SalesReturnItem_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "Sku"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT;
