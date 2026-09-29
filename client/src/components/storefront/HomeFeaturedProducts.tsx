import { ArrowRightOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { Alert, Button, Col, Row, Skeleton } from "antd";
import { Link } from "react-router-dom";
import { getStorefrontProducts } from "../../api/storefront/products.api";
import { paths } from "../../routes/paths";
import { ProductCard } from "./ProductCard";

export function HomeFeaturedProducts() {
  const productsQuery = useQuery({
    queryKey: ["storefront", "home-featured-products"],
    queryFn: () => getStorefrontProducts({ page: 1, limit: 4, search: "", category: "all", brand: "all", sort: "newest" }),
  });

  return (
    <section className="home-section home-featured-products">
      <div className="store-container">
        <div className="section-heading">
          <div><span className="eyebrow">Sản phẩm mới</span><h2>Được chọn cho sân đấu</h2></div>
          <Link to={paths.products}>Xem tất cả <ArrowRightOutlined /></Link>
        </div>
        {productsQuery.data?.filters.categories.length ? <div className="home-product-category-tabs"><Link to={paths.products}>Tất cả</Link>{productsQuery.data.filters.categories.slice(0, 5).map((category) => <Link key={category.slug} to={paths.productsByCategory(category.slug)}>{category.name}</Link>)}</div> : null}
        {productsQuery.isError && <Alert type="error" showIcon message="Không thể tải sản phẩm nổi bật" action={<Button size="small" onClick={() => productsQuery.refetch()}>Thử lại</Button>} />}
        {productsQuery.isPending ? (
          <Row gutter={[20, 20]}>{Array.from({ length: 4 }, (_, index) => <Col xs={24} sm={12} lg={6} key={index}><div className="home-product-skeleton"><Skeleton active /></div></Col>)}</Row>
        ) : productsQuery.data?.products.length ? (
          <Row gutter={[20, 20]}>{productsQuery.data.products.map((product) => <Col xs={24} sm={12} lg={6} key={product.id}><ProductCard product={product} /></Col>)}</Row>
        ) : null}
      </div>
    </section>
  );
}
