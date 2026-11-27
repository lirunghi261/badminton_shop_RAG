# Minh chứng Tuần 11 Nguyễn Phát Khang

Ngày kiểm chứng 26/11/2026, dựa trên commit `c23c48b` và phần sửa bổ sung tại workspace.

## Kết quả

Đã hoàn thiện bảng đánh giá thủ công Top-k và kiểm thử liên kết UI cho trợ lý mua sắm. Trong phiên bản hiện tại, trợ lý đọc lại catalog, lọc sản phẩm còn hàng theo danh mục/thương hiệu/giá mở đầu và trả tối đa 3 kết quả. Mỗi kết quả dùng slug chuẩn để mở trang chi tiết; thao tác thêm vào giỏ kiểm tra lại sản phẩm, SKU, giá và tồn kho từ API.

Lỗi merge marker trong `AdvisorChatPanel` đã được loại bỏ. Nguồn catalog được truyền đầy đủ vào tin nhắn trợ lý để phần “Nguồn gợi ý sản phẩm” hiển thị đúng.

| Hạng mục | Minh chứng |
| --- | --- |
| Đánh giá Top-k | 8 ca hỏi mua thực tế M01–M08, kết quả 2 Correct, 4 Partial, 2 Fail. |
| Liên kết sản phẩm | Card gọi `paths.productDetail(product.slug)`; route `products/:slug` mở `ProductDetailPage`. |
| Dữ liệu cũ/hết hàng | Ranking loại `totalStock <= 0`; thêm vào giỏ đọc lại sản phẩm và kiểm tra SKU, tồn kho, giá trước khi thêm. |
| Nguồn trả lời | `reply.source` được lưu vào message và hiển thị tên catalog cùng mô tả đối chiếu. |
| Kiểm thử tự động | `npm run test:week-11` đạt 8/8 static contract checks. |
| Build/lint | Chạy lại `npm run build -w client` và `npm run lint -w client` sau khi sửa conflict. |

## Bảng đánh giá thủ công

| Mã | Câu hỏi rút gọn | Kết quả | Nhận xét |
| --- | --- | --- | --- |
| M01 | Yonex vợt dưới 1,5 triệu | Correct | Lọc đúng thương hiệu, danh mục, giá và còn hàng. |
| M02 | Vợt đánh đôi/phản tạt dưới 1,5 triệu | Partial | Chưa hiểu ý định lối chơi/phản tạt. |
| M03 | Yonex overgrip dưới 50 nghìn | Correct | Lọc đúng phụ kiện theo thương hiệu và giá. |
| M04 | Giày Yonex size 42 dưới 1,8 triệu | Partial | Size chưa tham gia ranking; chỉ được xác minh khi chọn SKU. |
| M05 | Aerosensa 30 còn hàng không? | Partial | Loại hàng hết tồn nhưng chưa giải thích chính xác SKU không khả dụng. |
| M06 | So sánh Mavis 350 và Aerosensa 30 | Partial | Chưa có chế độ trả lời so sánh chuyên biệt. |
| M07 | SKU XYZ-404 không tồn tại | Fail | Chưa có ngưỡng nhận diện exact SKU/tên, cần bổ sung confidence threshold. |
| M08 | Câu hỏi ngoài mua sắm | Fail | Chưa có bộ nhận diện intent ngoài phạm vi. |

## Giới hạn và việc nối tiếp

Đây là đánh giá đúng với prototype matcher hiện tại, chưa phải kết quả Vector Search/RAG. Vì chưa có endpoint retrieval trả danh sách ground-truth và chưa khởi động được catalog API/MongoDB Atlas trong phiên kiểm chứng, Hit@5 và Precision@5 được ghi là “chưa đo”. Bước tiếp theo là gắn requestId/topK vào endpoint retrieval, tạo tập query có nhãn, rồi chạy lại bảng metric và kiểm thử click bằng trình duyệt khi API hoạt động.

## Tệp đối chiếu

- [Kết quả static và manual](evidence/week11-khang-topk-ui-results.json)
- [Script kiểm tra có thể chạy lại](../scripts/week11-evaluate.mjs)
- [Hợp đồng RAG](contracts/rag-api.md)
