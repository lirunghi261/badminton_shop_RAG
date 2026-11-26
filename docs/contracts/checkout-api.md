# Hợp đồng API checkout và đơn của tôi

## Phạm vi tuần 7

Backend tuần 9 đã triển khai API tạo đơn COD và API đọc đơn của khách. Storefront đã nối checkout, trang xác nhận, danh sách và chi tiết đơn. Đơn tạo từ checkout có `source=checkout`. Tuần 8 đã triển khai `POST /api/checkout/check` để kiểm tra giá/tồn toàn giỏ.

Storefront gọi API khi mở hoặc cập nhật giỏ, khi chuyển sang checkout, khi mở trực tiếp checkout và trước bước xem lại đơn.

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

Storefront giữ dòng hết hàng hoặc ngừng bán để khách xóa. Nếu SKU còn hàng nhưng tồn giảm, số lượng giảm về mức còn mua được. Cờ xác nhận giá mới được giữ qua tải lại và đồng bộ giữa các tab cho đến khi khách xác nhận. Sau xác nhận, thao tác tiếp tục vẫn kiểm tra server. Lỗi mạng giữ giỏ và hiển thị cách thử lại.

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
- Mỗi dòng có productId hợp lệ, SKU thuộc đúng sản phẩm và quantity nguyên từ 1 đến 999. Giới hạn 50 dòng. Server gộp các dòng trùng productId/SKU trước khi kiểm tra tồn và so sánh nội dung gửi lại. Body và các object lồng nhau từ chối trường ngoài hợp đồng.
- Chỉ nhận `cod` trong bản nghiệm thu tối thiểu. Tên phương thức chuyển khoản thống nhất là `bank_transfer`, thuộc phần mở rộng; giao diện xem trước hiện có lựa chọn này nhưng API tạo đơn COD phải từ chối phương thức chưa hỗ trợ.
- Server kiểm tra product/category/brand đang bán, đọc giá hiệu lực và tồn theo SKU. Bản COD này áp dụng phí vận chuyển và giảm giá bằng 0, nên tổng tiền bằng tiền hàng tính từ giá tại server.
- Tạo đơn với source=`checkout`, pending/unpaid, lịch sử ban đầu; trừ tồn nguyên tử và lưu đơn trong transaction. Mỗi userId/Idempotency-Key là duy nhất; cùng khóa, cùng payload trả lại đơn cũ; cùng khóa khác payload trả 409.
- Tạo đơn và hủy đơn có trừ tồn yêu cầu MongoDB hỗ trợ transaction (replica set hoặc cụm sharded). Khi admin hủy đơn COD đã trừ tồn, trạng thái hủy và hoàn tồn được ghi cùng transaction. Nếu SKU đã bị xóa hoặc đổi mã và không thể hoàn tồn, API trả 409 `RESTOCK_SKU_UNAVAILABLE`; cần khôi phục SKU trước khi hủy.

Response tạo mới: HTTP 201; gửi lại khóa hợp lệ: HTTP 200. Cùng cấu trúc:

```json
{
  "success": true,
  "data": {
    "order": {
      "id": "<ObjectId đơn>", "orderCode": "<mã duy nhất>", "source": "checkout",
      "status": "pending", "paymentMethod": "cod", "paymentStatus": "unpaid",
      "items": [{ "productId": "<ObjectId sản phẩm>", "sku": "VT-SK190-BLK", "productName": "<tên snapshot>", "variantName": "<biến thể>", "unitPrice": 105000, "quantity": 2, "lineTotal": 210000 }],
      "subtotal": 210000, "shippingFee": 0, "discount": 0, "total": 210000
    },
    "replayed": false
  }
}
```

Response còn có customer, shippingAddress, customerNote, createdAt, updatedAt và URL ảnh lưu theo từng dòng đơn.

## Trang thành công và Đơn của tôi

Sau HTTP 201/200, client chuyển đến `/order-success/:orderId` và trừ lượng đã đặt khỏi giỏ. Sản phẩm mới hoặc lượng được thêm trong lúc gửi đơn được giữ lại. Tải lại trang thành công đọc đơn qua API.

Client lưu yêu cầu đang chờ trong sessionStorage theo tài khoản, gồm nội dung gửi và Idempotency-Key. Sau lỗi mạng hoặc phản hồi chưa xác định, nút xác nhận gửi lại đúng nội dung và khóa, kể cả khi tải lại trang. Thông tin nhận hàng được khóa trong thời gian này. Khi server từ chối rõ ràng bằng validation hoặc lỗi hàng không khả dụng, client cho phép sửa thông tin và tạo yêu cầu mới với khóa mới. Giỏ được giữ khi xảy ra lỗi.

- `GET /api/customer/orders?page=1&limit=10`: cookie khách hàng; chỉ đơn userId hiện tại, source=checkout; pagination `{page,limit,total,totalPages}`. Giới hạn tối đa 50 đơn/trang.
- `GET /api/customer/orders/:orderId`: chỉ đơn của chính khách hàng; không tồn tại hoặc thuộc người khác đều trả 404. Không trả adminNote hoặc thông tin quản trị nội bộ.
- Danh sách `/account/orders` và chi tiết `/account/orders/:orderId` có loading, rỗng, lỗi và thử lại. Phiên hết hạn chuyển tới đăng nhập và ghi nhớ đường dẫn quay lại.
- Cache đơn tách theo tài khoản và loại dữ liệu riêng tư khi đăng xuất/đăng nhập. Trang thành công, danh sách và chi tiết xác thực chủ tài khoản qua API.

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
