import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  SyncOutlined,
  TruckOutlined,
} from "@ant-design/icons";
import { Tag } from "antd";
import type { ReactNode } from "react";
import type { OrderStatus, PaymentStatus } from "../../../api/admin/orders.api";
import { orderStatusLabels, paymentStatusLabels } from "./orderMeta";

const orderStatusMeta: Record<OrderStatus, { color: string; icon: ReactNode }> = {
  pending: { color: "gold", icon: <ClockCircleOutlined /> },
  confirmed: { color: "blue", icon: <CheckCircleOutlined /> },
  processing: { color: "cyan", icon: <SyncOutlined /> },
  shipping: { color: "geekblue", icon: <TruckOutlined /> },
  completed: { color: "green", icon: <CheckCircleOutlined /> },
  cancelled: { color: "red", icon: <CloseCircleOutlined /> },
};

const paymentColors: Record<PaymentStatus, string> = {
  unpaid: "default",
  pending: "gold",
  paid: "green",
  failed: "red",
  refunded: "purple",
};

export function OrderStatusTag({ status }: { status: OrderStatus }) {
  const meta = orderStatusMeta[status];
  return <Tag className="order-status-tag" color={meta.color} icon={meta.icon}>{orderStatusLabels[status]}</Tag>;
}

export function PaymentStatusTag({ status }: { status: PaymentStatus }) {
  return <Tag className="order-status-tag" color={paymentColors[status]}>{paymentStatusLabels[status]}</Tag>;
}
