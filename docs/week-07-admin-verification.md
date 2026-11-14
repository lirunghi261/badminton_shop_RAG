# Tuần 7 Dashboard người dùng và đơn hàng quản trị

## Kết quả

Đã kiểm thử API trên database riêng và kiểm tra giao diện Admin. Bộ dữ liệu đơn mẫu chỉ dùng kiểm tra quản trị, không chứng minh luồng khách tạo đơn.

| Nhóm | Kết quả đã kiểm chứng |
|---|---|
| Phân quyền | Khách chưa đăng nhập và phiên customer không đọc được dashboard, users, orders Admin |
| Người dùng | Chặn tự khóa/hạ quyền/xóa; chặn xóa, hạ quyền, khóa admin cuối; hai cập nhật đồng thời vẫn giữ một admin active |
| Khóa/xóa | Phiên customer đang có bị từ chối sau khi khóa; refresh không hoạt động; xóa mềm không còn hiện trong danh sách/chi tiết |
| Bảo mật dữ liệu | Response users không có password hoặc refreshTokenHash |
| Dashboard | Đếm đúng sản phẩm, khách chưa xóa, hàng active sắp hết; loại đơn mẫu khỏi số đơn và doanh thu |
| Trạng thái | Ma trận đầy đủ đơn/thanh toán gồm cả gửi lại cùng trạng thái; lịch sử chỉ thêm khi thay đổi hợp lệ |
| Nhất quán | COD hoàn tất ghi thanh toán và hai lịch sử nguyên tử; cập nhật đồng thời không ghi đè chuỗi lịch sử |
| Truy vấn | Tìm mã đơn, pagination, ID sai/không có và khoảng ngày đảo ngược được xử lý |
| Giao diện | Dashboard, người dùng, tìm đơn mẫu, nhãn mẫu, chi tiết, lịch sử, kết quả rỗng và chuyển đến login khi chưa đăng nhập |

Chạy `npm run test:week-07 -w server`. Script tạo database có tiền tố `codex_audit_w07_`, không sửa user/đơn demo chính, dọn dữ liệu thử sau khi chạy. Bảo vệ admin cuối dùng transaction và một bản ghi khóa chung, cần MongoDB hỗ trợ transaction như Atlas/replica set.

## Ma trận trạng thái đơn

✓ là chuyển được; = là gửi lại không thêm lịch sử; — là bị chặn. Hủy cần lý do. Hoàn tất chuyển khoản cần đã trả tiền; hoàn tất COD không được nhận đơn đã hoàn tiền.

| Từ / đến | pending | confirmed | processing | shipping | completed | cancelled |
|---|---|---|---|---|---|---|
| pending | = | ✓ | — | — | — | ✓ |
| confirmed | — | = | ✓ | — | — | ✓ |
| processing | — | — | = | ✓ | — | ✓ |
| shipping | — | — | — | = | ✓ | — |
| completed | — | — | — | — | = | — |
| cancelled | — | — | — | — | — | = |

## Ma trận thanh toán

| Từ / đến | unpaid | pending | paid | failed | refunded |
|---|---|---|---|---|---|
| unpaid | = | ✓ | ✓ | ✓ | — |
| pending | — | = | ✓ | ✓ | — |
| paid | — | — | = | — | ✓ |
| failed | — | ✓ | ✓ | = | — |
| refunded | — | — | — | — | = |

Điều kiện bổ sung: đơn đã hủy không được nhận thanh toán paid; chỉ hoàn tiền sau khi đơn đã hủy hoặc hoàn tất. UI nhận danh sách trạng thái được phép từ server. Lịch sử lưu trạng thái cũ/mới, người sửa, thời điểm và ghi chú; không thêm bản ghi khi request bị từ chối.

## Dữ liệu mẫu và doanh thu

Order có source `demo`, `checkout` hoặc `legacy`. Đơn cũ mã `DH-DEMO-...` luôn được xem là mẫu kể cả chưa chạy lại seed. Dashboard loại cả source=demo và mã tiền tố mẫu khỏi số đơn/doanh thu. Doanh thu chỉ cộng đơn completed+paid, vì vậy đơn refunded/cancelled không được cộng. Đơn legacy là dữ liệu chưa xác định nguồn, không tự được chứng nhận là đơn khách đặt thật.

## Hợp đồng cho giai đoạn tiếp theo

- [Checkout và Đơn của tôi](contracts/checkout-api.md): request/response, xác thực, idempotency, kiểm tra SKU/giá/tồn, thành công và xử lý lỗi. Chưa triển khai endpoint tạo đơn.
- [Retrieval và chat](contracts/rag-api.md): metadata ngữ nghĩa, đọc lại SKU/giá/tồn, nguồn, clarification và lỗi provider. Chưa triển khai endpoint embedding/LLM.

Tuần 8 kiểm thử tài khoản khách hàng, giỏ và hợp đồng kiểm tra giá/tồn. Tạo đơn COD, cạnh tranh tồn và hoàn tồn đúng một lần khi hủy cần triển khai/kiểm thử ở tuần 9. Không cộng chức năng tạo đơn vào mức hoàn thành tuần 7.
