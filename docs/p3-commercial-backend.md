# P3: Commercial Backend — mốc 1 (BM1, BM4, QĐ1)

Branch P3 được xây dựng từ `feature/bm5-payment-bm6-reports` của P5, dùng chung Express 4, Prisma 5, SQLite, JWT, BusinessRule và AuditLog. Backend dùng TypeScript strict. Không đổi database hoặc tạo schema thương mại thứ hai.

## Phạm vi đã triển khai

- Tiếp nhận, sửa và tra cứu đại lý; phân trang, tìm kiếm, lọc và sắp xếp.
- Danh sách quận và loại đại lý đang hoạt động cho form BM1.
- Migration baseline schema P5, migration bổ sung trạng thái danh mục, index và trigger QĐ1.
- Phân quyền: Admin/Sales được ghi; Admin/Sales/Accountant/Warehouse được tra cứu; Dealer chỉ xem hồ sơ của chính mình.
- AuditLog cùng transaction với tạo/sửa đại lý; API không cho ghi `currentDebt`.
- Giữ nguyên route công nợ của P5, gồm `/dealers/overview` và `/dealers/:id/debt`.
- OpenAPI riêng cho mốc này: [openapi-commercial.json](openapi-commercial.json).

## Chạy local

```sh
npm ci
# Sao chép .env.example thành .env; DATABASE_URL="file:./dev.db"
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

Seed của P5 là dữ liệu demo: nó reset các giao dịch tài chính và công nợ mẫu. Chỉ chạy trên database local/demo. `npm test` tự tạo database mới trong thư mục tạm, migrate và seed riêng; không dùng/reset database trong `.env`. Mỗi lần test lưu một database tạm để tiện kiểm tra lỗi.

Database SQLite đã tạo bằng `db:push` ở branch P5 cần baseline **một lần**, sau khi backup và xác nhận schema khớp schema P5 ban đầu:

```sh
npx prisma migrate resolve --applied 0_init
npm run db:migrate
```

Database mới chỉ cần `npm run db:migrate`. Không dùng `db:push` để thay cho migration: Prisma schema không biểu diễn các trigger QĐ1. Khi thêm migration dựng lại bảng Dealer, phải giữ/tạo lại trigger.

## API và contract

Base path: `/api/v1`. Tất cả route dưới đây yêu cầu JWT qua `Authorization: Bearer <token>`. Header tự khai `x-user-role`/`x-user-id` không được dùng để xác thực.

| Method | Route | Chức năng |
|---|---|---|
| GET | `/districts` | Quận hoạt động, sắp theo code |
| GET | `/dealer-tiers` | Loại đại lý hoạt động, sắp theo name |
| POST | `/dealers` | Tiếp nhận đại lý BM1 |
| PATCH | `/dealers/{id}` | Sửa hồ sơ; không sửa tiền nợ |
| GET | `/dealers` | Tra cứu BM4 |
| GET | `/dealers/{id}` | Chi tiết hồ sơ |

Body mẫu khi tạo:

```json
{
  "code": "DL-004",
  "name": "Đại lý mới",
  "phone": "0901234567",
  "address": "123 Nguyễn Trãi",
  "email": "daily@example.com",
  "districtId": "<id từ GET /districts>",
  "tierId": "<id từ GET /dealer-tiers>",
  "receivedDate": "2026-10-13T00:00:00+07:00"
}
```

Ngày nhận yêu cầu ISO 8601 có timezone; response trả UTC. `status` mặc định `ACTIVE`, hỗ trợ `INACTIVE`, `SUSPENDED`. Code duy nhất, 1–50 ký tự chữ/số/`_`/`-`. PATCH chấp nhận các field của POST nhưng phải có ít nhất một field. Field ngoài contract bị từ chối.

GET danh sách nhận `page` (mặc định 1), `limit` (20, tối đa 100), `search` (name/code/phone/email), `districtId`, `tierId`, `status`, `sortBy` (name/code/receivedDate/createdAt/currentDebt), `sortOrder` (asc/desc). Mặc định sắp createdAt giảm dần, dùng id để ổn định thứ tự khi bằng nhau. Search dùng phép contains của SQLite, không chuẩn hóa dấu tiếng Việt.

Response thành công: `{ success: true, data: ... }`; danh sách thêm `pagination: { total, page, limit, totalPages }`. Hồ sơ kèm `district`, `tier`, `currentDebt` nguyên đồng do P5 quản lý. Không tạo tài khoản đăng nhập cho đại lý trong endpoint BM1.

| HTTP | Code | Ý nghĩa |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Input, ngày hoặc query không hợp lệ |
| 401 | `UNAUTHORIZED` | Thiếu hoặc sai JWT |
| 403 | `FORBIDDEN` | Thiếu quyền hoặc đại lý truy cập hồ sơ khác |
| 404 | `NOT_FOUND` | Không có đại lý/quận/loại |
| 409 | `DEALER_CODE_EXISTS` | Trùng mã đại lý |
| 409 | `WRITE_CONFLICT` | Giao dịch bị tranh chấp; có thể gửi lại |
| 422 | `RULE_VIOLATION_QD1` | Quận đầy hoặc danh mục ngưng hoạt động |
| 500 | `INVALID_QD1_CONFIG` | Cấu hình giới hạn không phải số nguyên dương |

## Cách áp dụng QĐ1

Giới hạn toàn cục là `BusinessRule.QD1.maxDealersPerDistrict`, mặc định 4 nếu chưa có rule. Trường `District.maxDealers` cũ được giữ để tương thích P5; không dùng làm giới hạn thứ hai.

Tất cả hồ sơ trong quận đều được tính, kể cả INACTIVE/SUSPENDED. Ngưng hoạt động không tự giải phóng suất. Chuyển quận chỉ được thực hiện khi quận đích còn suất. Nếu Admin giảm giới hạn xuống dưới số hiện có, giữ hồ sơ cũ và cho sửa liên hệ; chặn tiếp nhận/chuyển thêm vào quận đó. Loại/quận ngưng hoạt động không được chọn khi tạo hoặc đổi liên kết, nhưng hồ sơ lịch sử vẫn xem/sửa thông tin liên hệ được.

API đọc cấu hình trong cùng transaction, không dùng cache 60 giây của service quy định. Trigger đọc trực tiếp rule và chặn insert/chuyển quận vượt giới hạn, kể cả ghi ngoài API. SQLite tuần tự hóa ghi; kiểm thử cạnh tranh dùng hai Prisma connection độc lập vào suất cuối cùng.

## Verify và phần tiếp theo

```sh
npm run lint
npm run build
npm test
```

Test P3 kiểm tra QĐ1, duplicate code, chuyển quận, thay đổi giới hạn, danh mục ngưng hoạt động, phân quyền và scope Dealer, ràng buộc cạnh tranh, cùng khả năng truy cập route P5. Test P5 được chạy chung trên database tạm đã seed.

Mốc tiếp theo: CRUD Category/Product/UnitOfMeasure/SKU và QĐ2; Pricing và tính giá xuất QĐ3; sau đó Promotion. Quản trị quận/loại, UI, kho, đơn hàng và tài chính chưa nằm trong mốc này. SQLite là provider thực tế của schema hiện tại; muốn chạy PostgreSQL cần migration/provider riêng, không chỉ đổi DATABASE_URL.

Tham khảo cơ chế [SQLite trigger](https://www.sqlite.org/lang_createtrigger.html) và [Prisma baseline](https://www.prisma.io/docs/orm/prisma-migrate/workflows/baselining).
