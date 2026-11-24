import { ArrowLeftOutlined, PictureOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Card, Descriptions, List, Skeleton, Typography } from "antd";
import { Link, Navigate, useParams } from "react-router-dom";
import { getCustomerOrder } from "../../api/storefront/orders.api";
import { CustomerOrderStatusTag } from "../../components/storefront/CustomerOrderStatus";
import { formatCurrency } from "../../components/storefront/productPresentation";
import { paths } from "../../routes/paths";

export function MyOrderDetailPage() {
  const { orderId = "" } = useParams();
  const orderQuery = useQuery({ queryKey: ["customer-orders", orderId], queryFn: () => getCustomerOrder(orderId), enabled: Boolean(orderId), retry: false });
  if (orderQuery.isError) return <Navigate to={paths.myOrders} replace />;
  if (orderQuery.isPending) return <section className="store-account-page"><div className="store-container"><Skeleton active /></div></section>;
  const order = orderQuery.data;
  if (!order) return null;
  return <section className="store-account-page"><div className="store-container">
    <Link className="store-back-link" to={paths.myOrders}><ArrowLeftOutlined /> Đơn hàng của tôi</Link>
    <header className="store-account-heading"><span className="eyebrow">{order.orderCode}</span><h1>Chi tiết đơn hàng</h1><p>Đặt lúc {new Date(order.createdAt).toLocaleString("vi-VN")} · <CustomerOrderStatusTag status={order.status} /></p></header>
    <Card title="Sản phẩm"><List dataSource={order.items} renderItem={(item) => <List.Item>
      <List.Item.Meta avatar={<div className="store-checkout-summary-image">{item.imageUrl ? <img src={item.imageUrl} alt="" /> : <PictureOutlined />}</div>} title={item.productName} description={`${item.variantName || item.sku} · SL: ${item.quantity}`} />
      <Typography.Text strong>{formatCurrency(item.lineTotal)}</Typography.Text>
    </List.Item>} />
      <div className="store-checkout-summary-total"><span>Tổng thanh toán</span><strong>{formatCurrency(order.total)}</strong></div>
    </Card>
    <Card title="Giao nhận & thanh toán" style={{ marginTop: 20 }}><Descriptions column={1} size="small">
      <Descriptions.Item label="Người nhận">{order.customer.fullName}</Descriptions.Item><Descriptions.Item label="Số điện thoại">{order.customer.phone}</Descriptions.Item><Descriptions.Item label="Địa chỉ">{order.shippingAddress.addressLine}</Descriptions.Item><Descriptions.Item label="Thanh toán">Thanh toán khi nhận hàng</Descriptions.Item><Descriptions.Item label="Trạng thái thanh toán">{order.paymentStatus === "paid" ? "Đã thanh toán" : "Chưa thanh toán"}</Descriptions.Item>{order.customerNote && <Descriptions.Item label="Ghi chú">{order.customerNote}</Descriptions.Item>}
    </Descriptions></Card>
  </div></section>;
}
