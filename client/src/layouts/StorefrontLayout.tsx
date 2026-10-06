import {
  EnvironmentOutlined,
  MenuOutlined,
  PhoneOutlined,
  RobotOutlined,
  SearchOutlined,
  ShoppingCartOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Badge, Button, Drawer, Input } from "antd";
import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { StoreLogo } from "../components/storefront/StoreLogo";
import { useCart } from "../cart/useCart";
import { paths } from "../routes/paths";

const navigation = [
  { label: "Trang chủ", to: paths.home },
  { label: "Sản phẩm", to: paths.products },
  { label: "Tư vấn AI", to: paths.aiAdvisor, icon: <RobotOutlined /> },
];

export function StorefrontLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const { itemCount } = useCart();
  const submitSearch = () => navigate(search.trim() ? `${paths.products}?q=${encodeURIComponent(search.trim())}` : paths.products);

  const navLinks = (
    <nav className="store-nav" aria-label="Điều hướng chính">
      {navigation.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === paths.home}
          onClick={() => setMenuOpen(false)}
          className={({ isActive }) => (isActive ? "store-nav-link active" : "store-nav-link")}
        >
          {item.icon}
          {item.label}
        </NavLink>
      ))}
    </nav>
  );

  return (
    <div className="store-shell" id="store-top">
      <a className="store-skip-link" href="#store-main">Đi đến nội dung chính</a>
      <header className="store-header">
        <div className="store-utility-bar"><div className="store-container"><span><PhoneOutlined /> Hotline: <strong>0977 508 430</strong></span><span><EnvironmentOutlined /> Hệ thống cửa hàng</span></div></div>
        <div className="store-container store-header-inner">
          <StoreLogo />
          <div className="store-header-search">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onPressEnter={submitSearch}
              placeholder="Tìm sản phẩm, thương hiệu hoặc SKU..."
              suffix={<Button type="text" shape="circle" icon={<SearchOutlined />} onClick={submitSearch} aria-label="Tìm kiếm" />}
            />
          </div>
          <div className="store-actions">
            <Button className="store-action-button" type="text" icon={<UserOutlined />} aria-label="Tài khoản" onClick={() => navigate(paths.account)}><span>Tài khoản</span></Button>
            <Badge count={itemCount} showZero={false}>
              <Button className="store-action-button" type="text" icon={<ShoppingCartOutlined />} aria-label="Giỏ hàng" onClick={() => navigate(paths.cart)}><span>Giỏ hàng</span></Button>
            </Badge>
            <Button className="mobile-menu-button" type="text" shape="circle" icon={<MenuOutlined />} aria-label="Mở menu" onClick={() => setMenuOpen(true)} />
          </div>
        </div>
        <div className="store-nav-bar"><div className="store-container desktop-nav">{navLinks}</div></div>
      </header>

      <main id="store-main" tabIndex={-1}>
        <Outlet />
      </main>

      <footer className="store-footer">
        <div className="store-container">
          <div className="store-footer-grid">
            <div><StoreLogo variant="footer" /><p>Không gian mua sắm dành cho người yêu cầu lông — từ những buổi tập đầu tiên đến các trận đấu đầy thử thách.</p><strong>Chơi hết mình, chọn đúng dụng cụ.</strong></div>
            <div><h2>Hỗ trợ mua sắm</h2><ul><li>Tư vấn sản phẩm theo nhu cầu</li><li>Kiểm tra tình trạng đơn hàng</li><li>Thông tin giao nhận</li><li>Đổi trả và bảo hành</li></ul></div>
            <div><h2>Chính sách</h2><ul><li>Cam kết sản phẩm chính hãng</li><li>Chính sách bảo mật</li><li>Phương thức thanh toán</li><li>Điều khoản sử dụng</li></ul></div>
            <div><h2>Liên hệ</h2><p>Hotline<br /><strong>0977 508 430</strong></p><p>Hệ thống cửa hàng<br /><strong>Tư vấn trong giờ hành chính</strong></p></div>
          </div>
          <div className="store-footer-bottom"><span>© {new Date().getFullYear()} Badminton Shop.</span><a href="#store-top">Về đầu trang ↑</a></div>
        </div>
      </footer>

      <Drawer title="Danh mục" placement="right" open={menuOpen} onClose={() => setMenuOpen(false)}>
        <div className="mobile-nav">{navLinks}</div>
      </Drawer>
    </div>
  );
}
