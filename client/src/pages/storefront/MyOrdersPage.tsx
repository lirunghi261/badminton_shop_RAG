import { useQuery } from "@tanstack/react-query";
import { Button, Card, Empty, List, Pagination, Skeleton, Typography } from "antd";
import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { getCustomerOrders } from "../../api/storefront/orders.api";
import { getCurrentCustomer } from "../../api/auth/auth.api";
import { currentCustomerQueryKey } from "../../auth/queryKeys";
import { CustomerOrderStatusTag } from "../../components/storefront/CustomerOrderStatus";
import { formatCurrency } from "../../components/storefront/productPresentation";
import { paths } from "../../routes/paths";

export function MyOrdersPage() {
  const [page, setPage] = useState(1);
  const userQuery = useQuery({ queryKey: currentCustomerQueryKey, queryFn: getCurrentCustomer, retry: false, staleTime: 5 * 60 * 1000 });
  const ordersQuery = useQuery({ queryKey: ["customer-orders", page], queryFn: () => getCustomerOrders({ page, limit: 10 }), enabled: Boolean(userQuery.data) });
  if (userQuery.isError) return <Navigate to={paths.login} state={{ from: paths.myOrders }} replace />;
  if (userQuery.isPending || ordersQuery.isPending) return <section className="store-account-page"><div className="store-container"><Skeleton active /></div></section>;
  const data = ordersQuery.data;
  return <section className="store-account-page"><div className="store-container">
    <header className="store-account-heading"><span className="eyebrow">Tài khoản</span><h1>Đơn hàng của tôi</h1><p>Theo dõi trạng thái và xem chi tiết các đơn hàng đã đặt.</p></header>
    {!data?.orders.length ? <Card><Empty description="Bạn chưa có đơn hàng nào."><Link to={paths.products}><Button type="primary">Khám phá sản phẩm</Button></Link></Empty></Card> : <Card><List dataSource={data.orders} renderItem={(order) => <List.Item actions={[<Link key="detail" to={paths.myOrderDetail(order.id)}><Button>Xem chi tiết</Button></Link>]}>
      <List.Item.Meta title={<><strong>{order.orderCode}</strong> <CustomerOrderStatusTag status={order.status} /></>} description={`${new Date(order.createdAt).toLocaleString("vi-VN")} · ${order.items.length} sản phẩm`} />
      <Typography.Text strong>{formatCurrency(order.total)}</Typography.Text>
    </List.Item>} />
    {data.pagination.totalPages > 1 && <Pagination current={data.pagination.page} total={data.pagination.total} pageSize={data.pagination.limit} showSizeChanger={false} onChange={setPage} style={{ marginTop: 20, textAlign: "right" }} />}</Card>}
  </div></section>;
}
