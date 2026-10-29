# P2: Internal/Admin Frontend

Branch P2 xây dựng giao diện vận hành nội bộ cho hệ thống quản lý đại lý, phục vụ các vai trò Admin, Sales, Warehouse và Accountant. Frontend dùng React 18, TypeScript strict và Tailwind CSS v4 theo stack nhóm đã chốt.

## Phạm vi đã triển khai

- Layout và navigation theo vai trò: sidebar responsive, dark/light theme, phân quyền giao diện.
- Màn hình quản lý đại lý BM1 và tra cứu BM4: danh sách, bộ lọc, phân trang, tiếp nhận và chỉnh sửa hồ sơ.
- Màn hình hàng hóa và tồn kho: danh sách sản phẩm, SKU và tồn kho theo kho.
- Màn hình phiếu nhập hàng BM2 và phiếu xuất hàng BM3 với trình soạn dòng hàng.
- Màn hình thu tiền BM5 và hóa đơn: lập phiếu thu, kiểm tra công nợ thời gian thực, danh sách hóa đơn.
- Màn hình báo cáo BM6.1 (doanh số) và BM6.2 (công nợ) theo tháng với tùy chọn xuất CSV.
- Màn hình quy định QĐ7: xem và chỉnh sửa cấu hình nghiệp vụ (chỉ Admin).
- Màn hình nhật ký thao tác (Audit Log).
- Trang đăng nhập, bảo vệ route theo vai trò và tự động làm mới token.
- Mock server chạy trong trình duyệt: mô phỏng toàn bộ API để phát triển offline.

## Cấu trúc mã nguồn

```
apps/admin-web/
├── index.html                        # Khai báo font Inter, JetBrains Mono
├── vite.config.ts
├── src/
│   ├── main.tsx                      # Khởi động app, QueryClient, BrowserRouter
│   ├── App.tsx                       # Route map toàn bộ màn hình
│   ├── auth/
│   │   ├── AuthContext.tsx           # JWT, tự động làm mới token
│   │   ├── guards.tsx                # ProtectedRoute, RequireFeature
│   │   └── permissions.ts           # Ma trận quyền theo vai trò
│   ├── components/
│   │   ├── layout/AppShell.tsx       # Sidebar, header, theme toggle
│   │   └── ui/                       # Button, Card, DataTable, Fields, Toast, Overlay…
│   ├── features/
│   │   ├── auth/LoginPage.tsx
│   │   ├── dashboard/DashboardPage.tsx
│   │   ├── dealers/                  # DealersPage, DealerDetailPage, DealerFormDrawer
│   │   ├── inventory/ProductsPage.tsx
│   │   ├── vouchers/                 # PurchaseReceiptsPage, SalesVouchersPage, VoucherDetail
│   │   ├── payments/                 # PaymentsPage, InvoicesPage, PaymentFormDrawer
│   │   ├── reports/ReportsPage.tsx
│   │   └── rules/                   # RulesPage, AuditLogPage
│   ├── lib/
│   │   ├── api/                     # client.ts, types.ts, errors.ts
│   │   └── format.ts                # formatVnd, formatDate, formatNumber
│   └── mocks/mock-server.ts         # Backend giả lập (VITE_API_MODE=mock)
```

## Chạy local

```sh
cd apps/admin-web
npm ci

# Chế độ mock — không cần backend (mặc định):
npm run dev

# Chế độ thật — cần backend P5/P3 chạy trên cổng 4000:
npm run dev:real
```

Mặc định là mock. Logic trong `src/lib/api/client.ts`: chỉ chuyển sang backend thật khi `VITE_API_MODE=real`; nếu biến không được đặt, ứng dụng chạy mock. Script `dev:real` đặt biến này cross-platform qua `cross-env`.

```sh
# Kiểm tra kiểu:
npm run lint

# Chạy test:
npm test
```

## Màn hình và trạng thái tích hợp

| Màn hình | Route | Tính năng BM/QĐ | Backend |
|---|---|---|---|
| Đăng nhập | `/login` | — | P5 `POST /auth/login` |
| Tổng quan | `/` | — | P5 reports, P5 payments, P3 dealers |
| Đại lý | `/dealers` | BM1, BM4 | P3 dealers, districts, tiers |
| Chi tiết đại lý | `/dealers/:id` | BM1, BM4 | P3 + P5 debt |
| Hàng hóa & tồn kho | `/products` | BM2, QĐ2 | **MOCK** — chờ P4 |
| Phiếu nhập hàng | `/purchase-receipts` | BM2 | **MOCK** — chờ P4 |
| Phiếu xuất hàng | `/sales-vouchers` | BM3, QĐ3 | **MOCK** — chờ P4 |
| Thu tiền & công nợ | `/payments` | BM5, QĐ5 | P5 payments, debt |
| Hóa đơn | `/invoices` | BM3 | P5 invoices |
| Báo cáo tháng | `/reports` | BM6.1, BM6.2 | P5 reports |
| Quy định | `/rules` | QĐ7 | P5 business-rules |
| Nhật ký thao tác | `/audit-logs` | — | P5 audit-logs |

Mục gắn **MOCK** hiển thị nhãn vàng trong sidebar và thông báo `MockNotice` trên trang. Khi P4 bàn giao API, chỉ cần xóa mock handler và cập nhật `api.ts` tương ứng trong feature.

## Ma trận quyền giao diện

Backend vẫn là nơi kiểm tra quyền thật sự; ma trận dưới đây chỉ ẩn/hiện tính năng trên giao diện.

| Tính năng | ADMIN | SALES | WAREHOUSE | ACCOUNTANT |
|---|:---:|:---:|:---:|:---:|
| Xem đại lý | ✓ | ✓ | ✓ | ✓ |
| Ghi đại lý (BM1) | ✓ | ✓ | — | — |
| Hàng hóa & kho | ✓ | ✓ | ✓ | — |
| Phiếu nhập (BM2) | ✓ | — | ✓ | ✓ |
| Phiếu xuất (BM3) | ✓ | ✓ | — | ✓ |
| Thu tiền (BM5) | ✓ | ✓ | — | ✓ |
| Lập phiếu thu | ✓ | — | — | ✓ |
| Hóa đơn | ✓ | ✓ | — | ✓ |
| Báo cáo (BM6) | ✓ | ✓ | — | ✓ |
| Quy định (QĐ7) xem | ✓ | ✓ | ✓ | ✓ |
| Quy định (QĐ7) sửa | ✓ | — | — | — |
| Nhật ký | ✓ | — | — | ✓ |

## Phối hợp với backend

### Với P5 (Finance Backend)

P2 phụ thuộc trực tiếp vào các API P5 cho phần tài chính:

- **BM5 — Form thu tiền**: Khi chọn đại lý, gọi `GET /api/v1/dealers/:id/debt` để hiển thị số nợ hiện tại và đặt giới hạn tối đa cho ô nhập tiền. Khi backend trả `RULE_VIOLATION_QD5`, hiển thị lỗi thân thiện ngay trên form.
- **BM6 — Báo cáo**: Gọi `GET /api/v1/reports/sales?month=M&year=Y` và `/reports/debt?month=M&year=Y`. Nút "Tải CSV" truyền thêm `&format=csv`.
- **QĐ7 — Quy định**: Chỉ hiện nút sửa với tài khoản `ADMIN`. Khi `PATCH` thành công, làm mới danh sách để hiển thị giá trị mới.
- **Audit Log**: `GET /api/v1/audit-logs` với bộ lọc action, userId và khoảng thời gian.

### Với P3 (Commercial Backend)

- **BM1 — Tiếp nhận đại lý**: Form dùng `GET /districts` và `GET /dealer-tiers` để điền dropdown. Lỗi `RULE_VIOLATION_QD1` hiển thị thông báo vượt hạn mức quận.
- **BM4 — Tra cứu**: `GET /dealers` với `search`, `districtId`, `tierId`, `status`, `sortBy`, `sortOrder`, `page`, `limit`.

### Với P4 (Order & Fulfillment — chờ bàn giao)

Ba màn hình dưới đây đang dùng mock, sẽ tích hợp API P4 khi sẵn sàng:

- `GET/POST /purchase-receipts` — phiếu nhập hàng BM2
- `GET/POST /sales-vouchers`, `POST /sales-vouchers/:id/approve` — phiếu xuất BM3
- `GET /inventory` — tồn kho theo kho

📌 **Ghi chú nhắc P4**: Khi phiếu xuất bị từ chối do vượt hạn mức nợ, trả mã `RULE_VIOLATION_QD3` để P2 hiển thị đúng thông báo nghiệp vụ.

## Tài khoản mẫu (seed P5)

| Vai trò | Email | Mật khẩu |
|---|---|---|
| Admin | `admin@agenthub.vn` | `password123` |
| Kế toán | `accountant@agenthub.vn` | `password123` |
| Kinh doanh | `sales@agenthub.vn` | `password123` |
| Thủ kho | `warehouse@agenthub.vn` | `password123` |

## Phần tiếp theo

- Tích hợp API P4 cho phiếu nhập, phiếu xuất và tồn kho khi P4 bàn giao.
- Viết test component cho form BM1, BM5 và các trạng thái lỗi nghiệp vụ.
- Kiểm tra responsive trên màn hình tablet (768–1024px) cho DataTable và form drawer.
- Đảm bảo CI chạy được `npm run lint` và `npm test` trước khi build frontend.
