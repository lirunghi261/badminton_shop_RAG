import { Tag } from "antd";
import type { CustomerOrderStatus } from "../../api/storefront/orders.api";

const labels: Record<CustomerOrderStatus, string> = { pending: "Chờ xác nhận", confirmed: "Đã xác nhận", processing: "Đang chuẩn bị hàng", shipping: "Đang giao", completed: "Hoàn tất", cancelled: "Đã hủy" };
const colors: Record<CustomerOrderStatus, string> = { pending: "gold", confirmed: "blue", processing: "blue", shipping: "cyan", completed: "green", cancelled: "red" };

export function CustomerOrderStatusTag({ status }: { status: CustomerOrderStatus }) {
  return <Tag color={colors[status]}>{labels[status]}</Tag>;
}
