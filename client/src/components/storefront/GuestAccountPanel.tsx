import { LockOutlined, ShoppingOutlined, UserOutlined } from "@ant-design/icons";
import { Alert, Card, Col, Row } from "antd";

export function GuestAccountPanel() {
  return (
    <div className="store-account-panel">
      <Alert type="info" showIcon message="Tài khoản khách hàng đang được kết nối với luồng xác thực chung." description="Bạn vẫn có thể xem sản phẩm và chuẩn bị giỏ hàng; lịch sử đơn sẽ xuất hiện tại đây khi API đơn hàng hoàn thiện." />
      <Row gutter={[20, 20]}>
        <Col xs={24} md={12}><Card><span className="store-account-icon"><UserOutlined /></span><h2>Thông tin tài khoản</h2><p>Đăng nhập bằng hệ thống xác thực chung để quản lý thông tin cá nhân một cách an toàn.</p><span className="store-account-state"><LockOutlined /> Dùng cookie httpOnly</span></Card></Col>
        <Col xs={24} md={12}><Card><span className="store-account-icon"><ShoppingOutlined /></span><h2>Lịch sử đơn hàng</h2><p>Danh sách đơn, trạng thái giao hàng và thanh toán sẽ hiển thị sau khi backend phát hành API đơn hàng.</p><span className="store-account-state">Đang chờ tích hợp</span></Card></Col>
      </Row>
    </div>
  );
}
