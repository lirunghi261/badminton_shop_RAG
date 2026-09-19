import { CompassOutlined } from "@ant-design/icons";
import { Button, Empty } from "antd";
import { useLocation, useNavigate } from "react-router-dom";
import { paths } from "../../routes/paths";

const routeNames: Record<string, string> = {
  products: "Danh sách sản phẩm",
  "ai-advisor": "Trợ lý tư vấn AI",
  cart: "Giỏ hàng",
  account: "Tài khoản khách hàng",
};

export function StorefrontPlaceholderPage() {
  const segment = useLocation().pathname.split("/").filter(Boolean)[0] ?? "";
  const navigate = useNavigate();
  return (
    <section className="store-placeholder">
      <Empty
        image={<CompassOutlined className="store-placeholder-icon" />}
        description={
          <div>
            <h2>{routeNames[segment] ?? "Trang đang phát triển"}</h2>
            <p>Route đã sẵn sàng để thành viên trong nhóm tiếp tục triển khai.</p>
          </div>
        }
      >
        <Button type="primary" onClick={() => navigate(paths.home)}>Về trang chủ</Button>
      </Empty>
    </section>
  );
}
