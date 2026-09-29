import { CheckCircleFilled, RobotOutlined, ShopOutlined } from "@ant-design/icons";
import { Button, Card, Tag } from "antd";
import { Link } from "react-router-dom";
import { paths } from "../../routes/paths";

interface ProductAvailabilityPanelProps { stock: number; variantName: string; }

export function ProductAvailabilityPanel({ stock, variantName }: ProductAvailabilityPanelProps) {
  const inStock = stock > 0;
  return (
    <aside className="store-availability-panel">
      <Card>
        <span className="store-availability-label"><ShopOutlined /> Tình trạng sản phẩm</span>
        <Tag className={inStock ? "store-stock-tag available" : "store-stock-tag unavailable"} icon={<CheckCircleFilled />}>{inStock ? "Đang sẵn sàng để đặt" : "Tạm hết hàng"}</Tag>
        <h2>{inStock ? `${stock} sản phẩm còn lại` : "Chưa có hàng"}</h2>
        <p>Phiên bản đang chọn: <strong>{variantName}</strong></p>
        <div className="store-availability-note">Số lượng được xác nhận lại khi bạn tạo đơn hàng.</div>
        <Link to={paths.aiAdvisor}><Button icon={<RobotOutlined />} block>Nhờ tư vấn sản phẩm</Button></Link>
      </Card>
    </aside>
  );
}
