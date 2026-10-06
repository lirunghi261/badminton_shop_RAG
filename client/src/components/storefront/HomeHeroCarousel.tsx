import { ArrowRightOutlined, LeftOutlined, RightOutlined, RobotOutlined, ShoppingOutlined } from "@ant-design/icons";
import { Button } from "antd";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import heroDoubles from "../../assets/storefront-hero-doubles-ocean.png";
import heroEquipment from "../../assets/storefront-hero-equipment-ocean.png";
import heroFlatlay from "../../assets/storefront-hero-flatlay-sunrise.png";
import heroFutureCourt from "../../assets/storefront-hero-future-court.png";
import heroNeonSmash from "../../assets/storefront-hero-neon-smash.png";
import heroSmash from "../../assets/storefront-hero-smash-ocean.png";
import heroTournament from "../../assets/storefront-hero-tournament.png";
import { paths } from "../../routes/paths";

const slides = [
  {
    image: heroSmash,
    eyebrow: "Badminton · Performance",
    title: "Nâng tầm từng cú đánh.",
    description: "Chọn đúng cây vợt, đôi giày và phụ kiện để tự tin làm chủ nhịp độ trên sân.",
    action: "Khám phá sản phẩm",
    to: paths.products,
  },
  {
    image: heroEquipment,
    eyebrow: "Trang bị toàn diện",
    title: "Sẵn sàng cho mọi trận đấu.",
    description: "Từ vợt, giày đến phụ kiện — tất cả được chọn lọc để phù hợp với hành trình tập luyện của bạn.",
    action: "Xem bộ sưu tập",
    to: paths.products,
  },
  {
    image: heroDoubles,
    eyebrow: "Tư vấn theo lối chơi",
    title: "Tìm dụng cụ hợp với bạn.",
    description: "Nói với trợ lý AI về trình độ, ngân sách và lối chơi để nhận gợi ý sản phẩm phù hợp.",
    action: "Tư vấn cùng AI",
    to: paths.aiAdvisor,
  },
  {
    image: heroNeonSmash,
    eyebrow: "Vợt cho lối chơi tấn công",
    title: "Bật tốc ở những pha quyết định.",
    description: "Khám phá các lựa chọn hỗ trợ phản tạt nhanh, vung vợt chắc tay và kiểm soát hướng cầu tốt hơn.",
    action: "Khám phá vợt",
    to: paths.productsByCategory("vot-cau-long"),
  },
  {
    image: heroFutureCourt,
    eyebrow: "Chuẩn bị cho buổi tập",
    title: "Giữ nhịp độ theo cách của bạn.",
    description: "Từ giày bám sân đến vợt linh hoạt, chọn trang bị phù hợp để tự tin di chuyển qua từng set đấu.",
    action: "Chọn trang bị",
    to: paths.products,
  },
  {
    image: heroFlatlay,
    eyebrow: "Những món cần có",
    title: "Hoàn thiện túi đồ tập.",
    description: "Giày, ống cầu, quấn cán và phụ kiện thiết yếu được gom lại để bạn chuẩn bị gọn gàng trước khi ra sân.",
    action: "Xem phụ kiện",
    to: paths.productsByCategory("phu-kien-cau-long"),
  },
  {
    image: heroTournament,
    eyebrow: "Sẵn sàng thi đấu",
    title: "Tự tin trong từng điểm số.",
    description: "Để mục tiêu, ngân sách và lối chơi của bạn dẫn đường cho lựa chọn dụng cụ phù hợp.",
    action: "Nhờ AI tư vấn",
    to: paths.aiAdvisor,
  },
];

export function HomeHeroCarousel() {
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    const interval = window.setInterval(() => setActiveSlide((current) => (current + 1) % slides.length), 6500);
    return () => window.clearInterval(interval);
  }, []);

  const current = slides[activeSlide];
  const previous = () => setActiveSlide((currentSlide) => (currentSlide + slides.length - 1) % slides.length);
  const next = () => setActiveSlide((currentSlide) => (currentSlide + 1) % slides.length);

  return (
    <section className="home-hero-carousel" aria-roledescription="carousel" aria-label="Banner nổi bật">
      <img
        key={current.image}
        className="home-hero-image active"
        src={current.image}
        alt=""
        loading={activeSlide === 0 ? "eager" : "lazy"}
        fetchPriority={activeSlide === 0 ? "high" : "low"}
        decoding="async"
        aria-hidden="true"
      />
      <div className="home-hero-shade" />
      <div className="store-container home-hero-content">
        <p className="home-hero-eyebrow">{current.eyebrow}</p>
        {activeSlide === 0 && <span className="home-hero-sale-badge">Ưu đãi sân đấu</span>}
        <h1>{current.title}</h1>
        <p>{current.description}</p>
        <div className="home-hero-actions">
          <Link to={current.to}><Button type="primary" size="large" icon={current.to === paths.aiAdvisor ? <RobotOutlined /> : <ShoppingOutlined />}>{current.action}</Button></Link>
          <Link to={paths.products} className="home-hero-secondary">Xem tất cả <ArrowRightOutlined /></Link>
        </div>
      </div>
      <button className="home-hero-arrow home-hero-arrow-left" type="button" onClick={previous} aria-label="Banner trước"><LeftOutlined /></button>
      <button className="home-hero-arrow home-hero-arrow-right" type="button" onClick={next} aria-label="Banner tiếp theo"><RightOutlined /></button>
      <div className="home-hero-dots" role="tablist" aria-label="Chọn banner">
        {slides.map((slide, index) => (
          <button
            type="button"
            key={slide.title}
            className={index === activeSlide ? "active" : ""}
            role="tab"
            aria-selected={index === activeSlide}
            aria-label={`Hiển thị banner ${index + 1}`}
            onClick={() => setActiveSlide(index)}
          />
        ))}
      </div>
    </section>
  );
}
