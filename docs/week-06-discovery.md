# Tuần 6 Tìm kiếm và khám phá sản phẩm

Luồng tuần 6 gồm Trang chủ → danh sách → chi tiết → chọn SKU → thêm vào giỏ. Phần thanh toán tạo đơn và hệ thống embedding/LLM thực tế thuộc các mốc tiếp theo.

## Quy tắc API và giao diện

- API công khai chỉ trả sản phẩm active, chưa xóa, thuộc danh mục và thương hiệu còn hoạt động. Chi tiết cũng áp dụng cùng điều kiện.
- Tìm kiếm theo tên hoặc SKU; ký tự đặc biệt được hiểu như văn bản.
- Giá bắt đầu là giá thấp nhất trong các SKU, cùng quy tắc với thẻ sản phẩm: giá SKU hoặc giá gốc, khuyến mãi SKU hoặc khuyến mãi sản phẩm, lấy giá thấp hơn giá thường. Giá khuyến mãi bằng 0 vẫn hợp lệ.
- Khoảng giá và sắp xếp sử dụng giá bắt đầu. Khoảng giá không có nghĩa mọi SKU của sản phẩm đều nằm trong khoảng; khách xem giá cụ thể khi chọn SKU. Nếu cần chỉ xem hàng có sẵn, dùng thêm bộ lọc còn hàng.
- Các thuộc tính biến thể chọn đồng thời phải thuộc cùng một SKU. Khi bật còn hàng, SKU khớp thuộc tính cũng phải còn hàng.
- Phân trang có thứ tự phụ theo ID để tránh trùng hoặc mất sản phẩm khi giá hoặc thời gian tạo bằng nhau. Đổi bộ lọc đặt lại trang đầu; chọn trang giữ số trang trong URL.
- Chi tiết phân biệt sản phẩm không tồn tại với lỗi kết nối/server; lỗi tải có nút thử lại.
- Chọn SKU cập nhật ảnh, giá, tồn và đặt lại số lượng. Giỏ lưu đúng SKU được chọn. Giá và tồn lưu trong giỏ cần được server kiểm tra lại khi triển khai tạo đơn.

## Kiểm chứng

`npm run test:weeks-01-04 -w server` chạy bộ hồi quy nền tảng và các tình huống tuần 5–6 trên database kiểm thử tách biệt, sau đó dọn dữ liệu thử. Nhóm tuần 6 kiểm tra giá theo SKU, giảm giá bằng 0, kế thừa giá, phân trang, tìm SKU, ký tự đặc biệt, hàng hết, lọc nhiều thuộc tính cùng SKU và dữ liệu truy vấn không hợp lệ.

Kiểm tra trình duyệt bao gồm chuyển trang và tải lại URL, thay bộ lọc, tìm SKU, chọn biến thể, số lượng/giá trong giỏ, kết quả rỗng, lỗi 404, lỗi server và thử lại, trạng thái chờ tải, danh sách và chi tiết ở chiều rộng điện thoại 390px. Minh chứng hình và bảng kết quả nằm trong báo cáo tuần 6.

## Chuẩn bị câu hỏi RAG

[Bộ câu hỏi sơ bộ](rag/week06-questions.json) có nhóm tìm tên/SKU, nhu cầu/ngân sách, so sánh, hết hàng, thiếu dữ liệu, không có kết quả và ngoài phạm vi. Nguồn sản phẩm có productId, slug, đường dẫn và URL gốc nếu catalog có lưu. Các câu hỏi này dùng chuẩn bị thực nghiệm; chưa công bố độ chính xác retrieval hoặc LLM.
