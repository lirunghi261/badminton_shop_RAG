import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Button, Result, Skeleton } from "antd";
import axios from "axios";
import { useEffect, type ReactNode } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { getCurrentCustomer } from "../../api/auth/auth.api";
import { getCustomerOrder, type CustomerOrder } from "../../api/storefront/orders.api";
import { currentCustomerQueryKey } from "../../auth/queryKeys";
import { paths } from "../../routes/paths";

export function CustomerOrderView({ orderId, children }: { orderId: string; children: (order: CustomerOrder) => ReactNode }) {
  const location = useLocation();
  const queryClient = useQueryClient();
  const customer = useQuery({ queryKey: currentCustomerQueryKey, queryFn: getCurrentCustomer, retry: false });
  const order = useQuery({
    queryKey: ["customer-orders", customer.data?.id, "detail", orderId],
    queryFn: () => getCustomerOrder(orderId),
    enabled: Boolean(customer.data && !customer.isError && !customer.isFetching && orderId),
    retry: false,
  });
  const error = customer.error ?? order.error;
  const status = axios.isAxiosError(error) ? error.response?.status : undefined;
  useEffect(() => {
    if (status === 401 || status === 403) queryClient.setQueryData(currentCustomerQueryKey, null);
  }, [status, queryClient]);
  if (status === 401 || status === 403 || (!customer.isPending && !customer.isError && !customer.data)) {
    return <Navigate to={paths.login} state={{ from: location.pathname }} replace />;
  }
  if (status === 404 || !orderId) return <Result status="404" title="Không tìm thấy đơn hàng" extra={<Link to={paths.myOrders}>Về đơn hàng của tôi</Link>} />;
  if (error) return <section className="store-account-page"><div className="store-container">
    <Alert type="error" showIcon message="Chưa tải được đơn hàng"
      action={<Button onClick={() => void (customer.isError ? customer.refetch() : order.refetch())}>Thử lại</Button>} />
  </div></section>;
  if (customer.isPending || customer.isFetching || order.isPending) return <section className="store-account-page"><div className="store-container"><Skeleton active /></div></section>;
  return order.data ? children(order.data) : null;
}
