# Hợp đồng Retrieval và Chat

## Phạm vi và nguồn dữ liệu

Tuần 7 thống nhất cấu trúc giao tiếp; endpoint retrieval/chat thật triển khai ở các tuần 11–13. `/api/rag/preview` đang có chỉ xuất catalog, không phải embedding hoặc LLM. Bộ câu hỏi sơ bộ nằm tại `docs/rag/week06-questions.json`.

Luồng online: React → Express nhận diện ý định/điều kiện → embedding câu hỏi → Atlas Vector Search → lọc ứng viên hợp lệ → đọc Product Database theo productId/SKU → LLM tổng hợp → trả câu trả lời kèm nguồn.

Tài liệu embedding chỉ chứa nội dung ngữ nghĩa ổn định: tên, mô tả đã làm sạch, danh mục, thương hiệu, thông số có nguồn. Metadata gồm documentId, productId, slug, categoryId, brandId, contentVersion, embeddingModel, embeddingDimensions, sourceUrl và indexedAt. Không đưa giá/tồn vào nội dung dùng làm căn cứ chào bán. Export `buildRagText` hiện có giá/tồn phải được tách trước khi triển khai ingestion thật; tuần 7 chưa thay export preview thành pipeline mới.

Giá, tồn, ảnh và trạng thái bán đọc lại từ Product Database sau retrieval. Lọc active áp dụng cho cả sản phẩm, danh mục và thương hiệu. Điều kiện ngân sách, SKU, size và còn hàng phải khớp cùng một SKU; không ghép thuộc tính từ các SKU khác nhau.

## Retrieval

`POST /api/rag/retrieve`, body dự kiến:

```json
{ "query": "Tìm vớ Victor màu đen dưới 150 nghìn", "topK": 5, "filters": { "brandSlug": "victor", "maxPrice": 150000, "inStock": true } }
```

query trim 1–1000 ký tự; topK nguyên 1–10; bộ lọc cho phép categorySlug, brandSlug, minPrice, maxPrice, inStock, sku và thuộc tính theo danh mục. Server kiểm tra giá min ≤ max, thuộc tính hợp lệ, whitelist trường. Chỉ dùng filter client như điều kiện bổ sung; trạng thái bán bắt buộc do server áp dụng.

Response dự kiến:

```json
{
  "success": true,
  "data": {
    "requestId": "<UUID>",
    "candidates": [{
      "productId": "<ObjectId>", "slug": "vo-cau-long-victor-sk190", "name": "Vớ cầu lông Victor SK190",
      "score": 0.85, "documentIds": ["<documentId>"], "contentVersion": "<hash>",
      "path": "/products/vo-cau-long-victor-sk190", "sourceUrl": "<URL nguồn hoặc null>",
      "liveVariants": [{ "sku": "VT-SK190-BLK", "effectivePrice": 105000, "stock": 24 }]
    }],
    "missingFields": [], "needsClarification": false
  }
}
```

score và giá/tồn trên là ví dụ kiểu dữ liệu, không phải số đo retrieval. liveVariants chỉ gồm các SKU khớp điều kiện. Không dùng score làm bằng chứng về chất lượng hay công dụng sản phẩm.

## Chat

`POST /api/rag/chat`: `{ "message": "...", "history": [{ "role": "user", "content": "..." }] }`. message tối đa 1000 ký tự; history tối đa 6 lượt, mỗi lượt tối đa 1000 ký tự, chỉ role user/assistant. Không nhận system prompt từ client; không đưa dữ liệu cá nhân hoặc khóa API vào context.

Response dự kiến: `{success:true,data:{requestId,answer,citedProducts,needsClarification,missingFields}}`. citedProducts chứa productId, slug, path, name và liveVariants đã kiểm tra, cùng dạng retrieval. Khi không có nguồn phù hợp, citedProducts rỗng; hỏi lại khi thiếu ngân sách/size hoặc nói rõ không có dữ liệu. Không tạo productId, link, số liệu hoặc thuộc tính mới từ LLM.

Context truy xuất là dữ liệu không tin cậy, không được thực thi chỉ dẫn chứa trong mô tả. Server chỉ cho phép dẫn các sản phẩm đã xác thực, kiểm tra số liệu trong câu trả lời khớp snapshot vừa đọc và giới hạn rate/timeout. Không tái dùng giá/tồn từ lượt chat trước. Chọn lại SKU tại chi tiết và kiểm tra lại ở checkout.

## UI và lỗi

### Giỏ hàng từ AI Advisor (tuần 8)

- Gợi ý hiện tại vẫn dựa trên từ khóa. Khi khách mở bộ chọn phiên bản và khi bấm thêm vào giỏ, chatbot gọi `GET /api/products/:slug`. API chỉ trả sản phẩm đang bán với danh mục và thương hiệu đang hoạt động. Client đối chiếu ID sản phẩm, SKU, giá hiệu lực và số lượng trong giỏ với tồn kho vừa đọc.
- Nếu giá đổi, khách xem giá mới rồi xác nhận bằng cách bấm lại; nếu sản phẩm ngừng bán, SKU hết hàng hoặc giỏ đã đạt tồn kho, không thêm vào giỏ. Lỗi kết nối cũng không làm thay đổi giỏ.
- Cả khách vãng lai và khách đăng nhập dùng giỏ hiện có trên cùng trình duyệt, lưu bằng localStorage; không đồng bộ theo tài khoản. Mỗi lần thêm từ chatbot thêm một đơn vị của SKU được chọn. Dữ liệu này không giữ chỗ trong kho.
- Kiểm tra từ chatbot chỉ áp dụng cho SKU đang thêm, không rà soát toàn giỏ. Checkout hiện là bản xem trước. Việc kiểm tra toàn giỏ ngay trước đặt hàng và quyết định giá/tồn cuối cùng thuộc luồng Storefront/Backend, theo [hợp đồng checkout](checkout-api.md).

Đang chờ: khóa gửi trùng, có thể hủy request; lỗi provider/Atlas: hiện nút thử lại, không thay bằng câu trả lời giả. HTTP 400 validation; 429 rate limit; 503 provider/index chưa sẵn sàng; 504 timeout. Envelope giống API hiện có: `{success:false,error:{code,message}}`. Không lộ prompt nội bộ hoặc secret trong response/log.

Thẻ nguồn mở path được server trả về; không tự tạo URL từ văn bản answer. Phân biệt thiếu kết quả hợp lệ (200, candidates/citedProducts rỗng) với lỗi hạ tầng. Bộ test tương lai cần đo retrieval thật, kiểm tra trích dẫn, số liệu SKU, nguồn ẩn/xóa, dữ liệu thiếu, ngoài phạm vi, prompt injection và lỗi provider; tuần 7 chưa có số liệu chất lượng LLM.
