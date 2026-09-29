import { CustomerServiceOutlined, RobotOutlined, SafetyCertificateOutlined, ThunderboltOutlined } from "@ant-design/icons";
import { Col, Row } from "antd";
import { Link } from "react-router-dom";
import heroDoubles from "../../assets/storefront-hero-doubles-ocean.png";
import heroEquipment from "../../assets/storefront-hero-equipment-ocean.png";
import heroSmash from "../../assets/storefront-hero-smash-ocean.png";
import { HomeFeaturedProducts } from "../../components/storefront/HomeFeaturedProducts";
import { HomeHeroCarousel } from "../../components/storefront/HomeHeroCarousel";
import { paths } from "../../routes/paths";

const categories = [
  { name: "Vợt cầu lông", description: "Kiểm soát, tốc độ và sức mạnh", symbol: "01", slug: "vot-cau-long", image: heroSmash },
  { name: "Giày cầu lông", description: "Bám sân và bảo vệ từng bước chân", symbol: "02", slug: "giay-cau-long", image: heroEquipment },
  { name: "Trang phục", description: "Thoải mái trong mọi trận đấu", symbol: "03", slug: "trang-phuc", image: heroDoubles },
  { name: "Phụ kiện", description: "Hoàn thiện bộ trang bị của bạn", symbol: "04", slug: "phu-kien", image: heroEquipment },
];

const benefits = [
  { icon: <SafetyCertificateOutlined />, title: "Sản phẩm chính hãng", text: "Thông tin rõ ràng, nguồn gốc minh bạch." },
  { icon: <CustomerServiceOutlined />, title: "Hỗ trợ tận tâm", text: "Tư vấn theo nhu cầu và trình độ người chơi." },
  { icon: <ThunderboltOutlined />, title: "Mua sắm thuận tiện", text: "Tìm kiếm, so sánh và đặt hàng dễ dàng." },
];

export function HomePage() {
  return (
    <>
      <HomeHeroCarousel />
      <section className="home-service-strip" aria-label="Cam kết dịch vụ">
        <div className="store-container"><Row gutter={[0, 14]}>
          <Col xs={24} md={8}><div><SafetyCertificateOutlined /><span><strong>Hàng chính hãng</strong>Kiểm tra thông tin minh bạch</span></div></Col>
          <Col xs={24} md={8}><div><ThunderboltOutlined /><span><strong>Giao hàng linh hoạt</strong>Kiểm tra phương thức ở checkout</span></div></Col>
          <Col xs={24} md={8}><div><RobotOutlined /><span><strong>Tư vấn thông minh</strong>Gợi ý theo lối chơi của bạn</span></div></Col>
        </Row></div>
      </section>
      <section className="home-section home-categories">
        <div className="store-container">
          <div className="section-heading"><div><span className="eyebrow">Danh mục nổi bật</span><h2>Sẵn sàng cho sân đấu</h2></div><Link to={paths.products}>Xem tất cả →</Link></div>
          <Row gutter={[18, 18]}>
            {categories.map((category) => (
              <Col xs={24} sm={12} lg={6} key={category.name}>
                <Link to={paths.productsByCategory(category.slug)} className="category-link">
                  <article className="category-card"><img src={category.image} alt="" /><span className="category-shade" /><span className="category-number">{category.symbol}</span><div><h3>{category.name}</h3><p>{category.description}</p></div><span className="category-arrow">→</span></article>
                </Link>
              </Col>
            ))}
          </Row>
        </div>
      </section>
      <HomeFeaturedProducts />
      <section className="home-promo-section"><div className="store-container"><div className="section-heading"><div><span className="eyebrow">Ưu đãi nổi bật</span><h2>Lựa chọn cho mùa giải mới</h2></div><Link to={paths.products}>Xem toàn bộ ưu đãi →</Link></div><div className="home-promo-grid"><Link className="home-promo-card home-promo-primary" to={paths.products}><img src={heroEquipment} alt="" /><span /><div><small>COMBO TRANG BỊ</small><strong>Chọn trọn bộ,<br />sẵn sàng ra sân.</strong><em>Khám phá ngay →</em></div></Link><Link className="home-promo-card" to={paths.productsByCategory("vot-cau-long")}><img src={heroSmash} alt="" /><span /><div><small>VỢT CẦU LÔNG</small><strong>Sức mạnh trong<br />từng pha cầu.</strong><em>Xem vợt →</em></div></Link><Link className="home-promo-card" to={paths.aiAdvisor}><img src={heroDoubles} alt="" /><span /><div><small>TƯ VẤN THÔNG MINH</small><strong>Tìm đúng dụng cụ<br />cho lối chơi.</strong><em>Hỏi trợ lý →</em></div></Link></div></div></section>
      <section className="home-benefits"><div className="store-container"><Row gutter={[20, 20]}>{benefits.map((benefit) => <Col xs={24} md={8} key={benefit.title}><div className="benefit-item"><span className="benefit-icon">{benefit.icon}</span><div><h3>{benefit.title}</h3><p>{benefit.text}</p></div></div></Col>)}</Row></div></section>
    </>
  );
}
