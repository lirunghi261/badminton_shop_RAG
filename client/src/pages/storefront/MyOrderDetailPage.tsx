import { ArrowLeftOutlined, PictureOutlined } from "@ant-design/icons";
import { Card, Descriptions, List, Typography } from "antd";
import { Link, useParams } from "react-router-dom";
import { CustomerOrderStatusTag } from "../../components/storefront/CustomerOrderStatus";
import type { CustomerPaymentStatus } from "../../api/storefront/orders.api";
import { CustomerOrderView } from "../../components/storefront/CustomerOrderView";
import { formatCurrency } from "../../components/storefront/productPresentation";
import { paths } from "../../routes/paths";

const customerPaymentLabels: Record<CustomerPaymentStatus, string> = {
  unpaid: "Chưa thanh toán", pending: "Chờ thanh toán", paid: "Đã thanh toán",
  failed: "Thanh toán thất bại", refunded: "Đã hoàn tiền",
};

export function MyOrderDetailPage() {
  const { orderId = "" } = useParams();
  return <CustomerOrderView orderId={orderId}>{(order) => <section className="store-account-page"><div className="store-container">
    <Link className="store-back-link" to={paths.myOrders}><ArrowLeftOutlined /> Đơn hàng của tôi</Link>
    <header className="store-account-heading"><span className="eyebrow">{order.orderCode}</span><h1>Chi tiết đơn hàng</h1><p>Đặt lúc {new Date(order.createdAt).toLocaleString("vi-VN")} · <CustomerOrderStatusTag status={order.status} /></p></header>
    <Card title="Sản phẩm"><List dataSource={order.items} renderItem={(item) => <List.Item>
      <List.Item.Meta avatar={<div className="store-checkout-summary-image">{item.imageUrl ? <img src={item.imageUrl} alt="" /> : <PictureOutlined />}</div>} title={item.productName} description={`${item.variantName || item.sku} · SL: ${item.quantity}`} />
      <Typography.Text strong>{formatCurrency(item.lineTotal)}</Typography.Text>
    </List.Item>} />
      <div className="store-checkout-summary-total"><span>Tổng thanh toán</span><strong>{formatCurrency(order.total)}</strong></div>
    </Card>
    <Card title="Giao nhận & thanh toán" style={{ marginTop: 20 }}><Descriptions column={1} size="small">
      <Descriptions.Item label="Người nhận">{order.customer.fullName}</Descriptions.Item><Descriptions.Item label="Số điện thoại">{order.customer.phone}</Descriptions.Item><Descriptions.Item label="Địa chỉ">{order.shippingAddress.addressLine}</Descriptions.Item><Descriptions.Item label="Thanh toán">Thanh toán khi nhận hàng</Descriptions.Item><Descriptions.Item label="Trạng thái thanh toán">{customerPaymentLabels[order.paymentStatus]}</Descriptions.Item>{order.customerNote && <Descriptions.Item label="Ghi chú">{order.customerNote}</Descriptions.Item>}
    </Descriptions></Card>
  </div></section>}</CustomerOrderView>;
}
