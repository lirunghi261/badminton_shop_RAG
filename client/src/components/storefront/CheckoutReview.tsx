import { EditOutlined, InfoCircleOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Descriptions } from "antd";
import type { CheckoutFormValues } from "./CheckoutCustomerForm";

interface CheckoutReviewProps { values: CheckoutFormValues; onEdit?: () => void; onConfirm: () => void; submitting?: boolean; error?: string; locked?: boolean; }

export function CheckoutReview({ values, onEdit, onConfirm, submitting = false, error, locked = false }: CheckoutReviewProps) {
  return (
    <div className="store-checkout-review">
      <Card className="store-checkout-card" title="Xác nhận thông tin" extra={<Button type="link" icon={<EditOutlined />} onClick={onEdit} disabled={locked || submitting}>Sửa thông tin</Button>}>
        <Descriptions column={1} size="small">
          <Descriptions.Item label="Người nhận">{values.fullName}</Descriptions.Item>
          <Descriptions.Item label="Số điện thoại">{values.phone}</Descriptions.Item>
          {values.email && <Descriptions.Item label="Email">{values.email}</Descriptions.Item>}
          <Descriptions.Item label="Địa chỉ">{values.address}</Descriptions.Item>
          <Descriptions.Item label="Thanh toán">{values.paymentMethod === "cod" ? "Thanh toán khi nhận hàng" : "Chuyển khoản ngân hàng"}</Descriptions.Item>
          {values.note && <Descriptions.Item label="Ghi chú">{values.note}</Descriptions.Item>}
        </Descriptions>
      </Card>
      {error ? <Alert className="store-checkout-contract-notice" type="error" showIcon message="Không thể tạo đơn hàng" description={error} /> : <Alert className="store-checkout-contract-notice" type="info" showIcon icon={<InfoCircleOutlined />} message="Sẵn sàng tạo đơn hàng" description="Giá và tồn kho sẽ được kiểm tra lại lần cuối khi xác nhận." />}
      <Button className="store-checkout-next" type="primary" size="large" loading={submitting} onClick={onConfirm}>Xác nhận đặt hàng</Button>
    </div>
  );
}
