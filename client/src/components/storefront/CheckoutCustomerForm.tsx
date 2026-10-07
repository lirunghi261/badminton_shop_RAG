import { BankOutlined, PhoneOutlined, TruckOutlined } from "@ant-design/icons";
import { Button, Card, Col, Form, Input, Radio, Row } from "antd";

export interface CheckoutFormValues {
  fullName: string;
  phone: string;
  email?: string;
  address: string;
  note?: string;
  paymentMethod: "cod" | "bank-transfer";
}

interface CheckoutCustomerFormProps { onFinish: (values: CheckoutFormValues) => void; initialValues?: CheckoutFormValues; }

export function CheckoutCustomerForm({ onFinish, initialValues }: CheckoutCustomerFormProps) {
  return (
    <Form<CheckoutFormValues> className="store-checkout-form" layout="vertical" initialValues={initialValues ?? { paymentMethod: "cod" }} onFinish={onFinish}>
      <Card className="store-checkout-card" title="Thông tin giao nhận">
        <Row gutter={[16, 0]}>
          <Col xs={24} md={12}><Form.Item label="Họ và tên" name="fullName" rules={[{ required: true, message: "Vui lòng nhập họ và tên" }, { max: 100, message: "Họ tên tối đa 100 ký tự" }]}><Input name="fullName" autoComplete="name" placeholder="Nguyễn Văn A" /></Form.Item></Col>
          <Col xs={24} md={12}><Form.Item label="Số điện thoại" name="phone" rules={[{ required: true, message: "Vui lòng nhập số điện thoại" }, { pattern: /^(0|\+84)[0-9]{9,10}$/, message: "Số điện thoại chưa đúng định dạng" }]}><Input name="phone" type="tel" inputMode="tel" autoComplete="tel" prefix={<PhoneOutlined aria-hidden="true" />} placeholder="0901 234 567" /></Form.Item></Col>
          <Col xs={24}><Form.Item label="Email (không bắt buộc)" name="email" rules={[{ type: "email", message: "Email chưa đúng định dạng" }]}><Input name="email" type="email" autoComplete="email" spellCheck={false} placeholder="email@example.com" /></Form.Item></Col>
          <Col xs={24}><Form.Item label="Địa chỉ nhận hàng" name="address" rules={[{ required: true, message: "Vui lòng nhập địa chỉ nhận hàng" }, { min: 10, message: "Địa chỉ cần tối thiểu 10 ký tự" }, { max: 300, message: "Địa chỉ tối đa 300 ký tự" }]}><Input.TextArea name="address" autoComplete="street-address" autoSize={{ minRows: 3, maxRows: 5 }} placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành phố" /></Form.Item></Col>
          <Col xs={24}><Form.Item label="Ghi chú cho cửa hàng (không bắt buộc)" name="note" rules={[{ max: 500, message: "Ghi chú tối đa 500 ký tự" }]}><Input.TextArea name="note" autoComplete="off" autoSize={{ minRows: 2, maxRows: 4 }} placeholder="Ví dụ: giao giờ hành chính…" /></Form.Item></Col>
        </Row>
      </Card>
      <Card className="store-checkout-card" title="Phương thức thanh toán">
        <Form.Item name="paymentMethod" noStyle>
          <Radio.Group className="store-payment-options" name="paymentMethod">
            <Radio value="cod"><span><TruckOutlined /><strong>Thanh toán khi nhận hàng</strong><small>Thanh toán cho nhân viên giao hàng.</small></span></Radio>
            <Radio value="bank-transfer"><span><BankOutlined /><strong>Chuyển khoản ngân hàng</strong><small>Thông tin thanh toán sẽ hiển thị sau khi đơn được tạo.</small></span></Radio>
          </Radio.Group>
        </Form.Item>
      </Card>
      <Button className="store-checkout-next" type="primary" htmlType="submit" size="large">Kiểm tra đơn hàng</Button>
    </Form>
  );
}
