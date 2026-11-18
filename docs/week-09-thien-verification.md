# Minh chứng Tuần 09 Nguyễn Ngọc Thiện

**Nguyễn Ngọc Thiện – 24TX810071** phụ trách backend tạo đơn COD, tính tiền tại server, chống tạo đơn trùng, trừ tồn SKU nguyên tử và hoàn tồn khi hủy. Phần API đọc đơn áp dụng điều kiện chủ sở hữu để nghiệm thu lịch sử đơn hàng.

## Kết quả kiểm thử backend

Kiểm thử gọi HTTP vào Express và đọc lại dữ liệu trên MongoDB replica set cục bộ với dữ liệu thử độc lập.

| Kịch bản | Kết quả quan sát |
| --- | --- |
| Xác thực, giá và mặt hàng | Từ chối khách chưa đăng nhập, dữ liệu giá do client tự gửi, chuyển khoản và SKU không còn bán. Server dùng giá hiện hành, kể cả giá khuyến mãi bằng 0. |
| Hai yêu cầu trùng khóa | Cùng nội dung nhận HTTP 201 và 200 với cùng mã định danh đơn. Tồn chỉ giảm một lần. Cùng khóa nhưng đổi nội dung trả HTTP 409. Hai khách có thể dùng cùng một giá trị khóa cho các đơn riêng. |
| Hai khách tranh SKU cuối | Với tồn ban đầu là 1, một yêu cầu nhận HTTP 201, yêu cầu còn lại nhận HTTP 409 `OUT_OF_STOCK`. Tồn cuối bằng 0. |
| Hủy đồng thời trên Admin | Sau hai yêu cầu hủy, tồn của SKU trên trở về 1 và lịch sử chỉ có một lần chuyển sang `cancelled`. |
| Lỗi giữa các thao tác ghi | Khi bước trừ SKU thứ hai thất bại, transaction hủy đơn mới và hoàn tác bước trừ SKU thứ nhất. Khi thiếu SKU để hoàn tồn, transaction giữ trạng thái đơn và số tồn của SKU còn lại. |
| Đọc đơn và phân quyền | Admin đọc được đơn `source=checkout`. Chủ đơn đọc được đơn qua API khách. Khách khác nhận HTTP 404 và danh sách chỉ chứa đơn của chính họ. Ghi chú Admin và khóa nội bộ không xuất hiện trong dữ liệu trả cho khách. |

Bộ kiểm thử Tuần 09 đạt 5 nhóm ca. Bộ hồi quy Admin Tuần 07 đạt 157/157 lượt kiểm tra. TypeScript build và lint đều đạt.

## Chạy lại

Trỏ `TEST_MONGODB_URI` đến một MongoDB replica set dành cho kiểm thử. Bộ kiểm thử tạo database riêng với tiền tố `test_week09_` và dọn database sau khi chạy.

```powershell
$env:TEST_MONGODB_URI = 'mongodb://127.0.0.1:27017/?replicaSet=rs0'
npm run test:week-09 --workspace server
```

- [Bộ kiểm thử tích hợp Tuần 09](../server/tests/week-09.integration.mjs)
- [Hợp đồng API COD và Đơn của tôi](contracts/checkout-api.md)
- [Đối chiếu kế hoạch 15 tuần trên Drive](https://drive.google.com/file/d/1hY_w7xwVt9CdzQynzEsW_g_B8xuFIlNo/view)

Mức kiểm chứng là backend qua HTTP và MongoDB. Luồng thao tác từ giao diện Storefront sẽ được nghiệm thu sau khi nối checkout với API. Bản COD hiện áp dụng phí vận chuyển và giảm giá bằng 0.
