import {
  ArrowRightOutlined,
  CompassOutlined,
  RocketOutlined,
  ShoppingOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import { Link } from "react-router-dom";
import { paths } from "../../routes/paths";

const shoppingJourneys = [
  {
    id: "start",
    eyebrow: "Mới bắt đầu",
    title: "Chọn bộ đầu tiên thật dễ",
    description: "Cho biết trình độ và ngân sách để nhận gợi ý vừa sức, dễ làm quen.",
    action: "Nhờ AI gợi ý",
    to: paths.aiAdvisor,
    icon: <CompassOutlined />,
  },
  {
    id: "attack",
    eyebrow: "Ưu tiên tấn công",
    title: "Tìm cây vợt hợp lối đánh",
    description: "Khám phá vợt theo độ cứng, trọng lượng và cảm giác đánh.",
    action: "Xem vợt cầu lông",
    to: paths.productsByCategory("vot-cau-long"),
    icon: <RocketOutlined />,
  },
  {
    id: "movement",
    eyebrow: "Di chuyển tự tin",
    title: "Chọn giày bám sân hơn",
    description: "Ưu tiên độ ôm chân và phần đế phù hợp cho các pha đổi hướng.",
    action: "Xem giày cầu lông",
    to: paths.productsByCategory("giay-cau-long"),
    icon: <ThunderboltOutlined />,
  },
  {
    id: "gear",
    eyebrow: "Hoàn thiện buổi tập",
    title: "Bổ sung phụ kiện cần thiết",
    description: "Túi vợt, quấn cán và phụ kiện gọn gàng cho mỗi lần ra sân.",
    action: "Xem phụ kiện",
    to: paths.productsByCategory("phu-kien-cau-long"),
    icon: <ShoppingOutlined />,
  },
];

export function HomeShoppingJourney() {
  return (
    <section className="home-journey" aria-labelledby="home-journey-heading">
      <div className="store-container">
        <div className="home-journey-shell">
          <div className="home-journey-core">
            <div className="home-journey-heading">
              <div>
                <span className="home-journey-eyebrow">Khởi đầu nhanh</span>
                <h2 id="home-journey-heading">Bạn muốn nâng cấp điều gì hôm nay?</h2>
              </div>
              <p>Chọn một nhu cầu để đến đúng nhóm sản phẩm, hoặc để trợ lý cùng bạn tìm phương án phù hợp.</p>
            </div>
            <div className="home-journey-grid">
              {shoppingJourneys.map((journey) => (
                <Link className={`home-journey-card home-journey-card-${journey.id}`} key={journey.id} to={journey.to}>
                  <article className="home-journey-card-core">
                    <span className="home-journey-icon" aria-hidden="true">{journey.icon}</span>
                    <span className="home-journey-copy">
                      <span className="home-journey-label">{journey.eyebrow}</span>
                      <h3>{journey.title}</h3>
                      <span>{journey.description}</span>
                    </span>
                    <span className="home-journey-action">
                      <span>{journey.action}</span>
                      <span className="home-journey-action-icon" aria-hidden="true"><ArrowRightOutlined /></span>
                    </span>
                  </article>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
