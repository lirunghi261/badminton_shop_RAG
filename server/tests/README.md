# Kiểm thử yêu cầu tuần 01 đến 04

Chạy từ thư mục gốc: `npm run test:weeks-01-04 -w server`.

Bộ kiểm thử dùng `MONGODB_URI` trong `server/.env`, nhưng luôn chọn database riêng có tiền tố `codex_audit_w01_w04_` và kiểm tra tên database trước khi ghi hoặc dọn dữ liệu. Cần tài khoản MongoDB cho phép tạo và ghi vào database thử nghiệm. Không dùng database chứa dữ liệu demo.

Test khởi tạo tài khoản và JWT secret riêng, mở API trên cổng tạm, kiểm tra auth, CRUD, cập nhật từng phần, trạng thái danh mục/thương hiệu, metadata RAG và upload ảnh. Sau khi chạy, test xóa database tạm hoặc dọn toàn bộ bản ghi nếu tài khoản không có quyền dropDatabase. Các collection rỗng có thể được giữ lại.

Kết quả JSON lưu trong `.tmp_baocao/audit_weeks_01_04_results.json`. Tiến trình trả mã lỗi nếu có ca không đạt. Bộ này kiểm thử API/backend; không thay thế kiểm thử toàn bộ tương tác giao diện.
