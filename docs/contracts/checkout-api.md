# Hợp đồng API checkout và đơn của tôi

## Phạm vi tuần 7

Các endpoint tạo đơn/đơn của tôi bên dưới là hợp đồng cho tuần 9, chưa triển khai. Tuần 8 đã triển khai riêng `POST /api/checkout/check` để kiểm tra giá/tồn toàn giỏ. Giao diện checkout hiện vẫn xem trước, chưa nối endpoint kiểm tra toàn giỏ. Không dùng đơn seed trong Admin làm minh chứng khách đã đặt hàng.

## Kiểm tra toàn giỏ — đã triển khai tuần 8

`POST /api/checkout/check`, JSON; dùng được cho khách vãng lai và khách đăng nhập. Giới hạn 60 request/phút/IP. Không tạo đơn, không giữ chỗ hay trừ tồn. Response đặt `Cache-Control: no-store`.

```json
{
  "items": [{
    "productId": "000000000000000000000001",
    "sku": "VT-SK190-BLK",
    "quantity": 2,
    "expectedUnitPrice": 105000
  }]
}
```

`items`: 1–50 dòng. `productId`: 24 ký tự hex; `sku`: trim, 1–100 ký tự, đối chiếu chính xác với SKU lưu trong DB; `quantity`: số nguyên 1–999 mỗi dòng. Dòng trùng productId/SKU được gộp trước kiểm tra tồn. `expectedUnitPrice` tùy chọn, số hữu hạn không âm, chỉ dùng phát hiện giá cũ. Từ chối trường lạ ở body/dòng, kể cả `unitPrice`, `subtotal`, `stock` do client tự gửi.

Response HTTP 200 khi body hợp lệ, kể cả có sản phẩm không mua được:

```json
{
  "success": true,
  "data": {
    "checkedAt": "2026-11-15T10:00:00.000Z",
    "canCheckout": true,
    "items": [{
      "productId": "000000000000000000000001", "sku": "VT-SK190-BLK",
      "quantity": 2, "unitPrice": 105000, "stock": 24,
      "lineTotal": 210000, "priceChanged": false, "issues": []
    }],
    "subtotal": 210000,
    "reservation": false
  }
}
```

Số liệu trên là ví dụ. Server chỉ lấy product/category/brand `active`, chưa xóa mềm; SKU phải thuộc đúng sản phẩm. Giá thường = `variant.price ?? product.basePrice`; giá khuyến mãi = `variant.salePrice ?? product.salePrice ?? giá thường`; giá hiệu lực là giá nhỏ hơn giữa hai giá, giữ giá 0 hợp lệ. Đọc giá/tồn hiện tại từ MongoDB, không dùng giá trình duyệt tính tiền.

`issues` có thể gồm `PRODUCT_UNAVAILABLE`, `SKU_UNAVAILABLE`, `OUT_OF_STOCK`, `PRICE_CHANGED`. Khi sản phẩm/SKU không khả dụng, unitPrice/stock/lineTotal là null, subtotal toàn giỏ là null. Nếu mọi dòng có giá hợp lệ, subtotal gồm tổng tiền tất cả lượng yêu cầu, kể cả dòng vượt tồn; không phải tổng tiền đã được chấp nhận đặt hàng. `canCheckout` chỉ true khi mọi dòng không có issue. Giá đổi yêu cầu client hiển thị giá mới, người dùng xác nhận lại và kiểm tra lại; nếu không gửi expectedUnitPrice thì client vẫn phải hiển thị giá server trả về.

HTTP 400 `VALIDATION_ERROR`; HTTP 429 `TOO_MANY_REQUESTS`. Lỗi mạng/validation giữ nguyên giỏ. Giỏ localStorage có thể cũ sau mọi lần kiểm tra vì tồn kho không được giữ chỗ. Endpoint tuần 9 bắt buộc kiểm tra lại, tính tiền và trừ tồn nguyên tử; không tin `canCheckout` hoặc snapshot check trước đó. Ship/discount/total chưa thuộc endpoint này.

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
