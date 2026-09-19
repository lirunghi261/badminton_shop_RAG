# Backend modules

Mỗi thư mục trong `modules` đại diện cho một feature nghiệp vụ độc lập.

Quy ước tên file:

```text
<feature>.model.ts       Mongoose model
<feature>.schemas.ts     Zod request schemas
<feature>.service.ts     Business logic và database operations
<feature>.controller.ts  HTTP handlers
<feature>.routes.ts      Express router
```

Khi thêm module:

1. Không import trực tiếp module khác nếu có thể đi qua service/interface rõ ràng.
2. Controller không chứa truy vấn MongoDB dài hoặc business logic.
3. Validate toàn bộ dữ liệu đầu vào trước khi sử dụng.
4. Dùng `asyncHandler` và `AppError` hiện có.
5. Mount router tại `server/src/app.ts` với prefix `/api` nhất quán.
6. Không đọc `process.env` trực tiếp; dùng `config/env.ts`.

