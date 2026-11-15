# Kết quả tuần 8 — phần Thiện và Dương

Đối chiếu báo cáo tuần 08/15 (16–22/11/2026). Đây là kết quả triển khai/kiểm thử của hai phần việc, không xác nhận hoàn thành toàn bộ tuần 8 hoặc phần giao diện của Khang. Báo cáo Word trên Drive chưa được chỉnh sửa.

| Thành viên / nhiệm vụ | Kết quả thực tế | Trạng thái |
|---|---|---|
| Thiện: kiểm thử register/login/refresh/logout customer, phân quyền | Kiểm thử API thật trên MongoDB riêng: email/phone, trùng tài khoản, cookie HttpOnly, hết hạn, khóa/xóa, chặn customer vào Admin và tráo cookie. Sửa race refresh bằng cập nhật có điều kiện; logout token cũ không thu hồi phiên mới | Đã triển khai và kiểm thử |
| Thiện: chốt API kiểm tra giá/tồn | `POST /api/checkout/check` đã triển khai; gộp SKU, đọc giá/tồn từ DB, lọc product/category/brand, trả giá cũ/vượt tồn/không khả dụng, tính subtotal, từ chối trường client tự quyết định | Đã triển khai backend và hợp đồng; UI chưa nối |
| Dương: schema tài liệu RAG | Schema Zod strict v1, builder một document/product, định danh và nguồn khớp, preview kèm document, mẫu JSON sinh từ builder | Đã triển khai và kiểm thử |
| Dương: phiên bản nội dung | SHA-256 trên nội dung chuẩn hóa và tham chiếu; tách dữ liệu động, ổn định khi giá/tồn/ảnh đổi, đổi hash khi nội dung hoặc tham chiếu đổi | Đã triển khai và kiểm thử |
| Dương: quy tắc active/inactive | Tài liệu quy tắc đầy đủ và planner upsert/deactivate/noop từ toàn bộ catalog; có CLI xuất kế hoạch; kiểm tra draft/xóa mềm/inactive và active lại ở cả product/category/brand | Đã chốt quy tắc và kiểm thử planner; chưa có worker/vector index thật |

## Minh chứng và cách chạy

- [Kết quả kiểm thử máy đọc được](evidence/week08-api-results.json): **83/83 đạt**, gồm dọn dữ liệu thử, chạy trên database `codex_audit_w08_*` độc lập. Tài khoản Atlas không cho dropDatabase, nên xóa toàn bộ document trong đúng database thử đã xác minh; database/collection rỗng có thể còn tồn tại.
- [Document RAG mẫu](evidence/week08-rag-document.example.json): dữ liệu tổng hợp dùng kiểm thử, không phải kết quả embedding.
- [Hợp đồng checkout](contracts/checkout-api.md): phân biệt API kiểm tra đã triển khai với API tạo đơn tuần 9.
- [Schema, phiên bản và đồng bộ RAG](rag/week08-document-sync.md): thiết kế, quy tắc và giới hạn triển khai.
- Kiểm thử: `npm run test:week-08` từ thư mục gốc; cần MongoDB trong server/.env với quyền ghi database thử. Các test tự tạo tài khoản/catalog riêng và dọn dữ liệu, không dùng hoặc sửa dữ liệu cửa hàng.
- `npm run lint` và `npm run build`: đạt trên server/client.
- CLI `planRagSync.ts`: đọc catalog hiện tại, xuất **31 document**; chạy lại với snapshot trước trả **0 action khác noop**. Hai file kiểm tra nằm trong `.tmp_baocao/`, không ghi database/vector index.

## Khó khăn và phạm vi còn lại

Giá/tồn trong localStorage có thể cũ ngay cả sau lần kiểm tra. API check không giữ chỗ; server tạo đơn ở tuần 9 phải đọc lại giá, trừ tồn nguyên tử và xử lý gửi trùng. Không sử dụng canCheckout làm bằng chứng đã giữ hàng. Cần Khang nối giao diện kiểm tra toàn giỏ và xử lý xác nhận giá thay đổi.

Logout xóa cookie và thu hồi refresh token hiện tại; access token bị sao chép trước logout còn hiệu lực tối đa 15 phút nếu tài khoản vẫn active. Khóa/xóa/đổi quyền được kiểm tra lại trong middleware ở mỗi request. Mỗi tài khoản hiện lưu một refreshTokenHash, nên đăng nhập mới thay phiên refresh cũ. Chưa công bố hỗ trợ nhiều phiên đăng nhập độc lập.

RAG tuần 8 hoàn thiện schema/version/quy tắc và planner đối soát; chưa tự ghi vector hay chạy worker sau cập nhật Admin. Embedding, retrieval và LLM thật thuộc các tuần sau. Chưa có minh chứng kiểm thử trình duyệt hoặc ảnh/video mới cho phạm vi này. Dùng commit chứa tài liệu này làm mốc mã nguồn và minh chứng khi bổ sung báo cáo; chưa tạo PR.
