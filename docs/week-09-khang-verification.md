# Minh chứng Tuần 09 Nguyễn Phát Khang

Ngày kiểm chứng 24/11/2026, dựa trên commit 95404c3 và phần sửa bổ sung tại workspace.

## Kết quả

Đã hoàn thiện checkout COD, trang thành công, xóa lượng đã đặt khỏi giỏ, danh sách và chi tiết đơn khách hàng. Kiểm thử hồi quy bằng Chromium đạt 8/8 nhóm ca với API mô phỏng. Kiểm thử qua Express và MongoDB replica set cục bộ đạt 7/7 nhóm ca.

| Yêu cầu | Minh chứng |
| --- | --- |
| Checkout nối API tạo đơn | Giao diện gửi đơn, MongoDB có đơn source=checkout, giá do server tính và tồn SKU giảm đúng. Admin đọc được đơn đã tạo. |
| Trang thành công | Sau xác nhận ở đúng đường dẫn trang thành công. Tải lại trang lấy đơn qua API. |
| Giỏ hàng sau đặt | Chỉ trừ lượng của sản phẩm đã đặt. Giữ sản phẩm khác và lượng cùng SKU được thêm từ tab khác khi đang gửi đơn. |
| Gửi lại sau lỗi mạng | Thử làm mất phản hồi sau khi server đã tạo đơn. Tải lại checkout và gửi lại nhận đơn cũ, số đơn và tồn kho giữ đúng. |
| Thông tin nhận hàng | Giữ nguyên yêu cầu khi chưa nhận kết quả. Khi server từ chối validation, cho phép sửa và tạo khóa mới. |
| Lịch sử và chi tiết | Đọc đúng đơn khách hàng, trạng thái processing và refunded có nhãn. API lỗi có thông báo và nút thử lại. |
| Phân quyền và phiên | Đổi từ khách A sang B không hiện cache đơn của A. Backend trả 404 khi B mở đơn của A. Phiên hết hạn chuyển về đăng nhập. |
| Di động | Kiểm tra lịch sử rỗng ở chiều rộng 390 px, không tràn ngang. |

Lint và build toàn dự án đạt.

## Tệp đối chiếu

- [Kết quả kiểm thử](evidence/week09-khang-storefront-results.json)
- [Hợp đồng checkout](contracts/checkout-api.md)

Các ca end-to-end chạy với dữ liệu thử riêng, gọi backend thật qua HTTP và kiểm tra lại MongoDB. Ca lỗi mạng làm mất phản hồi sau khi server đã xử lý để kiểm chứng gửi lại an toàn. Các ca hồi quy UI mô phỏng API để tạo lỗi và độ trễ có kiểm soát.
