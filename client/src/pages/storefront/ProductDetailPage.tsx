import { ArrowLeftOutlined, CheckCircleFilled, PictureOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { App, Button, Card, Col, Result, Row, Skeleton, Tag } from "antd";
import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getStorefrontProduct, type StorefrontProduct } from "../../api/storefront/products.api";
import { ProductRichText } from "../../components/storefront/ProductRichText";
import { RelatedProducts } from "../../components/storefront/RelatedProducts";
import { ProductAvailabilityPanel } from "../../components/storefront/ProductAvailabilityPanel";
import { ProductOfferPanel } from "../../components/storefront/ProductOfferPanel";
import { formatCurrency, getPrimaryImage, getVariantName, getVariantPricing } from "../../components/storefront/productPresentation";
import { paths } from "../../routes/paths";
import { useCart } from "../../cart/useCart";

function ProductDetailLoading() {
  return (
    <section className="store-product-detail"><div className="store-container"><Card><Skeleton active avatar paragraph={{ rows: 9 }} /></Card></div></section>
  );
}

function ProductDetailContent({ product }: { product: StorefrontProduct }) {
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedSku, setSelectedSku] = useState<string | undefined>();
  const [quantity, setQuantity] = useState(1);
  const [imageFailed, setImageFailed] = useState(false);
  const { addProduct } = useCart();
  const { message } = App.useApp();
  const navigate = useNavigate();

  const images = useMemo(() => [...product.images].sort((first, second) => first.sortOrder - second.sortOrder), [product.images]);
  const activeImage = images[selectedImage] ?? getPrimaryImage(product.images);
  const selectedVariant = product.variants.find((variant) => variant.sku === selectedSku)
    ?? product.variants.find((variant) => variant.stock > 0)
    ?? product.variants[0];
  const pricing = getVariantPricing(product, selectedVariant);

  const isInStock = (selectedVariant?.stock ?? product.totalStock) > 0;
  const selectedStock = Math.max(0, Math.floor(selectedVariant?.stock ?? product.totalStock));
  const addToCart = () => {
    if (!selectedVariant) return;
    const result = addProduct(product, selectedVariant, quantity);
    if (!result) {
      message.error("Phiên bản này hiện không còn hàng. Hãy chọn một phiên bản khác.");
      return;
    }
    if (result.addedQuantity === 0) {
      message.warning("Bạn đã thêm tối đa số lượng còn trong kho vào giỏ hàng.");
      return;
    }
    message.success({
      content: <span>Đã thêm {result.addedQuantity} sản phẩm. <button className="store-message-cart-link" type="button" onClick={() => { message.destroy(); navigate(paths.cart); }}>Xem giỏ hàng</button></span>,
      duration: 4,
    });
  };
  const changeQuantity = (nextQuantity: number) => setQuantity(Math.min(Math.max(1, Number.isFinite(nextQuantity) ? Math.floor(nextQuantity) : 1), selectedStock || 1));

  return (
    <section className="store-product-detail">
      <div className="store-container">
        <Link className="store-back-link" to={paths.products}><ArrowLeftOutlined /> Tất cả sản phẩm</Link>
        <Row gutter={[38, 32]}>
          <Col xs={24} lg={11}>
            <div className="store-product-gallery">
              <div className="store-product-main-image">
                {activeImage && !imageFailed ? (
                  <img src={activeImage.url} alt={activeImage.alt || product.name} onError={() => setImageFailed(true)} />
                ) : <span><PictureOutlined /> Chưa có ảnh sản phẩm</span>}
              </div>
              {images.length > 1 && (
                <div className="store-product-thumbnails">
                  {images.map((image, index) => (
                    <button
                      className={index === selectedImage ? "active" : ""}
                      type="button"
                      key={`${image.url}-${index}`}
                      onClick={() => { setSelectedImage(index); setImageFailed(false); }}
                      aria-label={`Xem ảnh ${index + 1} của ${product.name}`}
                      aria-pressed={index === selectedImage}
                    >
                      <img src={image.url} alt="" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </Col>
          <Col xs={24} lg={13}>
            <div className="store-product-info">
              <div className="store-product-breadcrumb"><span>{product.category.name}</span><span> / </span><span>{product.brand.name}</span></div>
              <h1>{product.name}</h1>
              <div className="store-product-meta"><span>Mã sản phẩm: <strong>{selectedVariant?.sku ?? "Đang cập nhật"}</strong></span><i /><span>Thương hiệu: <strong>{product.brand.name}</strong></span></div>
              <p className="store-product-short-description">{product.shortDescription}</p>
              <div className="store-product-detail-price">
                <strong>{formatCurrency(pricing.salePrice ?? pricing.regularPrice)}</strong>
                {pricing.salePrice && <del>{formatCurrency(pricing.regularPrice)}</del>}
              </div>
              <Tag className={isInStock ? "store-stock-tag available" : "store-stock-tag unavailable"} icon={<CheckCircleFilled />}>
                {isInStock ? "Còn hàng" : "Tạm hết hàng"}
              </Tag>

              {product.variants.length > 1 && (
                <div className="store-variant-picker">
                  <span>Chọn phiên bản</span>
                  <div>
                    {product.variants.map((variant) => (
                      <button
                        type="button"
                        key={variant.sku}
                        disabled={variant.stock <= 0}
                        onClick={() => { setSelectedSku(variant.sku); setQuantity(1); }}
                        className={selectedVariant?.sku === variant.sku ? "active" : ""}
                        aria-pressed={selectedVariant?.sku === variant.sku}
                        aria-label={`${getVariantName(variant)} - ${variant.stock > 0 ? `còn ${variant.stock} sản phẩm` : "tạm hết hàng"}`}
                      >
                        {variant.colorHex && <i style={{ backgroundColor: variant.colorHex }} />}
                        <span>{getVariantName(variant)}</span>
                        <small>{variant.stock > 0 ? `Còn ${variant.stock}` : "Hết hàng"}</small>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {isInStock && <ProductOfferPanel quantity={quantity} stock={selectedStock} onQuantityChange={changeQuantity} onAddToCart={addToCart} />}
              <ProductAvailabilityPanel stock={selectedStock} variantName={selectedVariant ? getVariantName(selectedVariant) : "Đang cập nhật"} />
            </div>
          </Col>
        </Row>

        <Row gutter={[24, 24]} className="store-product-detail-sections">
          <Col xs={24} lg={product.specifications.length ? 14 : 24}>
            <Card title="Mô tả sản phẩm" className="store-detail-card">
              <ProductRichText html={product.description} fallback={product.shortDescription} />
            </Card>
          </Col>
          {product.specifications.length > 0 && (
            <Col xs={24} lg={10}>
              <Card title="Thông số kỹ thuật" className="store-detail-card">
                <dl className="store-specifications">
                  {product.specifications.map((specification) => (
                    <div key={specification.key}>
                      <dt>{specification.label}</dt>
                      <dd>{String(specification.value)}{specification.unit ? ` ${specification.unit}` : ""}</dd>
                    </div>
                  ))}
                </dl>
              </Card>
            </Col>
          )}
        </Row>
        <RelatedProducts product={product} />
      </div>
    </section>
  );
}

export function ProductDetailPage() {
  const { slug = "" } = useParams();
  const productQuery = useQuery({
    queryKey: ["storefront", "product", slug],
    queryFn: () => getStorefrontProduct(slug),
    enabled: Boolean(slug),
  });

  if (productQuery.isPending) return <ProductDetailLoading />;

  if (productQuery.isError || !productQuery.data) {
    return (
      <section className="store-product-detail"><div className="store-container"><Result
        status="404"
        title="Không tìm thấy sản phẩm"
        subTitle="Sản phẩm có thể đã hết bán hoặc đường dẫn không còn hợp lệ."
        extra={<Link to={paths.products}><Button type="primary">Quay lại danh sách sản phẩm</Button></Link>}
      /></div></section>
    );
  }

  return <ProductDetailContent key={productQuery.data.id} product={productQuery.data} />;
}
