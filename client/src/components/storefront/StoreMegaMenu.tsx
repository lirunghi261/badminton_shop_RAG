import { ArrowRightOutlined } from "@ant-design/icons";
import { Link } from "react-router-dom";
import { paths } from "../../routes/paths";

interface MegaMenuReference {
  name: string;
  slug: string;
}

interface StoreMegaMenuProps {
  categories: MegaMenuReference[];
  brandsByCategory: Record<string, MegaMenuReference[]>;
  onNavigate: () => void;
}

export function StoreMegaMenu({ categories, brandsByCategory, onNavigate }: StoreMegaMenuProps) {
  return (
    <div className="store-mega-menu" role="region" aria-label="Danh mục sản phẩm">
      <div className="store-container">
        <div className="store-mega-heading">
          <div>
            <h2>Danh mục sản phẩm</h2>
            <p>Chọn loại dụng cụ, sau đó lọc nhanh theo thương hiệu.</p>
          </div>
          <Link to={paths.products} onClick={onNavigate}>Xem tất cả sản phẩm <ArrowRightOutlined /></Link>
        </div>

        <div className="store-mega-grid">
          {categories.slice(0, 10).map((category) => (
            <section className="store-mega-group" key={category.slug}>
              <Link className="store-mega-category" to={paths.productsByCategory(category.slug)} onClick={onNavigate}>
                {category.name}
              </Link>
              <div className="store-mega-brand-links">
                {(brandsByCategory[category.slug] ?? []).slice(0, 6).map((brand) => (
                  <Link
                    key={`${category.slug}-${brand.slug}`}
                    to={paths.productsByCategoryAndBrand(category.slug, brand.slug)}
                    onClick={onNavigate}
                  >
                    {category.name.replace(/ cầu lông/gi, "")} {brand.name}
                  </Link>
                ))}
                <Link className="store-mega-more" to={paths.productsByCategory(category.slug)} onClick={onNavigate}>
                  Xem toàn bộ
                </Link>
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
