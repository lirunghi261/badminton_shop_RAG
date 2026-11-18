# Kết quả tuần 8

Đối chiếu báo cáo tuần 08/15 (16–22/11/2026). Kết quả dưới đây bao gồm phần Thiện, Dương và giao diện của Khang được rà soát ngày 18/11/2026.

| Thành viên / nhiệm vụ | Kết quả thực tế | Trạng thái |
|---|---|---|
| Thiện: kiểm thử register/login/refresh/logout customer, phân quyền | Kiểm thử API thật trên MongoDB riêng: email/phone, trùng tài khoản, cookie HttpOnly, hết hạn, khóa/xóa, chặn customer vào Admin và tráo cookie. Sửa race refresh bằng cập nhật có điều kiện; logout token cũ không thu hồi phiên mới | Đã triển khai và kiểm thử |
| Thiện: chốt API kiểm tra giá/tồn | `POST /api/checkout/check` đã triển khai; gộp SKU, đọc giá/tồn từ DB, lọc product/category/brand, trả giá cũ/vượt tồn/không khả dụng, tính subtotal, từ chối trường client tự quyết định | Đã triển khai và kiểm thử |
| Khang: xác thực và giỏ localStorage | Rà soát commit `bb44cd0` và bổ sung xác nhận giá mới, xử lý lỗi mạng, kiểm tra lại trước bước xem lại đơn, chặn vòng lặp refresh. Giỏ cũ được chuẩn hóa và đồng bộ giữa các tab | Đã triển khai và kiểm thử giao diện với API mô phỏng |
| Dương: schema tài liệu RAG | Schema Zod strict v1, builder một document/product, định danh và nguồn khớp, preview kèm document, mẫu JSON sinh từ builder | Đã triển khai và kiểm thử |
| Dương: phiên bản nội dung | SHA-256 trên nội dung chuẩn hóa và tham chiếu; tách dữ liệu động, ổn định khi giá/tồn/ảnh đổi, đổi hash khi nội dung hoặc tham chiếu đổi | Đã triển khai và kiểm thử |
| Dương: quy tắc active/inactive | Tài liệu quy tắc đầy đủ và planner upsert/deactivate/noop từ toàn bộ catalog; có CLI xuất kế hoạch; kiểm tra draft/xóa mềm/inactive và active lại ở cả product/category/brand | Đã chốt quy tắc và kiểm thử planner; chưa có worker/vector index thật |

## Minh chứng và cách chạy

- [Kết quả kiểm thử máy đọc được](evidence/week08-api-results.json): **83/83 đạt**, gồm dọn dữ liệu thử, chạy trên database `codex_audit_w08_*` độc lập. Tài khoản Atlas không cho dropDatabase, nên xóa toàn bộ document trong đúng database thử đã xác minh; database/collection rỗng có thể còn tồn tại.
- [Kết quả Playwright Chromium](evidence/week08-storefront-results.json): **9/9 nhóm kịch bản đạt** trên bản giao diện cục bộ với API mô phỏng. Báo cáo Word kèm ảnh xác nhận giá mới, SKU hết hàng và hồ sơ khách hàng.
- [Document RAG mẫu](evidence/week08-rag-document.example.json): dữ liệu tổng hợp dùng kiểm thử, không phải kết quả embedding.
- [Hợp đồng checkout](contracts/checkout-api.md): phân biệt API kiểm tra đã triển khai với API tạo đơn tuần 9.
- [Schema, phiên bản và đồng bộ RAG](rag/week08-document-sync.md): thiết kế, quy tắc và giới hạn triển khai.
- Kiểm thử: `npm run test:week-08` từ thư mục gốc; cần MongoDB trong server/.env với quyền ghi database thử. Các test tự tạo tài khoản/catalog riêng và dọn dữ liệu, không dùng hoặc sửa dữ liệu cửa hàng.
- `npm run lint` và `npm run build`: đạt trên server/client.
- CLI `planRagSync.ts`: đọc catalog hiện tại, xuất **31 document**; chạy lại với snapshot trước trả **0 action khác noop**. Hai file kiểm tra nằm trong `.tmp_baocao/`, không ghi database/vector index.

## Khó khăn và phạm vi còn lại

Giá/tồn trong localStorage có thể cũ ngay cả sau lần kiểm tra. Giao diện kiểm tra lại trước khi khách xem lại đơn. API check không giữ chỗ. Server tạo đơn ở tuần 9 phải đọc lại giá, trừ tồn nguyên tử và xử lý gửi trùng.

Logout xóa cookie và thu hồi refresh token hiện tại; access token bị sao chép trước logout còn hiệu lực tối đa 15 phút nếu tài khoản vẫn active. Khóa/xóa/đổi quyền được kiểm tra lại trong middleware ở mỗi request. Mỗi tài khoản hiện lưu một refreshTokenHash, nên đăng nhập mới thay phiên refresh cũ. Chưa công bố hỗ trợ nhiều phiên đăng nhập độc lập.

RAG tuần 8 hoàn thiện schema, phiên bản, quy tắc và planner đối soát. Embedding, worker, retrieval và LLM thuộc các tuần sau. Các commit `1defbde` và `bb44cd0` là mốc nguồn trước lượt rà soát giao diện ngày 18/11/2026.
