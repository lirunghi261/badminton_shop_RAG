import {
  EnvironmentOutlined,
  MailOutlined,
  PhoneOutlined,
  SaveOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  App,
  Button,
  Descriptions,
  Divider,
  Drawer,
  Empty,
  Image,
  Input,
  Popconfirm,
  Select,
  Skeleton,
  Space,
  Table,
  Tabs,
  Timeline,
  Typography,
} from "antd";
import type { TableColumnsType } from "antd";
import axios from "axios";
import { useMemo, useState } from "react";
import {
  getOrder,
  updateOrderAdminNote,
  updateOrderStatus,
  updatePaymentStatus,
  type OrderItem,
  type OrderStatus,
  type PaymentStatus,
} from "../../../api/admin/orders.api";
import {
  OrderStatusTag,
  PaymentStatusTag,
} from "./OrderStatusTag";
import { orderStatusLabels, paymentStatusLabels } from "./orderMeta";

const currency = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" });
const dateTime = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "short",
  timeStyle: "short",
});

function getErrorMessage(error: unknown) {
  if (!axios.isAxiosError(error)) return "Đã xảy ra lỗi. Vui lòng thử lại.";
  return (
    (error.response?.data as { error?: { message?: string } } | undefined)?.error?.message ??
    "Đã xảy ra lỗi. Vui lòng thử lại."
  );
}

function fullAddress(address: { addressLine: string; ward: string; district: string; province: string }) {
  return [address.addressLine, address.ward, address.district, address.province].filter(Boolean).join(", ");
}

interface OrderDetailsDrawerProps {
  orderId: string | null;
  onClose: () => void;
}

export function OrderDetailsDrawer({ orderId, onClose }: OrderDetailsDrawerProps) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [nextStatus, setNextStatus] = useState<OrderStatus | undefined>();
  const [nextPaymentStatus, setNextPaymentStatus] = useState<PaymentStatus | undefined>();
  const [statusNote, setStatusNote] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const [adminNoteDraft, setAdminNoteDraft] = useState<{ orderId: string; value: string } | null>(null);

  const orderQuery = useQuery({
    queryKey: ["admin", "orders", "detail", orderId],
    queryFn: () => getOrder(orderId!),
    enabled: Boolean(orderId),
  });
  const order = orderQuery.data;
  const adminNote = order && adminNoteDraft?.orderId === order.id ? adminNoteDraft.value : order?.adminNote ?? "";

  const closeDrawer = () => {
    setNextStatus(undefined);
    setNextPaymentStatus(undefined);
    setStatusNote("");
    setPaymentNote("");
    setAdminNoteDraft(null);
    onClose();
  };

  const syncOrder = async (updatedOrder: NonNullable<typeof order>) => {
    queryClient.setQueryData(["admin", "orders", "detail", updatedOrder.id], updatedOrder);
    await queryClient.invalidateQueries({ queryKey: ["admin", "orders", "list"] });
    await queryClient.invalidateQueries({ queryKey: ["admin", "dashboard"] });
  };

  const statusMutation = useMutation({
    mutationFn: () => updateOrderStatus(order!.id, { status: nextStatus!, note: statusNote.trim() }),
    onSuccess: async (updatedOrder) => {
      await syncOrder(updatedOrder);
      setNextStatus(undefined);
      setStatusNote("");
      message.success("Đã cập nhật trạng thái đơn hàng.");
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const paymentMutation = useMutation({
    mutationFn: () => updatePaymentStatus(order!.id, {
      paymentStatus: nextPaymentStatus!,
      note: paymentNote.trim(),
    }),
    onSuccess: async (updatedOrder) => {
      await syncOrder(updatedOrder);
      setNextPaymentStatus(undefined);
      setPaymentNote("");
      message.success("Đã cập nhật thanh toán.");
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const noteMutation = useMutation({
    mutationFn: () => updateOrderAdminNote(order!.id, adminNote.trim()),
    onSuccess: async (updatedOrder) => {
      await syncOrder(updatedOrder);
      setAdminNoteDraft(null);
      message.success("Đã lưu ghi chú nội bộ.");
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const itemColumns: TableColumnsType<OrderItem> = useMemo(() => [
    {
      title: "Sản phẩm",
      key: "product",
      render: (_, item) => (
        <Space size={10}>
          <Image
            width={48}
            height={48}
            preview={false}
            className="order-item-image"
            src={item.imageUrl || undefined}
            fallback="data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs="
          />
          <span className="order-product-cell">
            <Typography.Text strong>{item.productName}</Typography.Text>
            <Typography.Text type="secondary">{item.variantName || item.sku}</Typography.Text>
          </span>
        </Space>
      ),
    },
    { title: "SL", dataIndex: "quantity", width: 54, align: "center" },
    {
      title: "Thành tiền",
      dataIndex: "lineTotal",
      width: 135,
      align: "right",
      render: (value: number) => currency.format(value),
    },
  ], []);

  return (
    <Drawer
      open={Boolean(orderId)}
      onClose={closeDrawer}
      width={760}
      title={order ? (
        <Space wrap>
          <span>{order.orderCode}</span>
          <OrderStatusTag status={order.status} />
        </Space>
      ) : "Chi tiết đơn hàng"}
    >
      {orderQuery.isPending && <Skeleton active paragraph={{ rows: 10 }} />}
      {orderQuery.isError && (
        <Alert
          type="error"
          showIcon
          message="Không thể tải chi tiết đơn hàng."
          action={<Button size="small" onClick={() => orderQuery.refetch()}>Thử lại</Button>}
        />
      )}
      {order && (
        <Tabs
          defaultActiveKey="detail"
          items={[
            {
              key: "detail",
              label: "Thông tin đơn",
              children: (
                <div className="order-detail">
                  <Descriptions column={2} size="small" bordered>
                    <Descriptions.Item label="Ngày đặt">{dateTime.format(new Date(order.createdAt))}</Descriptions.Item>
                    <Descriptions.Item label="Thanh toán"><PaymentStatusTag status={order.paymentStatus} /></Descriptions.Item>
                    <Descriptions.Item label={<><UserOutlined /> Khách hàng</>} span={2}>{order.customer.fullName}</Descriptions.Item>
                    <Descriptions.Item label={<><PhoneOutlined /> Điện thoại</>}>{order.customer.phone}</Descriptions.Item>
                    <Descriptions.Item label={<><MailOutlined /> Email</>}>{order.customer.email || "—"}</Descriptions.Item>
                    <Descriptions.Item label={<><EnvironmentOutlined /> Giao đến</>} span={2}>
                      {fullAddress(order.shippingAddress)}
                    </Descriptions.Item>
                    <Descriptions.Item label="Phương thức">{order.paymentMethod === "cod" ? "COD" : "Chuyển khoản"}</Descriptions.Item>
                    <Descriptions.Item label="Mã khách hàng">{order.userId ? "Khách đã đăng nhập" : "Khách vãng lai"}</Descriptions.Item>
                  </Descriptions>

                  {order.customerNote && (
                    <Alert className="order-customer-note" type="info" showIcon message="Ghi chú của khách" description={order.customerNote} />
                  )}

                  <Divider titlePlacement="left">Sản phẩm</Divider>
                  <Table<OrderItem>
                    rowKey="sku"
                    columns={itemColumns}
                    dataSource={order.items}
                    size="small"
                    pagination={false}
                  />
                  <div className="order-totals">
                    <span>Tạm tính <strong>{currency.format(order.subtotal)}</strong></span>
                    <span>Phí giao hàng <strong>{currency.format(order.shippingFee)}</strong></span>
                    <span>Giảm giá <strong>− {currency.format(order.discount)}</strong></span>
                    <span className="order-totals__grand">Tổng cộng <strong>{currency.format(order.total)}</strong></span>
                  </div>
                </div>
              ),
            },
            {
              key: "workflow",
              label: "Xử lý đơn",
              children: (
                <div className="order-workflow">
                  <section>
                    <Typography.Title level={5}>Trạng thái đơn hàng</Typography.Title>
                    <Typography.Paragraph type="secondary">
                      Hệ thống chỉ hiển thị bước tiếp theo hợp lệ để tránh sai quy trình.
                    </Typography.Paragraph>
                    {order.allowedNextStatuses.length ? (
                      <>
                        <Select
                          value={nextStatus}
                          placeholder="Chọn trạng thái tiếp theo"
                          onChange={setNextStatus}
                          options={order.allowedNextStatuses.map((status) => ({ value: status, label: orderStatusLabels[status] }))}
                        />
                        <Input.TextArea
                          value={statusNote}
                          onChange={(event) => setStatusNote(event.target.value)}
                          rows={3}
                          maxLength={300}
                          showCount
                          placeholder={nextStatus === "cancelled" ? "Nhập lý do hủy đơn (bắt buộc)" : "Ghi chú cho lần cập nhật này"}
                        />
                        <Popconfirm
                          title="Xác nhận cập nhật trạng thái?"
                          description="Thao tác sẽ được ghi vào lịch sử đơn hàng."
                          okText="Cập nhật"
                          cancelText="Hủy"
                          disabled={!nextStatus || (nextStatus === "cancelled" && !statusNote.trim())}
                          onConfirm={() => statusMutation.mutate()}
                        >
                          <Button
                            type="primary"
                            disabled={!nextStatus || (nextStatus === "cancelled" && !statusNote.trim())}
                            loading={statusMutation.isPending}
                          >
                            Cập nhật trạng thái
                          </Button>
                        </Popconfirm>
                      </>
                    ) : (
                      <Alert type="success" showIcon message="Đơn hàng đã ở trạng thái kết thúc." />
                    )}
                  </section>

                  <section>
                    <Typography.Title level={5}>Trạng thái thanh toán</Typography.Title>
                    {order.allowedNextPaymentStatuses.length ? (
                      <>
                        <Select
                          value={nextPaymentStatus}
                          placeholder="Chọn trạng thái thanh toán"
                          onChange={setNextPaymentStatus}
                          options={order.allowedNextPaymentStatuses.map((status) => ({ value: status, label: paymentStatusLabels[status] }))}
                        />
                        <Input.TextArea
                          value={paymentNote}
                          onChange={(event) => setPaymentNote(event.target.value)}
                          rows={2}
                          maxLength={300}
                          placeholder="Mã giao dịch hoặc ghi chú đối soát"
                        />
                        <Popconfirm
                          title="Xác nhận cập nhật thanh toán?"
                          okText="Cập nhật"
                          cancelText="Hủy"
                          disabled={!nextPaymentStatus}
                          onConfirm={() => paymentMutation.mutate()}
                        >
                          <Button disabled={!nextPaymentStatus} loading={paymentMutation.isPending}>Cập nhật thanh toán</Button>
                        </Popconfirm>
                      </>
                    ) : (
                      <Typography.Text type="secondary">Không còn trạng thái thanh toán tiếp theo.</Typography.Text>
                    )}
                  </section>

                  <section>
                    <Typography.Title level={5}>Ghi chú nội bộ</Typography.Title>
                    <Input.TextArea
                      value={adminNote}
                      onChange={(event) => setAdminNoteDraft({ orderId: order.id, value: event.target.value })}
                      rows={4}
                      maxLength={1000}
                      showCount
                      placeholder="Chỉ quản trị viên nhìn thấy ghi chú này"
                    />
                    <Button icon={<SaveOutlined />} loading={noteMutation.isPending} onClick={() => noteMutation.mutate()}>
                      Lưu ghi chú
                    </Button>
                  </section>
                </div>
              ),
            },
            {
              key: "history",
              label: "Lịch sử",
              children: order.statusHistory.length || order.paymentHistory.length ? (
                <Timeline
                  items={[
                    ...order.statusHistory.map((entry) => ({
                      time: entry.changedAt,
                      children: (
                        <div>
                          <Typography.Text strong>{orderStatusLabels[entry.to]}</Typography.Text>
                          {entry.note && <Typography.Paragraph type="secondary">{entry.note}</Typography.Paragraph>}
                          <Typography.Text type="secondary">{dateTime.format(new Date(entry.changedAt))}</Typography.Text>
                        </div>
                      ),
                    })),
                    ...order.paymentHistory.map((entry) => ({
                      time: entry.changedAt,
                      color: "green",
                      children: (
                        <div>
                          <Typography.Text strong>Thanh toán: {paymentStatusLabels[entry.to]}</Typography.Text>
                          {entry.note && <Typography.Paragraph type="secondary">{entry.note}</Typography.Paragraph>}
                          <Typography.Text type="secondary">{dateTime.format(new Date(entry.changedAt))}</Typography.Text>
                        </div>
                      ),
                    })),
                  ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())}
                />
              ) : <Empty description="Chưa có lịch sử xử lý" />,
            },
          ]}
        />
      )}
    </Drawer>
  );
}
