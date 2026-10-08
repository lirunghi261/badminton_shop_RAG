import { ArrowRightOutlined, CompassOutlined, RobotOutlined } from "@ant-design/icons";
import { Link } from "react-router-dom";
import { paths } from "../../routes/paths";

const advisorInputs = ["Trình độ hiện tại", "Lối chơi mong muốn", "Khoảng ngân sách"];

export function HomeAdvisorSection() {
  return (
    <section className="home-advisor-section" aria-labelledby="home-advisor-title">
      <div className="store-container">
        <div className="home-advisor-panel">
          <div className="home-advisor-copy">
            <span className="home-advisor-eyebrow"><RobotOutlined /> Tư vấn chọn dụng cụ</span>
            <h2 id="home-advisor-title">Chưa biết sản phẩm nào hợp với bạn?</h2>
            <p>
              Mô tả nhu cầu bằng một câu. Trợ lý sẽ đối chiếu với sản phẩm đang có để giúp bạn thu hẹp lựa chọn.
            </p>
            <Link className="home-advisor-cta" to={paths.aiAdvisor}>
              Bắt đầu tư vấn <ArrowRightOutlined />
            </Link>
          </div>

          <div className="home-advisor-guide" aria-label="Thông tin cần cho buổi tư vấn">
            <span className="home-advisor-guide-icon"><CompassOutlined /></span>
            <div>
              <span className="home-advisor-guide-label">Chỉ cần cho biết</span>
              <ul>
                {advisorInputs.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
