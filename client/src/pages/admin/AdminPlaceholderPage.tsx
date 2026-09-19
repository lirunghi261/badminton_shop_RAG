import { ToolOutlined } from "@ant-design/icons";
import { Empty } from "antd";
import { useLocation } from "react-router-dom";
import { AdminPageHeader } from "../../components/admin/AdminPageHeader";

const titles: Record<string, string> = {
  products: "Quản lý sản phẩm",
  categories: "Quản lý danh mục",
  brands: "Quản lý thương hiệu",
  orders: "Quản lý đơn hàng",
  customers: "Quản lý khách hàng",
};

export function AdminPlaceholderPage() {
  const segment = useLocation().pathname.split("/").at(-1) ?? "";
  return (
    <div>
      <AdminPageHeader title={titles[segment] ?? "Chức năng quản trị"} />
      <div className="empty-state">
        <Empty
          image={<ToolOutlined className="construction-icon" />}
          description="Module này sẽ được xây dựng ở sprint tiếp theo."
        />
      </div>
    </div>
  );
}
