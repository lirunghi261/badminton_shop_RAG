import {
  ArrowRightOutlined,
  CustomerServiceOutlined,
  RobotOutlined,
  SafetyCertificateOutlined,
  ShoppingOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import { Button, Card, Col, Row, Tag } from "antd";
import { Link, useNavigate } from "react-router-dom";
import { paths } from "../../routes/paths";

const categories = [
  { name: "Vợt cầu lông", description: "Kiểm soát, tốc độ và sức mạnh", symbol: "01" },
  { name: "Giày cầu lông", description: "Bám sân và bảo vệ từng bước chân", symbol: "02" },
  { name: "Trang phục", description: "Thoải mái trong mọi trận đấu", symbol: "03" },
  { name: "Phụ kiện", description: "Hoàn thiện bộ trang bị của bạn", symbol: "04" },
];

const benefits = [
  { icon: <SafetyCertificateOutlined />, title: "Sản phẩm chính hãng", text: "Thông tin rõ ràng, nguồn gốc minh bạch." },
  { icon: <CustomerServiceOutlined />, title: "Hỗ trợ tận tâm", text: "Tư vấn theo nhu cầu và trình độ người chơi." },
  { icon: <ThunderboltOutlined />, title: "Mua sắm thuận tiện", text: "Tìm kiếm, so sánh và đặt hàng dễ dàng." },
];

export function HomePage() {
  const navigate = useNavigate();

  return (
    <>
      <section className="home-hero">
        <div className="store-container home-hero-grid">
          <div className="home-hero-copy">
            <Tag className="ocean-tag" icon={<ThunderboltOutlined />}>Trang bị cho mọi trận đấu</Tag>
            <h1>Nâng tầm từng cú đánh.</h1>
            <p>
              Khám phá sản phẩm cầu lông phù hợp với lối chơi của bạn và nhận tư vấn cá nhân hóa
              từ trợ lý AI.
            </p>
            <div className="home-hero-actions">
              <Button type="primary" size="large" onClick={() => navigate(paths.products)} icon={<ShoppingOutlined />}>
                Khám phá sản phẩm
              </Button>
              <Button size="large" onClick={() => navigate(paths.aiAdvisor)} icon={<RobotOutlined />}>
                Tư vấn cùng AI
              </Button>
            </div>
            <div className="home-trust-row">
              <span><strong>100%</strong> chính hãng</span>
              <span><strong>Đa dạng</strong> thương hiệu</span>
              <span><strong>Thông minh</strong> với RAG</span>
            </div>
          </div>

          <div className="home-hero-art" aria-hidden="true">
            <div className="ocean-orbit ocean-orbit-one" />
            <div className="ocean-orbit ocean-orbit-two" />
            <div className="hero-racket">⌁</div>
            <div className="hero-shuttle">✦</div>
            <div className="hero-product-card">
              <span>Sản phẩm phù hợp</span>
              <strong>Được chọn theo lối chơi</strong>
              <small>AI recommendation</small>
            </div>
          </div>
        </div>
      </section>

      <section className="home-section">
        <div className="store-container">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Danh mục nổi bật</span>
              <h2>Sẵn sàng cho sân đấu</h2>
            </div>
            <Link to={paths.products}>Xem tất cả <ArrowRightOutlined /></Link>
          </div>
          <Row gutter={[18, 18]}>
            {categories.map((category) => (
              <Col xs={24} sm={12} lg={6} key={category.name}>
                <Link to={paths.products} className="category-link">
                  <Card className="category-card" hoverable>
                    <span className="category-number">{category.symbol}</span>
                    <h3>{category.name}</h3>
                    <p>{category.description}</p>
                    <ArrowRightOutlined className="category-arrow" />
                  </Card>
                </Link>
              </Col>
            ))}
          </Row>
        </div>
      </section>

      <section className="home-benefits">
        <div className="store-container">
          <Row gutter={[20, 20]}>
            {benefits.map((benefit) => (
              <Col xs={24} md={8} key={benefit.title}>
                <div className="benefit-item">
                  <span className="benefit-icon">{benefit.icon}</span>
                  <div><h3>{benefit.title}</h3><p>{benefit.text}</p></div>
                </div>
              </Col>
            ))}
          </Row>
        </div>
      </section>
    </>
  );
}
