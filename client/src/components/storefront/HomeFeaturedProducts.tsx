import { ArrowRightOutlined } from "@ant-design/icons";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Alert, Button, Empty, Skeleton } from "antd";
import { useState } from "react";
import { Link } from "react-router-dom";
import { getStorefrontProducts } from "../../api/storefront/products.api";
import { paths } from "../../routes/paths";
import { ProductCard } from "./ProductCard";

export function HomeFeaturedProducts() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const productsQuery = useQuery({
    queryKey: ["storefront", "home-featured-products", selectedCategory],
    queryFn: () => getStorefrontProducts({ page: 1, limit: 15, search: "", category: selectedCategory, brand: "all", sort: "newest" }),
    placeholderData: keepPreviousData,
  });
  const categories = productsQuery.data?.filters.categories ?? [];
  const viewAllPath = selectedCategory === "all" ? paths.products : paths.productsByCategory(selectedCategory);

  return (
    <section className="home-section home-featured-products" aria-labelledby="home-products-heading">
      <div className="store-container">
        <div className="section-heading">
          <div><span className="eyebrow">Hàng mới cập nhật</span><h2 id="home-products-heading">Sản phẩm cầu lông nổi bật</h2></div>
          <Link to={viewAllPath}>Xem tất cả <ArrowRightOutlined /></Link>
        </div>
        {categories.length ? (
          <div className="home-product-category-tabs" role="group" aria-label="Lọc sản phẩm theo danh mục">
            <button type="button" className={selectedCategory === "all" ? "active" : ""} aria-pressed={selectedCategory === "all"} onClick={() => setSelectedCategory("all")}>Tất cả</button>
            {categories.map((category) => (
              <button type="button" className={selectedCategory === category.slug ? "active" : ""} aria-pressed={selectedCategory === category.slug} key={category.slug} onClick={() => setSelectedCategory(category.slug)}>{category.name}</button>
            ))}
          </div>
        ) : null}
        {productsQuery.isError && <Alert type="error" showIcon message="Không thể tải sản phẩm nổi bật" action={<Button size="small" onClick={() => productsQuery.refetch()}>Thử lại</Button>} />}
        {productsQuery.isPending ? (
          <div className="home-product-grid">{Array.from({ length: 10 }, (_, index) => <div className="home-product-skeleton" key={index}><Skeleton active /></div>)}</div>
        ) : productsQuery.data?.products.length ? (
          <div className={productsQuery.isFetching ? "home-product-grid loading" : "home-product-grid"} aria-live="polite">
            {productsQuery.data.products.map((product) => <ProductCard product={product} key={product.id} />)}
          </div>
        ) : !productsQuery.isError ? <Empty description="Danh mục này chưa có sản phẩm" /> : null}
      </div>
    </section>
  );
}
