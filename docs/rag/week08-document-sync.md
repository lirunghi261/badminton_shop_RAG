# Tài liệu RAG và đồng bộ — tuần 8, phần Dương

Đã triển khai schema Zod, builder tài liệu ngữ nghĩa và hàm lập kế hoạch đồng bộ thuần trong `server/src/modules/rag/rag-document.ts`. `/api/rag/preview` trả thêm document hợp lệ cho mỗi sản phẩm (tối đa 3 sản phẩm); preview không được dùng làm đầu vào đối soát toàn bộ dữ liệu. Chưa có ingestion worker, collection vector hoặc embedding/LLM thật.

## Schema v1

Mỗi sản phẩm có một tài liệu. Tất cả các trường dưới đây bắt buộc; chỉ ba trường embedding được null. Từ chối trường lạ, định danh/nguồn không khớp và contentVersion sai.

| Trường | Kiểu / ràng buộc |
|---|---|
| schemaVersion | literal 1 |
| documentId | `product:<productId>`, khóa duy nhất để upsert |
| productId, categoryId, brandId | chuỗi ObjectId 24 ký tự hex thường |
| slug | chuỗi không rỗng |
| sourceUrl | đường dẫn nội bộ `/products/<slug>`, phải khớp slug |
| content | văn bản ngữ nghĩa không rỗng, Unicode NFC |
| contentVersion | SHA-256, 64 ký tự hex thường |
| status | active hoặc inactive |
| embeddingModel | chuỗi không rỗng hoặc null |
| embeddingDimensions | số nguyên dương hoặc null |
| indexedAt | ISO UTC hoặc null |

Ba trường embedding phải cùng null hoặc cùng có giá trị. Tuần 8 builder luôn trả null, không nhận đã lập chỉ mục. Sau này chỉ ghi nhận metadata khi provider/index xác nhận thành công. Collection ingestion tương lai phải có unique index documentId; vector index phải lọc status và schema/model phù hợp.

Mẫu có thể tái tạo bằng `GET /api/rag/preview`: đọc `products[].document`. `docs/evidence/week08-rag-document.example.json` chứa document mẫu được sinh từ builder trong kiểm thử, không phải dữ liệu đã embedding.

## Quy tắc phiên bản

Hash UTF-8 của `JSON.stringify({schemaVersion:1,categoryId,brandId,content})`, đúng thứ tự khóa này. `content` lấy từ buildRagText rồi chuẩn hóa NFC. Mô tả đã bỏ HTML và gom khoảng trắng qua adapter catalog. Thông số sắp theo key, biến thể theo SKU, thuộc tính biến thể theo key trước khi dựng văn bản.

- Đổi tên, mô tả, tên thương hiệu/danh mục, thông số hoặc SKU/màu/thuộc tính: đổi contentVersion, cần embedding lại.
- Đổi categoryId/brandId: đổi contentVersion kể cả tên hiển thị giống nhau.
- Chỉ đổi giá, tồn kho, ảnh hoặc updatedAt: giữ contentVersion, không embedding lại. Không suy luận giá/tồn từ văn bản mô tả; các số liệu chào bán luôn đọc lại DB theo SKU.
- Đổi slug: cập nhật sourceUrl/metadata; không embedding lại nếu nội dung ngữ nghĩa không đổi.
- Đổi thuật toán chuẩn hóa/hash phải tăng schemaVersion và có migration/reindex có chủ đích.

## Đồng bộ active/inactive

`planRagSync(fullPublicCatalog, previousDocuments)` trả documents và actions. Chạy lại cùng snapshot không phát sinh thao tác mới. Từ chối snapshot trùng documentId và hash sai. Đầu vào hiện tại phải là **toàn bộ** catalog public từ truy vấn thành công, không phân trang/limit. Lỗi truy vấn/schema phải dừng kế hoạch; không được biến lỗi thành danh sách rỗng và vô hiệu hóa hàng loạt.

| Thay đổi | Action / yêu cầu |
|---|---|
| Sản phẩm public mới | upsert / new, requiresEmbedding=true |
| Nội dung thay đổi | upsert / content_changed, xóa metadata embedding cũ, cần embedding mới |
| Chỉ slug/nguồn thay đổi | upsert / metadata_changed, giữ embedding cùng phiên bản |
| Product draft/inactive/xóa mềm hoặc mất khỏi snapshot đầy đủ | deactivate / not_public, document inactive, xóa metadata embedding |
| Category/brand inactive/xóa mềm/mất tham chiếu | tất cả sản phẩm liên quan mất khỏi catalog public, deactivate như trên |
| Sản phẩm public trở lại, cả category/brand đã active | upsert / reactivated, cần embedding mới kể cả hash không đổi |
| Không thay đổi / đã inactive vẫn không public | noop / unchanged |
| Chỉ giá/tồn/ảnh/updatedAt thay đổi | noop; đọc lại DB lúc trả lời và trước đặt hàng |

Xóa cứng cũng được nhận diện bằng việc thiếu khỏi snapshot đầy đủ; giữ tombstone inactive để đối soát. Lý do not_public không phân biệt xóa với inactive vì nguồn catalog public cố ý không lộ tài liệu ẩn. Builder chỉ nhận sản phẩm từ adapter đã lọc; tự truyền sản phẩm ẩn vào builder sẽ không tự kiểm tra DB.

Lệnh đọc DB và xuất kế hoạch, **không ghi vào MongoDB/vector index**:

```powershell
cd server
npx tsx src/scripts/planRagSync.ts --output ../docs/evidence/rag-plan.json
npx tsx src/scripts/planRagSync.ts ../docs/evidence/rag-plan.json --output ../docs/evidence/rag-plan-next.json
```

Chạy với môi trường Node/server đã cấu hình `.env`; `--output` ghi UTF-8, tránh lỗi encoding do chuyển hướng PowerShell. Dùng tên đầu ra khác đầu vào. Script chỉ nhận object có documents array hợp lệ; chỉ xuất JSON khi toàn bộ truy vấn và validation thành công. Không lấy `actions` của lần trước làm dữ liệu gốc.

## Ràng buộc cho ingestion các tuần sau

Kế hoạch tuần 8 chỉ đối soát snapshot, chưa tự đồng bộ sau thao tác Admin. Worker tương lai phải tuần tự hóa một đợt đối soát, xử lý deactivate trước công bố kết quả mới, ghi vector theo documentId/contentVersion và bỏ kết quả embedding cũ nếu nguồn đã đổi. Chỉ xác nhận snapshot/indexedAt sau khi áp dụng thành công; lỗi thì retry có kiểm soát. Kế hoạch không có transaction bao trùm các collection nên có thể thấy thay đổi đồng thời; lượt kế tiếp đối soát lại. Retrieval phải lọc active trong index và đọc lại product/category/brand từ DB để loại kết quả cũ trước trả lời. Chưa công bố bảo đảm đồng bộ thời gian thực.

Kiểm chứng schema/hash, nội dung thay đổi, giá/tồn không đổi hash, inactive/reactivate của product/category/brand và idempotency: `npm run test:week-08 -w server`.
