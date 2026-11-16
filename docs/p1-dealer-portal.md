# P1: Dealer Portal Frontend

Branch P1 xây dựng giao diện tự phục vụ dành cho đại lý, cho phép đại lý xem thông tin hồ sơ, duyệt danh mục sản phẩm, đặt đơn hàng, kiểm tra công nợ và gửi yêu cầu trả hàng. Frontend dùng React 18, TypeScript strict và Tailwind CSS v4, cùng stack với P2 để đảm bảo đồng bộ thiết kế.

## Phạm vi đã triển khai

- Layout và navigation dành riêng cho vai trò DEALER: sidebar responsive, dark/light theme.
- Màn hình đăng nhập: form xác thực, chuyển hướng sau đăng nhập, bảo vệ route.
- Màn hình tổng quan: thẻ tóm tắt công nợ, đơn hàng đang xử lý, hóa đơn chưa thanh toán; cảnh báo vượt hạn mức nợ.
- Hồ sơ đại lý BM1: thông tin loại đại lý, quận, hạn mức nợ và thanh tiến trình dư nợ hiện tại.
- Danh mục sản phẩm: bảng SKU kèm đơn giá xuất và huy hiệu khuyến mãi đang áp dụng.
- Đặt đơn hàng: chọn SKU, nhập số lượng, tính tổng tiền và gửi đơn chờ duyệt.
- Danh sách đơn hàng: lọc theo trạng thái, xem chi tiết từng đơn và tiến trình xử lý.
- Hóa đơn: danh sách kèm bộ lọc trạng thái, số tiền còn lại.
- Công nợ BM5: tóm tắt nợ, đồng hồ hạn mức, lịch sử sổ cái.
- Yêu cầu trả hàng: danh sách và form tạo yêu cầu mới.
- Mock server chạy trong trình duyệt: mô phỏng toàn bộ API để phát triển offline.

## Cấu trúc mã nguồn

```
apps/dealer-portal/
├── index.html
├── vite.config.ts
├── src/
│   ├── main.tsx                            # Khởi động app, QueryClient, BrowserRouter
│   ├── App.tsx                             # Route map toàn bộ màn hình
│   ├── auth/
│   │   ├── AuthContext.tsx                 # JWT, chỉ chấp nhận role DEALER
│   │   └── guards.tsx                      # ProtectedRoute
│   ├── components/
│   │   ├── layout/AppShell.tsx             # Sidebar, header, theme toggle
│   │   └── ui/                             # Button, Card, DataTable, Fields, Toast, Spinner
│   ├── features/
│   │   ├── auth/LoginPage.tsx
│   │   ├── dashboard/DashboardPage.tsx
│   │   ├── profile/ProfilePage.tsx         # BM1
│   │   ├── catalog/CatalogPage.tsx
│   │   ├── orders/                         # OrdersPage, NewOrderPage, OrderDetailPage, badges
│   │   ├── invoices/InvoicesPage.tsx
│   │   ├── debt/DebtPage.tsx               # BM5
│   │   └── returns/ReturnsPage.tsx
│   ├── lib/
│   │   ├── api/                            # client.ts, types.ts, errors.ts
│   │   └── format.ts                       # formatVnd, formatDate
│   └── mocks/mock-server.ts                # Backend giả lập (VITE_API_MODE=mock)
```

## Chạy local

```sh
cd apps/dealer-portal
npm ci

# Chế độ mock — không cần backend (mặc định):
npm run dev

# Chế độ thật — cần backend chạy trên cổng 4000:
VITE_API_MODE=real npm run dev
```

Mặc định là mock. Logic trong `src/lib/api/client.ts`: chỉ gọi backend thật khi `VITE_API_MODE=real`; nếu biến không được đặt, ứng dụng chạy hoàn toàn offline qua mock server.

App chạy trên cổng **5174** (admin-web dùng 5173).

## Màn hình và trạng thái tích hợp

| Màn hình | Route | Tính năng BM/QĐ | Backend |
|---|---|---|---|
| Đăng nhập | `/login` | — | P5 `POST /auth/login` |
| Tổng quan | `/` | — | P5 debt, P3 orders, P5 invoices |
| Hồ sơ đại lý | `/profile` | BM1 | P3 dealers, P5 debt |
| Danh mục sản phẩm | `/catalog` | QĐ2, QĐ3 | P3 skus, pricing, promotions |
| Danh sách đơn hàng | `/orders` | BM3 | P4 sales-orders |
| Tạo đơn hàng | `/orders/new` | BM3, QĐ3 | P4 `POST /sales-orders` |
| Chi tiết đơn hàng | `/orders/:id` | BM3 | P4 sales-orders |
| Hóa đơn | `/invoices` | BM3 | P5 invoices |
| Công nợ | `/debt` | BM5, QĐ3 | P5 debt, debt-ledger |
| Yêu cầu trả hàng | `/returns` | — | P4 returns |

Toàn bộ màn hình hiện chạy mock. Khi backend sẵn sàng, thay `VITE_API_MODE=real` và nối từng endpoint thật theo bảng trên.

## Tài khoản mẫu (mock server)

| Email | Mật khẩu | Đại lý |
|---|---|---|
| `dealer1@agenthub.vn` | `password123` | DL0001 — Minh Phát (Loại 1, Q.5) |
| `dealer2@agenthub.vn` | `password123` | DL0002 — Hoa Bình (Loại 2, Q.10) |

## Phối hợp với backend

### Với P5 (Finance Backend)

- **Công nợ — `/debt`**: Gọi `GET /api/v1/dealers/:id/debt` để lấy `currentDebt`, `maxDebtAllowed`, `remainingCredit`. Hiển thị cảnh báo đỏ khi `isDebtExceeded = true`.
- **Sổ cái — `/debt`**: Gọi `GET /api/v1/dealers/:id/debt-ledger` với phân trang để lấy lịch sử giao dịch.
- **Hóa đơn — `/invoices`**: `GET /api/v1/invoices` lọc theo `dealerId` (backend tự lọc theo token).
- **Đăng nhập**: `POST /api/v1/auth/login` trả về token JWT; AuthContext lưu vào `localStorage` với key `agenthub.dealer.token`.

### Với P3 (Commercial Backend)

- **Hồ sơ — `/profile`**: `GET /api/v1/dealers/:id` trả về thông tin loại đại lý, quận, hạn mức nợ.
- **Danh mục — `/catalog`**: `GET /api/v1/skus` kèm giá xuất từ pricing và khuyến mãi từ `GET /api/v1/promotions`.

### Với P4 (Order & Fulfillment)

- **Đặt hàng — `/orders/new`**: `POST /api/v1/sales-orders` với `lines: [{ skuId, quantity }]` và `notes`. Backend trả `RULE_VIOLATION_QD3` khi vượt hạn mức nợ — hiển thị lỗi thân thiện trên form.
- **Danh sách đơn — `/orders`**: `GET /api/v1/sales-orders` lọc theo `status`; backend tự thu hẹp theo dealer từ token.
- **Trả hàng — `/returns`**: `POST /api/v1/returns` với `salesOrderId` và `reason`.

## Phần tiếp theo

- Nối client với API thật của P3, P4, P5 (thay mock handler từng endpoint theo bảng trên).
- Thêm useQuery/useMutation vào từng trang, xóa dữ liệu MOCK_ tĩnh.
- Kiểm tra responsive trên màn hình điện thoại (< 640px) cho bảng và form đặt hàng.
- Viết test component cho form tạo đơn và các trạng thái lỗi nghiệp vụ (vượt nợ, hết hàng).
