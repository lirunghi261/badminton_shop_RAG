import { CustomerServiceOutlined, RobotOutlined, SafetyCertificateOutlined, ThunderboltOutlined } from "@ant-design/icons";
import { Col, Row } from "antd";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import heroDoubles from "../../assets/storefront-hero-doubles-ocean.png";
import heroEquipment from "../../assets/storefront-hero-equipment-ocean.png";
import heroSmash from "../../assets/storefront-hero-smash-ocean.png";
import { SeoHead } from "../../components/common/SeoHead";
import { HomeFeaturedProducts } from "../../components/storefront/HomeFeaturedProducts";
import { HomeHeroCarousel } from "../../components/storefront/HomeHeroCarousel";
import { paths } from "../../routes/paths";

const categories = [
  { name: "Vợt cầu lông", description: "Kiểm soát, tốc độ và sức mạnh", symbol: "01", slug: "vot-cau-long", image: heroSmash },
  { name: "Giày cầu lông", description: "Bám sân và bảo vệ từng bước chân", symbol: "02", slug: "giay-cau-long", image: heroEquipment },
  { name: "Áo cầu lông", description: "Thoải mái trong mọi trận đấu", symbol: "03", slug: "ao-cau-long", image: heroDoubles },
  { name: "Phụ kiện cầu lông", description: "Hoàn thiện bộ trang bị của bạn", symbol: "04", slug: "phu-kien-cau-long", image: heroEquipment },
];

const shoppingGuides = [
  {
    number: "01",
    eyebrow: "Vợt cầu lông",
    title: "Chọn vợt theo trình độ và lối chơi",
    description: "So sánh trọng lượng, độ cứng thân vợt và điểm cân bằng để tìm cây vợt phù hợp với khả năng kiểm soát, phản tạt hoặc tấn công.",
    action: "Xem vợt cầu lông",
    to: paths.productsByCategory("vot-cau-long"),
  },
  {
    number: "02",
    eyebrow: "Giày cầu lông",
    title: "Ưu tiên độ ôm chân và khả năng bám sân",
    description: "Lựa chọn đúng size và cấu trúc đế giúp người chơi di chuyển ổn định hơn trong các tình huống đổi hướng liên tục trên sân.",
    action: "Xem giày cầu lông",
    to: paths.productsByCategory("giay-cau-long"),
  },
  {
    number: "03",
    eyebrow: "Tư vấn sản phẩm",
    title: "Chưa chắc nên mua gì? Hãy mô tả nhu cầu",
    description: "Cho trợ lý biết trình độ, ngân sách và phong cách thi đấu để nhận danh sách sản phẩm phù hợp từ catalog của cửa hàng.",
    action: "Tư vấn cùng AI",
    to: paths.aiAdvisor,
  },
];

const benefits = [
  { icon: <SafetyCertificateOutlined />, title: "Sản phẩm chính hãng", text: "Thông tin rõ ràng, nguồn gốc minh bạch." },
  { icon: <CustomerServiceOutlined />, title: "Hỗ trợ tận tâm", text: "Tư vấn theo nhu cầu và trình độ người chơi." },
  { icon: <ThunderboltOutlined />, title: "Mua sắm thuận tiện", text: "Tìm kiếm, so sánh và đặt hàng dễ dàng." },
];

export function HomePage() {
  const structuredData = useMemo(() => {
    const origin = window.location.origin;
    return [
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "Badminton Shop",
        url: origin,
        inLanguage: "vi-VN",
        potentialAction: {
          "@type": "SearchAction",
          target: `${origin}/products?q={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@context": "https://schema.org",
        "@type": "SportingGoodsStore",
        name: "Badminton Shop",
        url: origin,
        description: "Cửa hàng vợt, giày, trang phục và phụ kiện cầu lông với công cụ tìm kiếm và tư vấn sản phẩm theo nhu cầu.",
      },
    ];
  }, []);

  return (
    <>
      <SeoHead
        title="Badminton Shop | Vợt, giày và phụ kiện cầu lông"
        description="Khám phá vợt, giày, trang phục và phụ kiện cầu lông. So sánh sản phẩm, kiểm tra biến thể và nhận tư vấn theo nhu cầu mua sắm."
        structuredData={structuredData}
      />
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
                  <article className="category-card"><img src={category.image} alt={`Khám phá ${category.name}`} loading="lazy" decoding="async" /><span className="category-shade" /><span className="category-number">{category.symbol}</span><div><h3>{category.name}</h3><p>{category.description}</p></div><span className="category-arrow">→</span></article>
                </Link>
              </Col>
            ))}
          </Row>
        </div>
      </section>
      <HomeFeaturedProducts />
      <section className="home-shopping-guide" aria-labelledby="shopping-guide-heading">
        <div className="store-container">
          <div className="section-heading"><div><span className="eyebrow">Hướng dẫn mua sắm</span><h2 id="shopping-guide-heading">Chọn dụng cụ cầu lông đúng nhu cầu</h2></div></div>
          <div className="home-guide-grid">
            {shoppingGuides.map((guide) => (
              <article className="home-guide-card" key={guide.number}>
                <span className="home-guide-number">{guide.number}</span>
                <small>{guide.eyebrow}</small>
                <h3>{guide.title}</h3>
                <p>{guide.description}</p>
                <Link to={guide.to}>{guide.action} <span aria-hidden="true">→</span></Link>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="home-seo-intro" aria-labelledby="home-seo-heading">
        <div className="store-container home-seo-grid">
          <div><span className="eyebrow">Badminton Shop</span><h2 id="home-seo-heading">Trang bị cầu lông cho tập luyện và thi đấu</h2></div>
          <div>
            <p>Badminton Shop giúp người chơi tìm kiếm và so sánh <Link to={paths.productsByCategory("vot-cau-long")}>vợt cầu lông</Link>, <Link to={paths.productsByCategory("giay-cau-long")}>giày cầu lông</Link>, trang phục, balo và phụ kiện theo từng nhu cầu sử dụng.</p>
            <p>Catalog hiển thị giá, màu sắc, size, thông số biến thể và tình trạng tồn kho. Bạn cũng có thể khám phá sản phẩm từ <Link to={paths.productsByBrand("yonex")}>Yonex</Link>, <Link to={paths.productsByBrand("victor")}>Victor</Link> và <Link to={paths.productsByBrand("li-ning")}>Li-Ning</Link> hoặc sử dụng trợ lý tư vấn để thu hẹp lựa chọn.</p>
          </div>
        </div>
      </section>
      <section className="home-benefits"><div className="store-container"><Row gutter={[20, 20]}>{benefits.map((benefit) => <Col xs={24} md={8} key={benefit.title}><div className="benefit-item"><span className="benefit-icon">{benefit.icon}</span><div><h3>{benefit.title}</h3><p>{benefit.text}</p></div></div></Col>)}</Row></div></section>
    </>
  );
}
