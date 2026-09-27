# Kế hoạch triển khai dự án Quản lý các đại lý

## 1. Mục đích tài liệu

Tài liệu này chuyển các yêu cầu BM1–BM6 và QĐ1–QĐ7 thành kế hoạch triển khai phần mềm, phân rã công việc theo các vai trò P1–P5, xác định các điểm tích hợp và tiêu chí nghiệm thu.

## 2. Mục tiêu sản phẩm

Xây dựng hệ thống quản lý đại lý có khả năng:

- Tiếp nhận và quản lý hồ sơ đại lý.
- Quản lý mặt hàng, đơn vị tính, giá nhập và tồn kho.
- Lập phiếu nhập hàng, phiếu xuất hàng và kiểm soát công nợ.
- Tra cứu đại lý theo các tiêu chí phù hợp với BM4.
- Lập phiếu thu tiền và cập nhật công nợ.
- Lập báo cáo doanh số và báo cáo công nợ theo tháng.
- Cho phép người dùng có quyền thay đổi các quy định QĐ1, QĐ2 và QĐ3.
- Cung cấp hai trải nghiệm sử dụng: Dealer Portal cho đại lý và Internal/Admin cho nhân sự nội bộ.

## 3. Phạm vi phiên bản đầu tiên

### 3.1. Trong phạm vi

| Nhóm            | Chức năng                                                                                                                | Yêu cầu liên quan  |
| --------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------ |
| Đại lý          | Đăng nhập, xem hồ sơ, xem sản phẩm, xem bảng giá, theo dõi đơn hàng, giao hàng, hóa đơn và công nợ, gửi yêu cầu trả hàng | BM1, BM3, BM4, BM5 |
| Nội bộ          | Quản lý đại lý, sản phẩm, bảng giá, đơn hàng, kho, giao hàng, thanh toán, công nợ và báo cáo                             | BM1–BM6, QĐ1–QĐ7   |
| Thương mại      | Dealer, DealerTier, Product, SKU, Category, Pricing, Promotion                                                           | QĐ1, QĐ2, QĐ3      |
| Đơn hàng và kho | SalesOrder, OrderItem, phê duyệt, Inventory, Warehouse, StockReservation, Shipment, Return                               | BM2, BM3           |
| Tài chính       | Invoice, Payment, Debt, Credit Limit, Reporting                                                                          | BM3, BM5, BM6      |
| Cấu hình        | Thay đổi số loại đại lý, số đại lý tối đa mỗi quận, số mặt hàng, đơn vị tính, hạn mức nợ và tỷ lệ giá xuất               | QĐ7                |

### 3.2. Ngoài phạm vi phiên bản đầu tiên

- Tích hợp thanh toán trực tuyến với ngân hàng hoặc cổng thanh toán.
- Tích hợp vận chuyển với đơn vị giao hàng bên thứ ba.
- Ứng dụng mobile native riêng cho đại lý.
- Hệ thống kế toán hoàn chỉnh thay thế phần mềm kế toán chuyên dụng.

## 4. Quy tắc nghiệp vụ cần chuẩn hóa

Các giá trị dưới đây là giá trị khởi tạo. Người có quyền quản trị có thể thay đổi thông qua màn hình cấu hình theo QĐ7.

| Mã  | Quy tắc mặc định                                                                            | Cách áp dụng                                                           |
| --- | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| QĐ1 | Có 2 loại đại lý, 20 quận, mỗi quận tối đa 4 đại lý                                         | Kiểm tra khi tạo hoặc cập nhật đại lý; không cho vượt hạn mức cấu hình |
| QĐ2 | Có 5 mặt hàng và 3 đơn vị tính                                                              | Kiểm tra danh mục khi khởi tạo dữ liệu và khi cấu hình                 |
| QĐ3 | Hạn mức nợ loại 1 là 10.000.000 đồng, loại 2 là 5.000.000 đồng; giá xuất bằng 102% giá nhập | Tính giá xuất và kiểm tra hạn mức trước khi duyệt phiếu xuất           |
| QĐ5 | Số tiền thu không vượt số tiền đại lý đang nợ                                               | Kiểm tra trong cùng giao dịch tạo phiếu thu                            |

Các phép tính tiền phải dùng kiểu số nguyên theo đơn vị đồng hoặc kiểu decimal chính xác, không dùng số thực nhị phân. Mọi thay đổi quy định cần lưu lịch sử gồm người thay đổi, thời điểm, giá trị cũ và giá trị mới.

## 5. Kiến trúc và ranh giới hệ thống

### 5.1. Thành phần chính

1. Dealer Portal: giao diện dành cho đại lý.
2. Internal/Admin Frontend: giao diện dành cho Admin, Sales, Warehouse và Accountant.
3. Commercial Backend: quản lý dữ liệu đại lý, sản phẩm, SKU, danh mục, giá và khuyến mãi.
4. Order & Fulfillment Backend: quản lý đơn hàng, phê duyệt, kho, giữ hàng, giao hàng và trả hàng.
5. Finance Backend: quản lý hóa đơn, thanh toán, công nợ, hạn mức và báo cáo.
6. Database: lưu trữ dữ liệu giao dịch, dữ liệu danh mục và lịch sử cấu hình.

### 5.2. Ngôn ngữ và quy ước phát triển

- Sử dụng TypeScript cho backend, domain logic, API contract, migration helper và các module dùng chung; mã nguồn ứng dụng dùng phần mở rộng `.ts`.
- Sử dụng TSX cho Dealer Portal và Internal/Admin Frontend; các component React dùng phần mở rộng `.tsx`.
- Hạn chế JavaScript thuần trong mã nguồn ứng dụng; chỉ dùng JavaScript khi bắt buộc bởi file cấu hình hoặc công cụ build.
- Bật kiểm tra kiểu nghiêm ngặt trong TypeScript và thống nhất một bộ quy tắc lint, format giữa các package.
- Chia sẻ type request/response, enum trạng thái và quy tắc định dạng dữ liệu giữa frontend và backend khi phù hợp, nhưng không đưa logic nghiệp vụ nhạy cảm lên frontend.
- CI phải kiểm tra typecheck cho toàn bộ mã `.ts` và `.tsx` trước khi build.

### 5.3. Nguyên tắc thiết kế

- Backend là nơi duy nhất thực thi quy tắc nghiệp vụ; frontend chỉ hỗ trợ kiểm tra nhập liệu và hiển thị lỗi.
- Các nghiệp vụ tạo phiếu xuất, giữ tồn kho, ghi nhận thanh toán và cập nhật công nợ phải có tính nguyên tử.
- Mỗi nghiệp vụ giao dịch có trạng thái rõ ràng, người tạo, thời điểm tạo, người duyệt và thời điểm duyệt nếu có.
- API phải phân quyền theo vai trò và giới hạn dữ liệu theo phạm vi người dùng.
- Dữ liệu báo cáo lấy từ các giao dịch đã hoàn tất hoặc đã được xác định trạng thái tính vào báo cáo.

## 6. Mô hình dữ liệu tối thiểu

### 6.1. Nhóm thương mại

- `Dealer`: mã, tên, loại, điện thoại, địa chỉ, quận, ngày tiếp nhận, email, trạng thái.
- `DealerTier`: tên loại đại lý, hạn mức nợ, trạng thái.
- `District`: mã quận, tên quận, trạng thái.
- `Category`: mã và tên nhóm hàng.
- `Product`: mã, tên, danh mục, trạng thái.
- `SKU`: sản phẩm, đơn vị tính, mã hàng, trạng thái.
- `Pricing`: SKU, giá nhập, giá xuất cơ sở, thời gian hiệu lực.
- `Promotion`: điều kiện, mức ưu đãi, thời gian hiệu lực, trạng thái.

### 6.2. Nhóm kho và đơn hàng

- `Warehouse`: kho và địa chỉ kho.
- `Inventory`: SKU, kho, số lượng tồn, số lượng đã giữ.
- `StockReservation`: giao dịch giữ hàng, SKU, số lượng, trạng thái.
- `SalesOrder`: đại lý, ngày lập, tổng tiền, trạng thái, người duyệt.
- `OrderItem`: đơn hàng, SKU, đơn vị tính, số lượng, đơn giá, thành tiền.
- `Shipment`: đơn hàng, kho xuất, thông tin giao, trạng thái.
- `Return`: đơn hàng, lý do, số lượng trả, trạng thái xử lý.

### 6.3. Nhóm tài chính và cấu hình

- `Invoice`: đơn hàng hoặc phiếu xuất, số tiền, ngày lập, trạng thái.
- `Payment`: đại lý, ngày thu, số tiền, phương thức, người ghi nhận.
- `DebtLedger`: đại lý, loại phát sinh, số tiền tăng giảm, số dư sau giao dịch.
- `CreditLimit`: loại đại lý, hạn mức, thời gian hiệu lực.
- `BusinessRule`: mã quy định, giá trị cấu hình, thời gian hiệu lực.
- `BusinessRuleHistory`: lịch sử thay đổi quy định.
- `AuditLog`: người thao tác, hành động, đối tượng, thời điểm và kết quả.

## 7. Phân công chi tiết theo vai trò

### P1. Dealer Portal Frontend

**Phạm vi:** trải nghiệm của đại lý.

**Công nghệ:** triển khai giao diện bằng TSX; các type dữ liệu, API client và utility dùng `.ts`.

**Công việc:**

- Xây dựng đăng nhập, khôi phục phiên và phân quyền giao diện.
- Xây dựng màn hình hồ sơ đại lý theo BM1 và tra cứu thông tin theo BM4.
- Xây dựng catalog sản phẩm, SKU, đơn vị tính, bảng giá và khuyến mãi.
- Xây dựng quy trình đặt hàng, xem trạng thái duyệt, giao hàng và hóa đơn.
- Xây dựng màn hình công nợ, lịch sử thanh toán và yêu cầu trả hàng.
- Xử lý trạng thái loading, empty, validation, lỗi API và quyền truy cập.
- Viết test component và test luồng người dùng cho các quy trình chính.

**Bàn giao:** bản thiết kế màn hình, route map, API contract cần dùng, frontend chạy được với mock data và test UI.

### P2. Internal/Admin Frontend

**Phạm vi:** giao diện vận hành nội bộ.

**Công nghệ:** triển khai giao diện bằng TSX; các type dữ liệu, API client và utility dùng `.ts`.

**Công việc:**

- Xây dựng layout và navigation cho Admin, Sales, Warehouse và Accountant.
- Xây dựng quản lý đại lý, sản phẩm, bảng giá, đơn hàng, kho và giao hàng.
- Xây dựng form BM1, BM2, BM3, BM5 và màn hình danh sách BM4.
- Xây dựng màn hình báo cáo BM6.1, BM6.2 theo tháng.
- Xây dựng màn hình cấu hình QĐ1, QĐ2, QĐ3 theo QĐ7.
- Hiển thị lỗi nghiệp vụ từ backend, đặc biệt là vượt hạn mức nợ, vượt tồn kho và thu vượt công nợ.
- Viết test form, test phân quyền và test các trạng thái giao dịch.

**Bàn giao:** route map nội bộ, bộ component dùng chung, màn hình tích hợp API và checklist responsive.

### P3. Commercial Backend và Database

**Phạm vi:** dữ liệu và nghiệp vụ thương mại.

**Công nghệ:** triển khai backend và module nghiệp vụ bằng TypeScript với mã nguồn `.ts`.

**Công việc:**

- Thiết kế schema và migration cho Dealer, DealerTier, District, Product, SKU, Category, Pricing và Promotion.
- Xây dựng API CRUD có phân trang, tìm kiếm, lọc và sắp xếp.
- Xây dựng nghiệp vụ tiếp nhận đại lý và kiểm tra QĐ1.
- Xây dựng nghiệp vụ danh mục, giá nhập và tính giá xuất theo QĐ3.
- Xây dựng API cho P1/P2, tài liệu OpenAPI và dữ liệu mẫu.
- Thêm unique constraint, foreign key, index và kiểm tra tính hợp lệ ở tầng database.
- Viết unit test cho quy tắc thương mại và integration test cho API.

**Bàn giao:** migration, schema, API, OpenAPI, seed data, test và hướng dẫn chạy local.

### P4. Order và Fulfillment Backend và Database

**Phạm vi:** đơn hàng, phiếu nhập/xuất và kho.

**Công nghệ:** triển khai service, workflow và repository bằng TypeScript với mã nguồn `.ts`.

**Công việc:**

- Thiết kế và triển khai SalesOrder, OrderItem, Warehouse, Inventory, StockReservation, Shipment và Return.
- Xây dựng phiếu nhập hàng BM2, cập nhật tồn kho và kiểm tra QĐ2.
- Xây dựng phiếu xuất hàng BM3, lấy giá xuất từ bảng giá, kiểm tra tồn kho và hạn mức nợ.
- Thiết kế workflow trạng thái: nháp, chờ duyệt, đã duyệt, đang xử lý, đã giao, hoàn tất, hủy.
- Đảm bảo giữ hàng và trừ tồn kho không xảy ra trùng khi có nhiều yêu cầu đồng thời.
- Cung cấp API cho đặt hàng, duyệt đơn, giao hàng và trả hàng.
- Viết test workflow, test cạnh tranh tồn kho và integration test với P3, P5.

**Bàn giao:** migration, API, state machine đơn hàng, tài liệu workflow, test và dữ liệu kiểm thử.

### P5. Finance Backend, Integration và Kiểm thử hệ thống

**Phạm vi:** tài chính, báo cáo, tích hợp và chất lượng toàn hệ thống.

**Công nghệ:** triển khai finance service, integration test helper và contract test bằng TypeScript với mã nguồn `.ts`.

**Công việc:**

- Thiết kế và triển khai Invoice, Payment, DebtLedger, CreditLimit, Reporting và AuditLog.
- Xây dựng phiếu thu BM5, kiểm tra QĐ5 và cập nhật công nợ nguyên tử.
- Xây dựng báo cáo doanh số BM6.1 và công nợ BM6.2 theo tháng.
- Cung cấp API tài chính cho P1/P2 và tích hợp với P4.
- Thiết kế Docker backend, docker-compose cho môi trường local và integration test.
- Xây dựng test contract giữa frontend và backend, test migration và test dữ liệu báo cáo.
- Theo dõi lỗi xuyên suốt hệ thống, kiểm tra log, phân quyền và các thao tác cần audit.

**Bàn giao:** module tài chính, API báo cáo, cấu hình Docker, integration test, test report và checklist release.

## 8. API contract tối thiểu

| Nhóm             | Endpoint dự kiến                                                             | Vai trò sử dụng |
| ---------------- | ---------------------------------------------------------------------------- | --------------- |
| Auth             | `POST /auth/login`, `POST /auth/refresh`                                     | P1, P2          |
| Đại lý           | `GET/POST/PATCH /dealers`, `GET /dealers/{id}`                               | P1, P2          |
| Danh mục         | `GET/POST/PATCH /products`, `/skus`, `/categories`, `/pricing`               | P1, P2          |
| Nhập hàng        | `POST /purchase-receipts`, `GET /purchase-receipts/{id}`                     | P2, P4          |
| Đơn hàng         | `POST /sales-orders`, `GET /sales-orders`, `POST /sales-orders/{id}/approve` | P1, P2, P4      |
| Kho và giao hàng | `GET /inventory`, `POST /shipments`, `POST /returns`                         | P2, P4          |
| Tài chính        | `POST /payments`, `GET /dealers/{id}/debt`, `GET /invoices`                  | P1, P2, P5      |
| Báo cáo          | `GET /reports/sales`, `GET /reports/debt`                                    | P2, P5          |
| Cấu hình         | `GET/PATCH /business-rules`                                                  | P2, P3, P4, P5  |

API contract phải thống nhất trước khi frontend tích hợp, gồm schema request/response, mã lỗi, phân trang, bộ lọc, timezone, định dạng tiền và trạng thái nghiệp vụ.

## 9. Lộ trình triển khai

### Giai đoạn 0: Khởi động và thống nhất nền tảng

- Chốt cách chạy local, quy ước branch, commit và review; thống nhất TypeScript cho backend và TSX cho hai frontend.
- Chốt role, permission, timezone, định dạng tiền và mã trạng thái.
- Chốt schema sơ bộ và API contract cho các luồng chính.
- Tạo repository structure, CI cơ bản, Docker local và dữ liệu mẫu.

**Điều kiện hoàn tất:** mọi thành viên chạy được project, database và test mẫu trên máy local.

### Giai đoạn 1: Nền tảng thương mại và hồ sơ đại lý

- P3 hoàn thành Dealer, DealerTier, District, Product, SKU, Category và API cơ bản.
- P1 hoàn thành đăng nhập, hồ sơ, catalog và bảng giá.
- P2 hoàn thành layout nội bộ và BM1, BM4.
- P5 hoàn thành khung audit log, phân quyền backend và pipeline test.

**Điều kiện hoàn tất:** tạo đại lý hợp lệ, chặn đại lý vượt giới hạn QĐ1 và tra cứu được từ hai frontend.

### Giai đoạn 2: Nhập hàng và tồn kho

- P4 hoàn thành BM2, Warehouse, Inventory và StockReservation.
- P2 hoàn thành màn hình nhập hàng và tồn kho.
- P3 hoàn thiện dữ liệu giá nhập và quy tắc QĐ2.
- P5 kiểm thử số lượng tồn, dữ liệu âm và transaction.

**Điều kiện hoàn tất:** lập phiếu nhập làm tăng tồn kho đúng một lần, dữ liệu sai bị từ chối rõ ràng.

### Giai đoạn 3: Xuất hàng, đơn hàng và giao hàng

- P1 hoàn thành đặt hàng và theo dõi trạng thái.
- P2 hoàn thành BM3, duyệt đơn, giao hàng và trả hàng.
- P4 hoàn thành workflow đơn hàng, giữ hàng và shipment.
- P3 cung cấp giá theo QĐ3; P5 kiểm tra hạn mức nợ và tích hợp dữ liệu tài chính.

**Điều kiện hoàn tất:** đơn hàng chỉ được duyệt khi đủ tồn kho và không vượt hạn mức nợ; giá xuất được tính đúng.

### Giai đoạn 4: Thu tiền, công nợ và báo cáo

- P5 hoàn thành BM5, DebtLedger, Invoice, BM6.1 và BM6.2.
- P1 hiển thị hóa đơn, công nợ và lịch sử thanh toán.
- P2 hoàn thành màn hình thu tiền và báo cáo tháng.
- P4 phát sự kiện hoặc cung cấp dữ liệu giao dịch hoàn tất cho P5.

**Điều kiện hoàn tất:** số tiền thu không vượt công nợ, số dư đầu/phát sinh/cuối khớp với giao dịch nguồn.

### Giai đoạn 5: Cấu hình quy định và ổn định hệ thống

- P2 hoàn thành màn hình QĐ7.
- P3 quản lý version và lịch sử BusinessRule.
- P4 và P5 áp dụng cấu hình mới trong các giao dịch sau đó.
- Cả nhóm hoàn thành regression test, security review, tài liệu vận hành và demo nghiệm thu.

**Điều kiện hoàn tất:** thay đổi cấu hình có hiệu lực đúng thời điểm, không làm sai dữ liệu giao dịch lịch sử.

## 10. Chiến lược kiểm thử

### 10.1. Unit test

- Tính thành tiền và tổng tiền.
- Tính giá xuất theo QĐ3.
- Kiểm tra giới hạn đại lý theo quận và loại đại lý.
- Kiểm tra hạn mức nợ.
- Kiểm tra số tiền thu theo QĐ5.
- Tính nợ đầu, phát sinh, nợ cuối và tỷ lệ doanh số.

### 10.2. Integration test

- Tạo đại lý từ API đến database.
- Nhập hàng và cập nhật tồn kho.
- Tạo đơn hàng, giữ hàng, duyệt và giao hàng.
- Hoàn tất xuất hàng và ghi nhận công nợ.
- Thu tiền và cập nhật DebtLedger.
- Sinh báo cáo từ dữ liệu giao dịch.

### 10.3. End-to-end test

1. Nhân viên tạo đại lý, đại lý đăng nhập và xem thông tin.
2. Kho nhập hàng, nhân viên cập nhật giá, đại lý tạo đơn hàng.
3. Sales duyệt đơn, kho giao hàng, hệ thống lập hóa đơn.
4. Accountant thu tiền, hệ thống giảm công nợ.
5. Admin thay đổi quy định và xác minh giao dịch mới dùng cấu hình mới.

### 10.4. Các trường hợp biên bắt buộc

- Quận đã đủ số đại lý.
- Đại lý dùng loại không còn tồn tại hoặc bị ngưng hoạt động.
- Tồn kho vừa đủ, thiếu một đơn vị và có hai đơn hàng đồng thời.
- Giá nhập bằng 0, số lượng âm, số tiền có phần lẻ hoặc vượt giới hạn kiểu dữ liệu.
- Đơn hàng vượt hạn mức nợ sau khi cộng phát sinh.
- Phiếu thu bằng đúng công nợ, bằng 0 và lớn hơn công nợ.
- Thay đổi quy định trong khi có giao dịch đang chờ duyệt.
- Báo cáo tháng không có dữ liệu và tháng có dữ liệu hoàn trả.

## 11. Tiêu chí nghiệm thu tổng thể

- Hoàn thành các luồng BM1 đến BM6 và các quy tắc QĐ1, QĐ2, QĐ3, QĐ5, QĐ7.
- Dữ liệu hiển thị trên P1 và P2 nhất quán với dữ liệu backend.
- Không có lỗi mức nghiêm trọng trong các luồng tạo đại lý, nhập hàng, xuất hàng, thu tiền và báo cáo.
- Các giao dịch tài chính và tồn kho không tạo bản ghi trùng khi request được gửi lại.
- Quyền truy cập đúng theo vai trò Admin, Sales, Warehouse, Accountant và Dealer.
- Có migration, seed data, API documentation, hướng dẫn chạy local và hướng dẫn triển khai.
- CI chạy được lint, typecheck cho `.ts` và `.tsx`, unit test, integration test và build frontend/backend.
- Có log đủ để truy vết người thao tác và lịch sử thay đổi quy định.

## 12. Rủi ro và biện pháp xử lý

| Rủi ro                                        | Tác động                            | Biện pháp                                                          |
| --------------------------------------------- | ----------------------------------- | ------------------------------------------------------------------ |
| API contract thay đổi muộn                    | P1/P2 phải sửa nhiều, chậm tích hợp | Chốt contract sớm, dùng mock server và contract test               |
| Quy tắc cấu hình không thống nhất giữa module | Sai giá, hạn mức hoặc báo cáo       | Lưu quy định tập trung, backend là nơi thực thi duy nhất           |
| Cập nhật tồn kho đồng thời                    | Bán vượt tồn hoặc giữ hàng trùng    | Transaction, row lock hoặc cơ chế optimistic locking               |
| Công nợ không khớp giao dịch                  | Sai báo cáo và thu tiền             | DebtLedger bất biến, transaction nguyên tử và đối soát cuối ngày   |
| Dữ liệu lịch sử bị ảnh hưởng khi đổi QĐ7      | Sai kết quả báo cáo cũ              | Version hóa cấu hình, lưu giá trị áp dụng trên từng giao dịch      |
| Phân quyền thiếu ở một endpoint               | Lộ dữ liệu hoặc thao tác trái phép  | Permission matrix, test endpoint theo role và audit log            |
| Khó tái hiện lỗi tích hợp                     | Tốn thời gian sửa lỗi               | Docker compose, seed data cố định, correlation ID và log tập trung |

## 13. Cách phối hợp và bàn giao

- Mỗi module có owner, reviewer và tài liệu API hoặc migration đi kèm.
- P3, P4 và P5 tổ chức buổi chốt contract trước mỗi mốc tích hợp với P1 và P2.
- Mọi pull request phải có mô tả thay đổi, ảnh hưởng dữ liệu, test đã chạy và ảnh hưởng tương thích.
- Các thay đổi quy tắc nghiệp vụ phải cập nhật cả backend test, frontend validation và tài liệu này.
- Mỗi cuối giai đoạn có demo theo kịch bản nghiệm thu, ghi nhận lỗi và quyết định xử lý.

## 14. Kết quả bàn giao cuối dự án

1. Mã nguồn P1–P5 và lịch sử migration.
2. Database schema, seed data và tài khoản mẫu theo role.
3. OpenAPI hoặc tài liệu API cập nhật.
4. Giao diện Dealer Portal và Internal/Admin Frontend.
5. Bộ test unit, integration, end-to-end và báo cáo kết quả.
6. Docker compose, biến môi trường mẫu và hướng dẫn chạy local.
7. Tài liệu hướng dẫn sử dụng, vận hành, backup và xử lý sự cố cơ bản.
8. Biên bản nghiệm thu theo từng BM và QĐ.