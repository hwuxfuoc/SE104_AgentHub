# P4: Đơn hàng, kho và giao nhận

P4 bổ sung workflow trên backend dùng chung Express/Prisma/PostgreSQL. Migration `202611120001_fulfillment` thêm kho, tồn kho, phiếu nhập, movement, reservation và phiếu trả; các bảng đơn hàng hiện có được mở rộng tương thích dữ liệu cũ.

## Luồng nghiệp vụ

1. Tạo phiếu nhập làm tăng `Inventory.onHand` và ghi `InventoryMovement`.
2. Tạo đơn ở trạng thái `PENDING_APPROVAL`. Server lấy giá bán hiệu lực từ `Pricing`, chụp giá vào `OrderItem` và tự tính tổng.
3. Duyệt đơn khóa hồ sơ đại lý và từng dòng tồn kho; kiểm tra hạn mức QĐ3 bao gồm các đơn đã duyệt chưa lập hóa đơn; giữ hàng bằng `Inventory.reserved` và tạo `StockReservation`.
4. Xuất kho chuyển reservation sang `FULFILLED`, giảm đồng thời `onHand` và `reserved`, ghi movement; trạng thái đơn thành `SHIPPED`.
5. Xác nhận giao tạo hóa đơn P5 rồi mới kết thúc đơn. Trong thời gian hóa đơn chưa ghi nhận xong, đơn vẫn ở `SHIPPED` và tiếp tục được tính vào cam kết hạn mức. Gọi lại endpoint giao là an toàn để thử lại tích hợp hóa đơn nếu bước tài chính trước đó gặp lỗi.
6. Trả hàng phải tham chiếu dòng thuộc đơn đã xuất. Khi kho xác nhận nhận hàng, hệ thống cộng tồn, cấn trừ hóa đơn chưa thanh toán của đơn và ghi `DebtLedger` trong cùng transaction. Trường `debtCreditAmount` là khoản cấn trừ công nợ, không biểu thị hoàn tiền mặt.

Hủy đơn trước khi xuất sẽ giải phóng reservation. Sau khi xuất kho, không thể hủy đơn; cần đi qua workflow trả hàng. Tồn khả dụng là `onHand - reserved`. Tiền lưu theo số nguyên VND.

## API

Mọi API yêu cầu JWT. Admin có quyền mọi thao tác; các quyền khác được áp theo nhóm nghiệp vụ:

| Method | Route | Vai trò chính | Mục đích |
|---|---|---|---|
| GET/POST | `/api/v1/warehouses` | Đọc: nhân sự; tạo: ADMIN | Danh sách/tạo kho |
| GET | `/api/v1/products` | SALES, WAREHOUSE, ACCOUNTANT, ADMIN | SKU, giá hiệu lực và tồn khả dụng |
| GET | `/api/v1/inventory` | Nhân sự nội bộ | Tồn và số lượng đã giữ |
| GET | `/api/v1/inventory/movements` | Nhân sự nội bộ | Lịch sử nhập/xuất/trả |
| GET/POST | `/api/v1/purchase-receipts` | Đọc: ADMIN/WAREHOUSE/ACCOUNTANT; nhập: ADMIN/WAREHOUSE | Tra cứu/lập phiếu nhập |
| GET/POST | `/api/v1/sales-orders` | Đọc: nhân sự/DEALER; tạo: ADMIN/SALES/DEALER | Đơn hàng và dòng hàng |
| POST | `/api/v1/sales-orders/:id/approve` | ADMIN, SALES | Kiểm tra QĐ3, giữ kho |
| POST | `/api/v1/sales-orders/:id/cancel` | ADMIN, SALES | Hủy và nhả hàng đã giữ |
| POST | `/api/v1/shipments/:id/dispatch` | ADMIN, WAREHOUSE | Xuất kho |
| GET | `/api/v1/shipments/:id` | Nhân sự nội bộ | Chi tiết phiếu giao |
| POST | `/api/v1/shipments/:id/deliver` | ADMIN, WAREHOUSE | Xác nhận giao, tích hợp hóa đơn |
| GET/POST | `/api/v1/returns` | Đọc: nhân sự hoặc DEALER xem dữ liệu của mình; tạo: ADMIN/SALES/DEALER | Tra cứu/tạo yêu cầu trả |
| POST | `/api/v1/returns/:id/approve` | ADMIN, SALES | Duyệt yêu cầu trả |
| POST | `/api/v1/returns/:id/reject` | ADMIN, SALES | Từ chối yêu cầu trả |
| POST | `/api/v1/returns/:id/receive` | ADMIN, WAREHOUSE | Nhận hàng, cộng tồn, cấn trừ nợ |

`POST /api/v1/sales-vouchers` và `GET /api/v1/sales-vouchers` vẫn là alias tương thích tên màn hình P2; payload chuẩn dùng `warehouseId`, `dealerId`, `items: [{ skuId, quantity }]`. Thiếu tồn trả `INSUFFICIENT_STOCK`; vượt số lượng được trả trả `RETURN_QUANTITY_EXCEEDED`; hạn mức công nợ duyệt đơn trả `RULE_VIOLATION_QD3`.

## Cấu hình môi trường

1. Cài Node.js 22 và PostgreSQL 18; từ thư mục gốc repo, cài package và tạo Prisma Client:

   ```powershell
   npm ci
   npm run db:generate
   ```

2. Tạo database dành riêng cho test, ví dụ `se104_agenthub_test`, và một PostgreSQL user có quyền kết nối, tạo schema và tạo bảng. Không dùng database production.
3. Cấu hình connection string cho test. PowerShell:

   ```powershell
   $env:TEST_DATABASE_URL = "postgresql://<user>:<password>@localhost:5432/se104_agenthub_test?schema=public"
   ```

   Linux/macOS:

   ```sh
   export TEST_DATABASE_URL="postgresql://<user>:<password>@localhost:5432/se104_agenthub_test?schema=public"
   ```

   Thay `<user>` và `<password>` bằng thông tin PostgreSQL thực tế. Để tránh lỗi phân tích URL, mã hóa ký tự đặc biệt trong password theo URL encoding.

Test lấy `TEST_DATABASE_URL` trước, nếu không có thì mới dùng `DATABASE_URL`. Trước khi chạy, test tạo một schema ngẫu nhiên riêng bên trong database đã cấu hình, áp dụng toàn bộ migration, nạp seed và chỉ xóa schema thử nghiệm đó sau khi hoàn tất. Vì vậy tài khoản DB cần quyền `CREATE` schema; `public` hoặc schema dữ liệu khác không bị seed hay xóa. Seed có dữ liệu demo tài chính, nên vẫn phải chạy test trên database test riêng.

## Chạy kiểm thử P4

Chạy toàn bộ backend tests (bao gồm P4):

```powershell
npm test
```

Chỉ chạy test P4:

```powershell
npm test -- tests/integration/fulfillment-api.test.ts
```

Có thể chạy kiểm tra schema, type và build trước test:

```powershell
npx prisma validate
npm run lint
npm run build
```

Test P4 đăng nhập bằng admin demo do seed tạo (`admin@agenthub.vn` / `password123`) và kiểm tra:

- Nhập kho tạo phiếu nhập, tăng tồn và lưu dòng hàng.
- Tạo đơn tính giá từ `Pricing`, duyệt đơn và giữ tồn.
- Thiếu tồn bị từ chối, transaction rollback không để lại reservation.
- Xuất kho giảm tồn/giải phóng giữ hàng; xác nhận giao tích hợp một hóa đơn, retry không tạo hóa đơn trùng.
- Tạo, duyệt và nhận trả hàng; tồn kho và công nợ được cập nhật, nhận lặp bị từ chối.
- Duyệt đồng thời một đơn chỉ thành công một lần.

Nếu test báo lỗi kết nối/xác thực PostgreSQL, kiểm tra service đang chạy, database đã tồn tại và user/password trong `TEST_DATABASE_URL` đúng, sau đó chạy lại. Nếu báo thiếu quyền tạo schema, cấp quyền `CREATE` trên database test cho user đó. Các lệnh `npm run db:migrate` và `npm run db:seed` dùng cho môi trường phát triển riêng, không cần chạy trước test (test tự migrate/seed trong schema cô lập).

## Chạy API P4 local

Để chạy backend thật thay vì test tích hợp, cấu hình `DATABASE_URL` trong `.env` trỏ tới database local riêng, sau đó:

```powershell
docker compose up -d postgres
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

Seed tạo kho mặc định `KHO-CHINH`. `npm run db:seed` có thể reset dữ liệu giao dịch demo và công nợ; chỉ chạy trên database local/demo. Nhập kho nhận `unitCost` tùy chọn; nếu bỏ qua, dùng giá nhập đang hiệu lực của SKU.

API P4 đã có; các trang P2 hiện vẫn gọi mock và cần được nối contract P4 riêng trước khi bỏ nhãn MOCK.
