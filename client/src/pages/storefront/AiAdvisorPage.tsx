import { RobotOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Alert, Button, Card, Skeleton, Tag } from "antd";
import { getStorefrontProducts } from "../../api/storefront/products.api";
import { AdvisorChatPanel } from "../../components/storefront/AdvisorChatPanel";

export function AiAdvisorPage() {
  const productsQuery = useQuery({ queryKey: ["storefront", "advisor-products"], queryFn: () => getStorefrontProducts({ page: 1, limit: 24, search: "", category: "all", brand: "all", sort: "newest" }) });
  return (
    <section className="store-advisor-page"><div className="store-container">
      <header className="store-advisor-heading"><Tag icon={<RobotOutlined />}>AI Advisor</Tag><h1>Tìm đúng dụng cụ cho lối chơi của bạn.</h1><p>Cho trợ lý biết điều bạn cần để xem các sản phẩm phù hợp từ catalog hiện có.</p></header>
      {productsQuery.isPending && <Card className="advisor-chat-panel"><Skeleton active paragraph={{ rows: 9 }} /></Card>}
      {productsQuery.isError && <Alert type="error" showIcon message="Không thể tải catalog cho trợ lý" action={<Button size="small" onClick={() => productsQuery.refetch()}>Thử lại</Button>} />}
      {productsQuery.data && <AdvisorChatPanel products={productsQuery.data.products} />}
    </div></section>
  );
}
