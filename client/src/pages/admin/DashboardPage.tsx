import {
  AppstoreOutlined,
  ArrowUpOutlined,
  DollarOutlined,
  ShoppingCartOutlined,
  TeamOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Alert, Card, Col, Row, Skeleton, Statistic } from "antd";
import type { ReactNode } from "react";
import { getDashboardSummary } from "../../api/admin/dashboard.api";
import { AdminPageHeader } from "../../components/admin/AdminPageHeader";

const currency = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" });

export function DashboardPage() {
  const summaryQuery = useQuery({
    queryKey: ["admin", "dashboard", "summary"],
    queryFn: getDashboardSummary,
  });

  return (
    <div>
      <AdminPageHeader
        title="Tổng quan"
        description="Theo dõi nhanh tình hình hoạt động của cửa hàng."
      />

      {summaryQuery.isError && (
        <Alert
          className="dashboard-alert"
          type="error"
          showIcon
          message="Không thể tải dữ liệu tổng quan."
          action={<a onClick={() => summaryQuery.refetch()}>Thử lại</a>}
        />
      )}

      {summaryQuery.isPending ? (
        <Card><Skeleton active /></Card>
      ) : (
        <Row gutter={[18, 18]}>
          <Col xs={24} sm={12} xl={6}>
            <MetricCard title="Sản phẩm" value={summaryQuery.data?.products ?? 0} icon={<AppstoreOutlined />} />
          </Col>
          <Col xs={24} sm={12} xl={6}>
            <MetricCard title="Đơn hàng" value={summaryQuery.data?.orders ?? 0} icon={<ShoppingCartOutlined />} />
          </Col>
          <Col xs={24} sm={12} xl={6}>
            <MetricCard title="Khách hàng" value={summaryQuery.data?.customers ?? 0} icon={<TeamOutlined />} />
          </Col>
          <Col xs={24} sm={12} xl={6}>
            <MetricCard title="Sắp hết hàng" value={summaryQuery.data?.lowStock ?? 0} icon={<WarningOutlined />} warning />
          </Col>
          <Col span={24}>
            <Card className="revenue-card">
              <Statistic
                title="Doanh thu đơn đã thanh toán"
                value={summaryQuery.data?.revenue ?? 0}
                formatter={(value) => currency.format(Number(value))}
                prefix={<DollarOutlined />}
              />
              <span className="revenue-note"><ArrowUpOutlined /> Dữ liệu sẽ cập nhật theo đơn hàng thực tế</span>
            </Card>
          </Col>
        </Row>
      )}
    </div>
  );
}

function MetricCard({
  title,
  value,
  icon,
  warning = false,
}: {
  title: string;
  value: number;
  icon: ReactNode;
  warning?: boolean;
}) {
  return (
    <Card className="metric-card">
      <div className={warning ? "metric-icon metric-icon-warning" : "metric-icon"}>{icon}</div>
      <Statistic title={title} value={value} />
    </Card>
  );
}
