# Kiến trúc giai đoạn Admin Foundation

## Luồng xác thực

```text
Admin UI -> POST /api/auth/login -> kiểm tra bcrypt -> MongoDB users
         <- accessToken (15 phút) + refreshToken (7 ngày), httpOnly cookie

Admin UI -> API được bảo vệ -> authenticate -> authorize("admin")
         <- dữ liệu hoặc HTTP 401/403
```

Refresh token được hash SHA-256 trước khi lưu trong MongoDB. Mỗi lần refresh sẽ xoay vòng token; đăng xuất xóa token đã lưu và cookie phía trình duyệt.

## Các collection dự kiến

- `users`
- `categories`
- `brands`
- `products`
- `orders`
- `carts`
- `rag_documents` hoặc embedding đặt cùng `products`

## Thứ tự phát triển tiếp theo

1. CRUD danh mục.
2. CRUD thương hiệu.
3. CRUD sản phẩm và biến thể.
4. Upload ảnh Cloudinary.
5. Quản lý đơn hàng.
6. Quản lý khách hàng.
7. Storefront và giỏ hàng.
8. Pipeline embedding, vector search và chatbot RAG.
