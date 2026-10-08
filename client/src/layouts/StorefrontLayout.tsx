import {
  DownOutlined,
  MenuOutlined,
  RobotOutlined,
  SearchOutlined,
  ShoppingCartOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Badge, Button, Drawer, Input } from "antd";
import { useMemo, useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { getStorefrontProducts } from "../api/storefront/products.api";
import { StoreLogo } from "../components/storefront/StoreLogo";
import { StoreMegaMenu } from "../components/storefront/StoreMegaMenu";
import { useCart } from "../cart/useCart";
import { paths } from "../routes/paths";

export function StorefrontLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [megaMenuOpen, setMegaMenuOpen] = useState(false);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const { itemCount } = useCart();
  const catalogQuery = useQuery({
    queryKey: ["storefront", "navigation-catalog"],
    queryFn: () => getStorefrontProducts({ page: 1, limit: 48, search: "", category: "all", brand: "all", sort: "newest" }),
    staleTime: 5 * 60 * 1000,
  });
  const categories = catalogQuery.data?.filters.categories ?? [];
  const brandsByCategory = useMemo(() => {
    const groups: Record<string, Array<{ name: string; slug: string }>> = {};
    for (const product of catalogQuery.data?.products ?? []) {
      const group = groups[product.category.slug] ?? [];
      if (!group.some((brand) => brand.slug === product.brand.slug)) group.push(product.brand);
      groups[product.category.slug] = group;
    }
    return groups;
  }, [catalogQuery.data?.products]);
  const submitSearch = () => navigate(search.trim() ? `${paths.products}?q=${encodeURIComponent(search.trim())}` : paths.products);

  const navLinks = (
    <nav className="store-nav" aria-label="Điều hướng chính">
      <NavLink to={paths.home} end onMouseEnter={() => setMegaMenuOpen(false)} className={({ isActive }) => (isActive ? "store-nav-link active" : "store-nav-link")}>Trang chủ</NavLink>
      <NavLink
        to={paths.products}
        className={({ isActive }) => (isActive ? "store-nav-link store-nav-menu-trigger active" : "store-nav-link store-nav-menu-trigger")}
        aria-haspopup="true"
        aria-expanded={megaMenuOpen}
        onMouseEnter={() => { if (categories.length) setMegaMenuOpen(true); }}
        onFocus={() => { if (categories.length) setMegaMenuOpen(true); }}
      >
        Sản phẩm <DownOutlined />
      </NavLink>
      <NavLink to={paths.aiAdvisor} onMouseEnter={() => setMegaMenuOpen(false)} className={({ isActive }) => (isActive ? "store-nav-link active" : "store-nav-link")}><RobotOutlined /> Tư vấn AI</NavLink>
    </nav>
  );

  return (
    <div className="store-shell" id="store-top">
      <a className="store-skip-link" href="#store-main">Đi đến nội dung chính</a>
      <header
        className="store-header"
        onMouseLeave={() => setMegaMenuOpen(false)}
        onKeyDown={(event) => { if (event.key === "Escape") setMegaMenuOpen(false); }}
        onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setMegaMenuOpen(false); }}
      >
        <div className="store-container store-header-inner">
          <StoreLogo />
          <div className="desktop-nav">{navLinks}</div>
          <form className="store-header-search" role="search" onMouseEnter={() => setMegaMenuOpen(false)} onSubmit={(event) => { event.preventDefault(); submitSearch(); }}>
            <Input
              name="store-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              autoComplete="off"
              spellCheck={false}
              placeholder="Tìm sản phẩm, thương hiệu hoặc SKU…"
              suffix={<Button type="text" htmlType="submit" shape="circle" icon={<SearchOutlined />} aria-label="Tìm kiếm" />}
            />
          </form>
          <div className="store-actions">
            <Link className="store-action-link" to={paths.account} aria-label="Tài khoản"><UserOutlined aria-hidden="true" /><span>Tài khoản</span></Link>
            <Badge count={itemCount} showZero={false}>
              <Link className="store-action-link" to={paths.cart} aria-label={`Giỏ hàng, ${itemCount} sản phẩm`}><ShoppingCartOutlined aria-hidden="true" /><span>Giỏ hàng</span></Link>
            </Badge>
            <Button className="mobile-menu-button" type="text" shape="circle" icon={<MenuOutlined />} aria-label="Mở menu" onClick={() => setMenuOpen(true)} />
          </div>
        </div>
        {megaMenuOpen && categories.length > 0 ? (
          <StoreMegaMenu categories={categories} brandsByCategory={brandsByCategory} onNavigate={() => setMegaMenuOpen(false)} />
        ) : null}
      </header>

      <main id="store-main" tabIndex={-1}>
        <Outlet />
      </main>

      <footer className="store-footer">
        <div className="store-container">
          <div className="store-footer-grid">
            <div><StoreLogo variant="footer" /><p>Không gian mua sắm dành cho người yêu cầu lông, từ buổi tập đầu tiên đến những trận đấu đầy thử thách.</p><strong>Chơi hết mình, chọn đúng dụng cụ.</strong></div>
            <div><h2>Hỗ trợ mua sắm</h2><ul><li>Tư vấn sản phẩm theo nhu cầu</li><li>Kiểm tra tình trạng đơn hàng</li><li>Thông tin giao nhận</li><li>Đổi trả và bảo hành</li></ul></div>
            <div><h2>Chính sách</h2><ul><li>Cam kết sản phẩm chính hãng</li><li>Chính sách bảo mật</li><li>Phương thức thanh toán</li><li>Điều khoản sử dụng</li></ul></div>
            <div><h2>Liên hệ</h2><p>Hotline<br /><strong>0977 508 430</strong></p><p>Hệ thống cửa hàng<br /><strong>Tư vấn trong giờ hành chính</strong></p></div>
          </div>
          <div className="store-footer-bottom"><span>© {new Date().getFullYear()} Badminton Shop.</span><a href="#store-top">Về đầu trang ↑</a></div>
        </div>
      </footer>

      <Drawer rootClassName="store-mobile-drawer" title="Danh mục" placement="right" open={menuOpen} onClose={() => setMenuOpen(false)}>
        <div className="mobile-nav">
          <NavLink to={paths.home} end onClick={() => setMenuOpen(false)} className={({ isActive }) => (isActive ? "store-nav-link active" : "store-nav-link")}>Trang chủ</NavLink>
          <Link className="store-nav-link" to={paths.products} onClick={() => setMenuOpen(false)}>Tất cả sản phẩm</Link>
          {categories.map((category) => <Link className="store-mobile-category-link" key={category.slug} to={paths.productsByCategory(category.slug)} onClick={() => setMenuOpen(false)}>{category.name}</Link>)}
          <NavLink to={paths.aiAdvisor} onClick={() => setMenuOpen(false)} className={({ isActive }) => (isActive ? "store-nav-link active" : "store-nav-link")}><RobotOutlined /> Tư vấn AI</NavLink>
        </div>
      </Drawer>
    </div>
  );
}
