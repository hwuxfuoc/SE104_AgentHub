# AgentHub Admin Web (P2)

Giao diện Internal/Admin cho Admin, Sales, Warehouse, Accountant. React + TypeScript (TSX), Vite, React Router, TanStack Query, React Hook Form + Zod, Tailwind CSS v4.

## Chạy nhanh (không cần backend)

```sh
cd apps/admin-web
npm install
npm run dev        # http://localhost:5173
```

Mặc định chạy **mock mode**: dữ liệu giả lập trong trình duyệt, đủ để xem và thao tác mọi màn hình. Tải lại trang sẽ reset dữ liệu.

Tài khoản demo (mật khẩu `password123`): `admin@`, `sales@`, `warehouse@`, `accountant@` + `agenthub.vn`.

## Chạy với backend thật

```sh
cp .env.example .env      # đặt VITE_API_MODE=real
# chạy backend (xem docs/p3-commercial-backend.md): npm run dev ở thư mục gốc, cổng 4000
npm run dev
```

Các màn hình gắn nhãn **MOCK** (Hàng hóa & tồn kho, BM2, BM3) luôn dùng mock vì backend chưa có API; contract đề xuất nằm ở `src/mocks/mock-server.ts`.

## Lệnh

| Lệnh | Mô tả |
|---|---|
| `npm run dev` | Dev server |
| `npm run lint` | Typecheck (`tsc --noEmit`) |
| `npm test` | Vitest |
| `npm run build` | Typecheck + build production |

## Cấu trúc

```
src/
  auth/         đăng nhập, ma trận quyền (permissions.ts), route guard
  components/   ui/ (Button, DataTable, Overlay, Toast…), layout/ (AppShell)
  features/     theo nghiệp vụ: dealers, payments, reports, rules, vouchers, inventory, dashboard
  lib/          api client (mock/real), types theo contract backend, format tiền/ngày
  mocks/        backend giả lập
  styles/       design tokens (sáng/tối)
```

Quy ước: component `PascalCase.tsx`, module khác `kebab-case.ts`; mỗi feature có `api.ts` (React Query hooks). Frontend không thực thi quy tắc nghiệp vụ — backend là nơi quyết định, UI chỉ cảnh báo sớm và hiển thị lỗi (`RULE_VIOLATION_*`).
