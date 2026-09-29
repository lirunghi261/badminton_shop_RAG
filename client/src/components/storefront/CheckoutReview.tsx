import { EditOutlined, InfoCircleOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Descriptions } from "antd";
import type { CheckoutFormValues } from "./CheckoutCustomerForm";

interface CheckoutReviewProps { values: CheckoutFormValues; onEdit: () => void; }

export function CheckoutReview({ values, onEdit }: CheckoutReviewProps) {
  return (
    <div className="store-checkout-review">
      <Card className="store-checkout-card" title="Xác nhận thông tin" extra={<Button type="link" icon={<EditOutlined />} onClick={onEdit}>Sửa thông tin</Button>}>
        <Descriptions column={1} size="small">
          <Descriptions.Item label="Người nhận">{values.fullName}</Descriptions.Item>
          <Descriptions.Item label="Số điện thoại">{values.phone}</Descriptions.Item>
          {values.email && <Descriptions.Item label="Email">{values.email}</Descriptions.Item>}
          <Descriptions.Item label="Địa chỉ">{values.address}</Descriptions.Item>
          <Descriptions.Item label="Thanh toán">{values.paymentMethod === "cod" ? "Thanh toán khi nhận hàng" : "Chuyển khoản ngân hàng"}</Descriptions.Item>
          {values.note && <Descriptions.Item label="Ghi chú">{values.note}</Descriptions.Item>}
        </Descriptions>
      </Card>
      <Alert className="store-checkout-contract-notice" type="info" showIcon icon={<InfoCircleOutlined />} message="Chưa thể tạo đơn hàng" description="Backend chưa có API tạo đơn và thanh toán. Thông tin của bạn chỉ được giữ trong phiên checkout này, chưa được gửi hoặc lưu trữ." />
      <Button className="store-checkout-next" type="primary" size="large" disabled>Tạo đơn hàng</Button>
    </div>
  );
}
