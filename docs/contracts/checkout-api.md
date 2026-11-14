# Hợp đồng API checkout và đơn của tôi

## Phạm vi tuần 7

Đây là hợp đồng cho bước triển khai tạo đơn ở tuần 9. Hiện tại checkout chỉ xem trước thông tin; các endpoint khách hàng bên dưới chưa được triển khai. Không dùng đơn seed trong Admin làm minh chứng khách đã đặt hàng. Giao diện thành công và Đơn của tôi sẽ nối API khi chức năng tạo đơn được triển khai.

## Tạo đơn COD

`POST /api/customer/orders`, xác thực cookie `customerAccessToken`, `Content-Type: application/json`. Bắt buộc header `Idempotency-Key` là UUID do client tạo một lần cho mỗi lần xác nhận đơn; gửi lại cùng đơn phải dùng cùng khóa.

```json
{
  "customer": { "fullName": "Người nhận", "phone": "0901234567", "email": "buyer@example.com" },
  "shippingAddress": { "addressLine": "Số nhà, đường, phường/xã, tỉnh/thành phố" },
  "items": [{ "productId": "<ObjectId sản phẩm>", "sku": "VT-SK190-BLK", "quantity": 2 }],
  "paymentMethod": "cod",
  "customerNote": "Gọi trước khi giao"
}
```

- userId lấy từ phiên đăng nhập. Client không được quyết định giá, giảm giá, phí vận chuyển, tổng tiền, trạng thái đơn, paymentStatus hoặc nguồn đơn.
- Họ tên tối đa 100 ký tự; số điện thoại Việt Nam hợp lệ; email tùy chọn, tối đa 160 ký tự; addressLine từ 10 đến 250 ký tự; ghi chú tối đa 500 ký tự. Trim trước khi kiểm tra.
- Mỗi dòng có productId hợp lệ, SKU thuộc đúng sản phẩm và quantity nguyên dương. Giới hạn 50 dòng; các dòng trùng productId/SKU được gộp rồi kiểm tra tổng lượng. Server từ chối trường lạ thay vì tin giá từ giỏ.
- Chỉ nhận `cod` trong bản nghiệm thu tối thiểu. Tên phương thức chuyển khoản thống nhất là `bank_transfer`, thuộc phần mở rộng; giao diện xem trước hiện có lựa chọn này nhưng API tạo đơn COD phải từ chối phương thức chưa hỗ trợ.
- Server kiểm tra product/category/brand đang bán, đọc giá hiệu lực và tồn theo SKU. Tính subtotal, shippingFee, discount, total tại server theo chính sách được công bố trước khi nối UI. Không dùng subtotal hoặc stock trong localStorage làm nguồn chính thức.
- Tạo đơn với source=`checkout`, pending/unpaid, lịch sử ban đầu; trừ tồn nguyên tử và lưu đơn trong transaction. Mỗi userId/Idempotency-Key là duy nhất; cùng khóa, cùng payload trả lại đơn cũ; cùng khóa khác payload trả 409.
- Chọn cấu hình phí vận chuyển và giảm giá trong lần triển khai tuần 9; hợp đồng không cho phép client tự quyết định hai trường này.

Response tạo mới: HTTP 201; gửi lại khóa hợp lệ: HTTP 200. Cùng cấu trúc:

```json
{
  "success": true,
  "data": {
    "order": {
      "id": "<ObjectId đơn>", "orderCode": "<mã duy nhất>", "source": "checkout",
      "status": "pending", "paymentMethod": "cod", "paymentStatus": "unpaid",
      "items": [{ "productId": "<ObjectId sản phẩm>", "sku": "VT-SK190-BLK", "productName": "<tên snapshot>", "variantName": "<biến thể>", "unitPrice": 105000, "quantity": 2, "lineTotal": 210000 }],
      "subtotal": 210000, "shippingFee": 30000, "discount": 0, "total": 240000
    },
    "replayed": false
  }
}
```

Số tiền trên là ví dụ cấu trúc, không phải cam kết phí ship. Response thực tế cần thêm customer, shippingAddress, customerNote, createdAt và các snapshot ảnh phục vụ trang chi tiết.

## Trang thành công và Đơn của tôi

Sau 201/200 đã xác nhận đơn, client chuyển đến `/orders/:orderId/success` và xóa các dòng đã được server chấp nhận. Không xóa giỏ khi timeout hoặc lỗi. Tải lại trang thành công phải đọc đơn qua API, không tin dữ liệu URL/localStorage.

- `GET /api/customer/orders?page=1&limit=10`: cookie khách hàng; chỉ đơn userId hiện tại, source=checkout; pagination `{page,limit,total,totalPages}`.
- `GET /api/customer/orders/:orderId`: chỉ đơn của chính khách hàng; không tồn tại hoặc thuộc người khác đều trả 404. Không trả adminNote hoặc thông tin quản trị nội bộ.
- Danh sách `/my-orders` và chi tiết `/my-orders/:orderId` phải có loading, rỗng, lỗi và thử lại; kiểm tra login khi phiên hết hạn.

## Lỗi và kiểm thử bắt buộc khi triển khai

Envelope lỗi: `{ "success": false, "error": { "code": "OUT_OF_STOCK", "message": "..." } }`.

| HTTP | Code dự kiến | Xử lý phía client |
|---|---|---|
| 400 | VALIDATION_ERROR / UNSUPPORTED_PAYMENT_METHOD | Hiển thị lỗi trường và giữ giỏ |
| 401 | UNAUTHENTICATED | Đăng nhập lại; giữ giỏ |
| 404 | ORDER_NOT_FOUND | Không hiển thị dữ liệu đơn |
| 409 | OUT_OF_STOCK / PRODUCT_UNAVAILABLE / IDEMPOTENCY_CONFLICT | Yêu cầu kiểm tra lại, giữ giỏ |
| 503 | CHECKOUT_UNAVAILABLE | Cho phép gửi lại cùng khóa |

Kiểm thử giá giả từ client, sản phẩm ẩn, SKU không thuộc sản phẩm, hai yêu cầu tranh SKU cuối, gửi trùng, lỗi giữa trừ tồn và tạo đơn, phân quyền đơn, timeout gửi lại và hoàn tồn khi hủy đúng một lần. Các kiểm thử này thuộc lần triển khai tạo đơn, chưa được công bố đạt ở tuần 7.
