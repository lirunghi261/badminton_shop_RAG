import { useQuery } from "@tanstack/react-query";
import { Alert, Button, Col, Row, Skeleton } from "antd";
import { getStorefrontProducts, type StorefrontProduct } from "../../api/storefront/products.api";
import { ProductCard } from "./ProductCard";

interface RelatedProductsProps { product: StorefrontProduct; }

export function RelatedProducts({ product }: RelatedProductsProps) {
  const relatedQuery = useQuery({
    queryKey: ["storefront", "related-products", product.id, product.category.slug],
    queryFn: () => getStorefrontProducts({ page: 1, limit: 5, search: "", category: product.category.slug, brand: "all", sort: "newest" }),
  });
  const related = relatedQuery.data?.products.filter((item) => item.id !== product.id).slice(0, 4) ?? [];

  return (
    <section className="store-related-products">
      <div className="section-heading"><div><span className="eyebrow">Có thể bạn thích</span><h2>Sản phẩm cùng danh mục</h2></div></div>
      {relatedQuery.isPending && <Row gutter={[20, 20]}>{Array.from({ length: 4 }, (_, index) => <Col xs={24} sm={12} lg={6} key={index}><div className="home-product-skeleton"><Skeleton active /></div></Col>)}</Row>}
      {relatedQuery.isError && <Alert type="warning" showIcon message="Không thể tải sản phẩm liên quan" action={<Button size="small" onClick={() => relatedQuery.refetch()}>Thử lại</Button>} />}
      {related.length > 0 && <Row gutter={[20, 20]}>{related.map((item) => <Col xs={24} sm={12} lg={6} key={item.id}><ProductCard product={item} /></Col>)}</Row>}
    </section>
  );
}
