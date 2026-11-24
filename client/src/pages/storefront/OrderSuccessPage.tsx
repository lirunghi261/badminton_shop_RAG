import { CheckCircleFilled } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Button, Result, Skeleton, Typography } from "antd";
import { Link, Navigate, useParams } from "react-router-dom";
import { getCustomerOrder } from "../../api/storefront/orders.api";
import { CustomerOrderStatusTag } from "../../components/storefront/CustomerOrderStatus";
import { paths } from "../../routes/paths";

export function OrderSuccessPage() {
  const { orderId = "" } = useParams();
  const orderQuery = useQuery({ queryKey: ["customer-orders", orderId], queryFn: () => getCustomerOrder(orderId), enabled: Boolean(orderId), retry: false });
  if (orderQuery.isError) return <Navigate to={paths.myOrders} replace />;
  if (orderQuery.isPending) return <section className="store-account-page"><div className="store-container"><Skeleton active /></div></section>;
  const order = orderQuery.data;
  if (!order) return null;
  return <section className="store-account-page"><div className="store-container"><Result icon={<CheckCircleFilled />} status="success" title="Đặt hàng thành công!" subTitle={`Mã đơn hàng của bạn là ${order.orderCode}. Cửa hàng sẽ liên hệ xác nhận sớm nhất.`} extra={[<Link key="orders" to={paths.myOrders}><Button type="primary">Xem đơn hàng của tôi</Button></Link>, <Link key="products" to={paths.products}><Button>Tiếp tục mua sắm</Button></Link>]} />
    <Typography.Paragraph style={{ textAlign: "center" }}>Trạng thái hiện tại: <CustomerOrderStatusTag status={order.status} /></Typography.Paragraph>
  </div></section>;
}
