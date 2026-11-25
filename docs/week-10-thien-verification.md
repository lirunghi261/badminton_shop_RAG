# Tuần 10 Nguyễn Ngọc Thiện

Đã rà soát nguồn dữ liệu tư vấn và xuất catalog từ MongoDB Atlas. Bản xuất có **31 sản phẩm công khai, 80 mã SKU, 8 danh mục và 5 thương hiệu**. Đối chiếu từng mã và đường dẫn với danh sách Storefront đều khớp.

Mỗi sản phẩm trong bản xuất có mã cố định và đường dẫn về trang chi tiết. Sản phẩm nháp, ngừng bán, đã xóa hoặc có danh mục hay thương hiệu ngừng hoạt động, bị xóa hoặc không còn tồn tại đều bị loại. Hai sản phẩm công khai đã hết hàng vẫn có trong bản dữ liệu để tra cứu thông tin. Khi tư vấn mua hàng, hệ thống cần đọc lại giá và số lượng hiện tại của từng SKU.

Một sản phẩm thiếu cả mô tả ngắn lẫn mô tả chi tiết là **Yonex Astrox 100ZZ VA** (`vot-cau-long-yonex-astrox-100zz-va`). Bản xuất giữ nguyên phần thiếu và vẫn cung cấp thông số từ catalog. Cả 31 sản phẩm có thông số và biến thể. Không phát hiện mã sản phẩm, slug hoặc SKU trùng trong bản đã kiểm tra.

## Xuất và đọc dữ liệu

Chạy ở thư mục gốc với `MONGODB_URI` đã cấu hình trong `server/.env` hoặc biến môi trường. Lệnh chỉ đọc MongoDB. Thư mục chứa file đầu ra cần tồn tại. Lệnh thay file đích sau khi truy vấn và kiểm tra định danh thành công.

```powershell
npm run catalog:export -- --output catalog.json
```

- `schemaVersion` là phiên bản cấu trúc. `datasetVersion` là SHA-256 của `JSON.stringify({ schemaVersion, products })`. Danh sách sắp theo `productId`, thông số và thuộc tính theo khóa, biến thể theo SKU.
- Dùng `productId` làm khóa ghép với dữ liệu đánh giá. Khi đổi slug, mã sản phẩm giữ nguyên, còn `slug`, `sourceUrl` và phiên bản bản xuất cập nhật. Nếu mã hoặc slug không hợp lệ hoặc bị trùng, lệnh dừng và giữ file xuất trước đó.
- Mỗi sản phẩm có tên, danh mục, thương hiệu, mô tả, thông số và các mã SKU kèm thuộc tính. Phần mô tả dùng dữ liệu chuẩn hóa sẵn của catalog. Trường giá, tồn kho và ảnh không có trong bản xuất. Dữ liệu thiếu được giữ theo nguồn để phục vụ việc chuẩn bị tài liệu và gắn nhãn đánh giá.

## Kiểm chứng

Hai lần đọc catalog Atlas cho cùng bản dữ liệu `d46831ff7a7c1a6d1faad60079e0ddb2d9fdf49fe7511e3080d844c08d7866b9`. Bộ kiểm thử cục bộ dùng MongoDB riêng, bao gồm điều kiện công khai, đường dẫn nguồn, thay đổi giá và tồn kho, đổi slug và trường hợp trùng định danh. Chạy lại với một địa chỉ MongoDB thử nghiệm:

```powershell
$env:TEST_MONGODB_URI = 'mongodb://127.0.0.1:27017'
npm run test:week-10 -w server
```
