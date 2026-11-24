import { CheckCircleFilled } from "@ant-design/icons";
import { Button, Result, Typography } from "antd";
import { Link, useParams } from "react-router-dom";
import { CustomerOrderView } from "../../components/storefront/CustomerOrderView";
import { CustomerOrderStatusTag } from "../../components/storefront/CustomerOrderStatus";
import { paths } from "../../routes/paths";

export function OrderSuccessPage() {
  const { orderId = "" } = useParams();
  return <CustomerOrderView orderId={orderId}>{(order) => <section className="store-account-page"><div className="store-container"><Result icon={<CheckCircleFilled />} status="success" title="Đặt hàng thành công!" subTitle={`Mã đơn hàng của bạn là ${order.orderCode}. Cửa hàng sẽ liên hệ xác nhận sớm nhất.`} extra={[<Link key="orders" to={paths.myOrders}><Button type="primary">Xem đơn hàng của tôi</Button></Link>, <Link key="products" to={paths.products}><Button>Tiếp tục mua sắm</Button></Link>]} />
    <Typography.Paragraph style={{ textAlign: "center" }}>Trạng thái hiện tại: <CustomerOrderStatusTag status={order.status} /></Typography.Paragraph>
  </div></section>}</CustomerOrderView>;
}
