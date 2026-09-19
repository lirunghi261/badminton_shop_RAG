# Cấu trúc dự án và phạm vi phụ trách

Tài liệu này là nguồn tham chiếu chung khi phân chia công việc. Không tạo page, component hoặc API
ở ngoài khu vực tương ứng nếu chưa có lý do rõ ràng.

## Frontend

```text
client/src/
├── api/
│   ├── core/                 Axios instance và cấu hình chung
│   ├── auth/                 API xác thực dùng chung
│   └── admin/                API dành cho trang quản trị
├── auth/                     Guard và query key xác thực
├── components/
│   ├── admin/                Component chỉ dùng cho admin
│   ├── common/               Component dùng chung
│   └── storefront/           Component chỉ dùng cho trang khách hàng
├── layouts/
│   ├── AdminLayout.tsx
│   └── StorefrontLayout.tsx
├── pages/
│   ├── admin/                Page quản trị
│   ├── errors/               404 và các trang lỗi
│   └── storefront/           Page khách hàng
├── routes/
│   ├── AppRoutes.tsx         Nơi đăng ký route tập trung
│   └── paths.ts              Hằng số URL
├── styles/
│   └── app.css               Global, admin và storefront được chia theo section/prefix
├── App.tsx
└── main.tsx
```

### Quy tắc đặt file frontend

- Page chỉ điều phối dữ liệu và ghép các component; không để toàn bộ UI phức tạp trong một file.
- Component chỉ dùng cho một khu vực phải nằm trong `components/admin` hoặc
  `components/storefront`.
- Component thực sự dùng chung mới đặt trong `components/common`.
- Hàm gọi API phải nằm trong `api`, không gọi Axios trực tiếp trong page/component.
- Route mới phải khai báo tại `paths.ts` và đăng ký tại `AppRoutes.tsx`.
- CSS storefront dùng prefix `store-`/`home-`; CSS admin dùng prefix `admin-`.

## Backend

```text
server/src/
├── config/                   Cấu hình môi trường và database
├── middlewares/              Auth, phân quyền và xử lý lỗi
├── modules/                  Nghiệp vụ chia theo feature
│   ├── auth/
│   ├── dashboard/
│   └── users/
├── scripts/                  Seed và tác vụ chạy thủ công
├── types/                    Type augmentation dùng chung
├── utils/                    Tiện ích không thuộc một nghiệp vụ
├── app.ts                    Khởi tạo Express và mount router
└── server.ts                 Kết nối database và mở cổng HTTP
```

Module mới dùng cấu trúc thống nhất:

```text
server/src/modules/products/
├── product.model.ts
├── product.schemas.ts
├── product.service.ts
├── product.controller.ts
└── product.routes.ts
```

- `model`: schema MongoDB/Mongoose.
- `schemas`: kiểm tra request bằng Zod.
- `service`: nghiệp vụ và truy vấn dữ liệu.
- `controller`: chuyển đổi HTTP request/response.
- `routes`: khai báo endpoint và middleware.

Không bắt buộc tạo mọi file nếu module rất nhỏ, nhưng không đặt nghiệp vụ trực tiếp trong
`app.ts` hoặc `routes`.

## Phạm vi theo thành viên

| Vai trò | Khu vực chính |
|---|---|
| Storefront frontend | `pages/storefront`, `components/storefront`, API storefront tương ứng |
| Admin frontend | `pages/admin`, `components/admin`, `AdminLayout`, `api/admin` |
| Backend | `server/src/modules`, `config`, `middlewares`, `utils` |

Các file dùng chung như `AppRoutes.tsx`, `paths.ts`, `app.css`, `server/src/app.ts` và các file
`package.json` cần được trao đổi trước khi nhiều thành viên cùng sửa.

