import { EyeOutlined, ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Alert, Button, Card, DatePicker, Empty, Input, Select, Table, Tooltip, Typography } from "antd";
import type { TableColumnsType } from "antd";
import { useEffect, useState } from "react";
import {
  getOrders,
  type ManagedOrder,
  type OrderListParams,
  type OrderSort,
} from "../../../api/admin/orders.api";
import { AdminPageHeader } from "../../../components/admin/AdminPageHeader";
import { OrderDetailsDrawer } from "../../../components/admin/orders/OrderDetailsDrawer";
import {
  OrderStatusTag,
  PaymentStatusTag,
} from "../../../components/admin/orders/OrderStatusTag";
import "../../../styles/admin-orders.css";

const currency = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" });
const dateTime = new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" });

export function OrderManagementPage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<OrderListParams["status"]>("all");
  const [paymentStatus, setPaymentStatus] = useState<OrderListParams["paymentStatus"]>("all");
  const [paymentMethod, setPaymentMethod] = useState<OrderListParams["paymentMethod"]>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sort, setSort] = useState<OrderSort>("newest");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const params: OrderListParams = {
    page,
    limit,
    search,
    status,
    paymentStatus,
    paymentMethod,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    sort,
  };
  const ordersQuery = useQuery({
    queryKey: ["admin", "orders", "list", params],
    queryFn: () => getOrders(params),
    placeholderData: keepPreviousData,
  });

  const columns: TableColumnsType<ManagedOrder> = [
    {
      title: "Đơn hàng",
      key: "order",
      width: 172,
      render: (_, order) => (
        <span className="order-code-cell">
          <Typography.Text strong>{order.orderCode}</Typography.Text>
          <Typography.Text type="secondary">{dateTime.format(new Date(order.createdAt))}</Typography.Text>
        </span>
      ),
    },
    {
      title: "Khách hàng",
      key: "customer",
      render: (_, order) => (
        <span className="order-customer-cell">
          <Typography.Text strong>{order.customer.fullName}</Typography.Text>
          <Typography.Text type="secondary">{order.customer.phone}</Typography.Text>
        </span>
      ),
    },
    {
      title: "Sản phẩm",
      key: "items",
      width: 100,
      align: "center",
      render: (_, order) => order.items.reduce((total, item) => total + item.quantity, 0),
    },
    {
      title: "Thanh toán",
      key: "payment",
      width: 170,
      render: (_, order) => (
        <span className="order-payment-cell">
          <PaymentStatusTag status={order.paymentStatus} />
          <Typography.Text type="secondary">{order.paymentMethod === "cod" ? "COD" : "Chuyển khoản"}</Typography.Text>
        </span>
      ),
    },
    {
      title: "Tổng tiền",
      dataIndex: "total",
      key: "total",
      width: 145,
      align: "right",
      render: (value: number) => <Typography.Text strong>{currency.format(value)}</Typography.Text>,
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      width: 160,
      render: (value: ManagedOrder["status"]) => <OrderStatusTag status={value} />,
    },
    {
      title: "",
      key: "actions",
      width: 54,
      align: "right",
      render: (_, order) => (
        <Tooltip title="Xem và xử lý đơn">
          <Button type="text" icon={<EyeOutlined />} onClick={() => setSelectedOrderId(order.id)} />
        </Tooltip>
      ),
    },
  ];

  return (
    <div className="order-management-page">
      <AdminPageHeader
        title="Quản lý đơn hàng"
        description="Theo dõi, xác nhận và cập nhật tiến trình giao hàng tập trung."
        actions={<Button icon={<ReloadOutlined />} onClick={() => ordersQuery.refetch()}>Làm mới</Button>}
      />

      <Card className="order-table-card">
        <div className="order-toolbar">
          <Input
            allowClear
            value={searchInput}
            prefix={<SearchOutlined />}
            placeholder="Mã đơn, tên hoặc số điện thoại..."
            onChange={(event) => setSearchInput(event.target.value)}
          />
          <Select
            value={status}
            aria-label="Lọc trạng thái đơn"
            onChange={(value) => { setStatus(value); setPage(1); }}
            options={[
              { value: "all", label: "Tất cả trạng thái" },
              { value: "pending", label: "Chờ xác nhận" },
              { value: "confirmed", label: "Đã xác nhận" },
              { value: "processing", label: "Đang chuẩn bị" },
              { value: "shipping", label: "Đang giao" },
              { value: "completed", label: "Hoàn tất" },
              { value: "cancelled", label: "Đã hủy" },
            ]}
          />
          <Select
            value={paymentStatus}
            aria-label="Lọc thanh toán"
            onChange={(value) => { setPaymentStatus(value); setPage(1); }}
            options={[
              { value: "all", label: "Tất cả thanh toán" },
              { value: "unpaid", label: "Chưa thanh toán" },
              { value: "pending", label: "Chờ thanh toán" },
              { value: "paid", label: "Đã thanh toán" },
              { value: "failed", label: "Thanh toán lỗi" },
              { value: "refunded", label: "Đã hoàn tiền" },
            ]}
          />
          <Select
            value={paymentMethod}
            aria-label="Lọc phương thức"
            onChange={(value) => { setPaymentMethod(value); setPage(1); }}
            options={[
              { value: "all", label: "Mọi phương thức" },
              { value: "cod", label: "COD" },
              { value: "bank_transfer", label: "Chuyển khoản" },
            ]}
          />
          <Select
            value={sort}
            aria-label="Sắp xếp đơn hàng"
            onChange={(value) => { setSort(value); setPage(1); }}
            options={[
              { value: "newest", label: "Mới nhất" },
              { value: "oldest", label: "Cũ nhất" },
              { value: "total_desc", label: "Giá trị cao nhất" },
              { value: "total_asc", label: "Giá trị thấp nhất" },
            ]}
          />
          <DatePicker.RangePicker
            className="order-date-filter"
            format="DD/MM/YYYY"
            placeholder={["Từ ngày", "Đến ngày"]}
            onChange={(dates) => {
              setDateFrom(dates?.[0]?.format("YYYY-MM-DD") ?? "");
              setDateTo(dates?.[1]?.format("YYYY-MM-DD") ?? "");
              setPage(1);
            }}
          />
        </div>

        {ordersQuery.isError && (
          <Alert
            className="order-alert"
            type="error"
            showIcon
            message="Không thể tải danh sách đơn hàng."
            action={<Button size="small" onClick={() => ordersQuery.refetch()}>Thử lại</Button>}
          />
        )}

        <Table<ManagedOrder>
          rowKey="id"
          columns={columns}
          dataSource={ordersQuery.data?.orders ?? []}
          loading={ordersQuery.isPending || ordersQuery.isFetching}
          scroll={{ x: 1080 }}
          onRow={(order) => ({ onDoubleClick: () => setSelectedOrderId(order.id) })}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={search || status !== "all" || paymentStatus !== "all" || paymentMethod !== "all" || dateFrom || dateTo
                  ? "Không tìm thấy đơn phù hợp"
                  : "Chưa có đơn hàng"}
              />
            ),
          }}
          pagination={{
            current: page,
            pageSize: limit,
            total: ordersQuery.data?.pagination.total ?? 0,
            showSizeChanger: true,
            pageSizeOptions: [10, 20, 50],
            showTotal: (total) => `${total} đơn hàng`,
            onChange: (nextPage, nextLimit) => {
              setPage(nextLimit !== limit ? 1 : nextPage);
              setLimit(nextLimit);
            },
          }}
        />
      </Card>

      <OrderDetailsDrawer orderId={selectedOrderId} onClose={() => setSelectedOrderId(null)} />
    </div>
  );
}
