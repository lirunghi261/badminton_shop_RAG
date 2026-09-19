# Hướng dẫn phát triển trang người dùng (Storefront)

Tài liệu này dành cho thành viên phụ trách giao diện khách hàng. Mục tiêu là giúp phát triển
storefront độc lập, hạn chế xung đột với trang quản trị và backend.

## 1. Phạm vi phụ trách

Các route phía người dùng:

```text
/                    Trang chủ
/products            Danh sách, tìm kiếm và lọc sản phẩm
/products/:slug      Chi tiết sản phẩm
/ai-advisor          Chatbot tư vấn sản phẩm
/cart                Giỏ hàng
/account             Tài khoản và lịch sử đơn hàng
```

Các thư mục nên sử dụng:

```text
client/src/pages/storefront/       Các trang người dùng
client/src/components/storefront/  Component chỉ dùng cho storefront
client/src/layouts/StorefrontLayout.tsx
client/src/routes/paths.ts
```

Nếu component dùng chung cho cả storefront và admin, đặt tại:

```text
client/src/components/common/
```

## 2. Khu vực không tự ý thay đổi

Không chỉnh sửa các phần sau nếu chưa trao đổi với thành viên phụ trách admin/backend:

```text
client/src/layouts/AdminLayout.tsx
client/src/pages/admin/
client/src/auth/
server/src/modules/auth/
server/src/middlewares/auth.ts
server/.env
```

Không đổi đường dẫn `/admin`, cấu trúc cookie xác thực hoặc response API dùng chung. Nếu cần
thay đổi API, thống nhất contract trước khi sửa cả frontend và backend.

## 3. Quy ước route

- Khai báo URL dùng chung trong `client/src/routes/paths.ts`.
- Cấu hình route tại `client/src/routes/AppRoutes.tsx`.
- Trang mới nên được lazy-load giống các trang hiện có.
- Không viết rải rác chuỗi URL như `"/products"` trong nhiều file; sử dụng `paths.products`.
- Không dùng `window.location` cho điều hướng nội bộ. Sử dụng `Link`, `NavLink` hoặc `useNavigate`.
- Route không tồn tại phải để trang 404 xử lý; không chuyển người dùng sang `/admin`.

Ví dụ thêm route:

```tsx
// paths.ts
wishlist: "/wishlist",

// AppRoutes.tsx, bên trong StorefrontLayout
<Route path="wishlist" element={<WishlistPage />} />
```

## 4. Quy ước gọi API

- Dùng Axios instance có sẵn tại `client/src/api/core/http.ts`.
- Không tạo Axios instance mới cho từng trang.
- Dùng TanStack Query cho server state: sản phẩm, danh mục, đơn hàng và người dùng.
- Đặt hàm gọi API tại `client/src/api/`, không gọi Axios trực tiếp trong JSX.
- Luôn định nghĩa kiểu dữ liệu TypeScript cho request và response.
- Không hard-code `http://localhost:5000`; frontend gọi qua prefix `/api`.
- Có đủ trạng thái loading, empty và error.

Ví dụ:

```ts
export async function getProducts() {
  const response = await http.get("/products");
  return response.data.data;
}
```

## 5. CSS và theme

Theme chính của dự án là **đại dương + trắng**:

```text
Primary blue:  #0369a1
Ocean dark:    #082f49
Sky accent:    #38bdf8
Light surface: #f4f9ff
White:         #ffffff
Main text:     #0f2740
```

Quy tắc tránh ảnh hưởng admin:

- CSS storefront đặt tại `client/src/styles/storefront.css`.
- Class storefront dùng prefix `store-` hoặc `home-`.
- Class admin dùng prefix `admin-`; không ghi đè các class này.
- Không style trực tiếp selector chung như `button`, `.ant-btn`, `.ant-card` nếu không giới hạn scope.
- Khi cần ghi đè Ant Design, đặt dưới scope `.store-shell`.
- Thiết kế phải responsive tối thiểu ở desktop, tablet và mobile.
- Không tự thêm một UI library khác nếu Ant Design đã đáp ứng được nhu cầu.

Ví dụ an toàn:

```css
.store-shell .product-card { /* ... */ }
```

Ví dụ dễ ảnh hưởng toàn hệ thống:

```css
.ant-card { /* Không nên ghi đè toàn cục */ }
```

## 6. Component và dữ liệu

- Không đặt toàn bộ giao diện vào một page quá lớn; tách các khối có thể tái sử dụng.
- Component dùng PascalCase; hook bắt đầu bằng `use`; hàm và biến dùng camelCase.
- Không sử dụng `any` nếu có thể mô tả kiểu dữ liệu.
- Không hard-code dữ liệu giả trực tiếp trong nhiều component. Đặt mock data tại một file riêng và
  dễ dàng thay bằng API sau này.
- Giá tiền hiển thị theo `vi-VN` và tiền tệ `VND`.
- Ảnh sản phẩm cần có `alt`, trạng thái lỗi và ảnh mặc định.
- Không lưu access token trong `localStorage`; hệ thống xác thực sử dụng cookie `httpOnly`.

## 7. Git và bảo mật

- Mỗi chức năng nên làm trên branch riêng, ví dụ `feature/storefront-product-list`.
- Không commit `server/.env`, mật khẩu MongoDB, token hoặc API key.
- Không sửa hoặc xóa thay đổi của thành viên khác để giải quyết conflict.
- Commit tập trung vào một chức năng, thông điệp rõ ràng.
- Pull hoặc đồng bộ branch trước khi bắt đầu một phần việc mới.

## 8. Checklist trước khi bàn giao hoặc merge

Chạy tại thư mục gốc:

```bash
npm run lint
npm run build
```

Kiểm tra thủ công:

- `/` vẫn mở Home bình thường.
- `/admin` vẫn chuyển đến `/admin/login` khi chưa đăng nhập.
- Route mới hoạt động khi truy cập trực tiếp hoặc refresh trình duyệt.
- Không có lỗi hoặc warning bất thường trong console.
- Giao diện hoạt động ở màn hình mobile.
- Loading, empty và error state đều hiển thị hợp lý.
- Không có secret hoặc file `.env` trong commit.

## 9. Khi nào cần trao đổi với nhóm

Cần thống nhất trước khi thực hiện nếu thay đổi:

- API contract hoặc schema MongoDB.
- Luồng đăng nhập, đăng xuất hoặc phân quyền.
- Shared component đang được admin sử dụng.
- Theme token toàn cục.
- Tên hoặc cấu trúc route đã tồn tại.
- Cài thêm dependency mới.
