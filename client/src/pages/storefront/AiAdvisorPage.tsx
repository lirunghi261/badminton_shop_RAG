import {
  CompassOutlined,
  DollarOutlined,
  RobotOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Alert, Button, Card, Skeleton } from "antd";
import { Link } from "react-router-dom";
import { getStorefrontProducts } from "../../api/storefront/products.api";
import { SeoHead } from "../../components/common/SeoHead";
import { AdvisorChatPanel } from "../../components/storefront/AdvisorChatPanel";
import { paths } from "../../routes/paths";
import "../../styles/ai-advisor.css";

const advisorGuide = [
  { icon: <CompassOutlined />, title: "Bạn chơi ở trình độ nào?", text: "Mới chơi, phong trào hay thi đấu." },
  { icon: <ThunderboltOutlined />, title: "Lối chơi bạn hướng đến", text: "Tấn công, phòng thủ hoặc công thủ toàn diện." },
  { icon: <DollarOutlined />, title: "Khoảng ngân sách", text: "Cho biết mức giá để thu hẹp lựa chọn." },
];

export function AiAdvisorPage() {
  const productsQuery = useQuery({
    queryKey: ["storefront", "advisor-products"],
    queryFn: () => getStorefrontProducts({ page: 1, limit: 48, search: "", category: "all", brand: "all", sort: "newest" }),
  });

  return (
    <section className="store-advisor-page">
      <SeoHead
        title="Tư vấn dụng cụ cầu lông | Badminton Shop"
        description="Mô tả trình độ, lối chơi và ngân sách để nhận gợi ý vợt, giày và phụ kiện cầu lông phù hợp từ catalog Badminton Shop."
        canonicalPath={paths.aiAdvisor}
      />
      <div className="store-container">
        <header className="advisor-page-heading">
          <span className="advisor-eyebrow"><RobotOutlined /> Trợ lý mua sắm</span>
          <h1>Tư vấn dụng cụ cầu lông</h1>
          <p>Cho biết trình độ, lối chơi và ngân sách để nhận gợi ý phù hợp từ catalog hiện có.</p>
        </header>

        {productsQuery.isPending ? (
          <Card className="advisor-loading-card"><Skeleton active paragraph={{ rows: 9 }} /></Card>
        ) : null}

        {productsQuery.isError ? (
          <Alert
            className="advisor-error"
            type="error"
            showIcon
            message="Không thể tải catalog cho trợ lý"
            description="Hãy kiểm tra kết nối máy chủ rồi thử lại."
            action={<Button size="small" onClick={() => productsQuery.refetch()}>Thử lại</Button>}
          />
        ) : null}

        {productsQuery.data ? (
          <div className="advisor-workspace">
            <AdvisorChatPanel products={productsQuery.data.products} />
            <aside className="advisor-guide" aria-labelledby="advisor-guide-title">
              <span className="advisor-guide-kicker">Mẹo hỏi hiệu quả</span>
              <h2 id="advisor-guide-title">Càng cụ thể,<br />gợi ý càng sát</h2>
              <p>Chỉ cần kết hợp ba thông tin sau trong một câu hỏi:</p>
              <ol>
                {advisorGuide.map((item) => (
                  <li key={item.title}>
                    <span>{item.icon}</span>
                    <div><strong>{item.title}</strong><small>{item.text}</small></div>
                  </li>
                ))}
              </ol>
              <Link to={paths.products}>Tự khám phá toàn bộ sản phẩm →</Link>
            </aside>
          </div>
        ) : null}
      </div>
    </section>
  );
}
