import { ArrowRightOutlined, CheckCircleFilled, PictureOutlined } from "@ant-design/icons";
import { Card, Tag } from "antd";
import { useState } from "react";
import { Link } from "react-router-dom";
import type { StorefrontProduct } from "../../api/storefront/products.api";
import { paths } from "../../routes/paths";
import { formatCurrency, getPrimaryImage, getStartingPrice, getVariantPricing } from "./productPresentation";

interface ProductCardProps {
  product: StorefrontProduct;
}

export function ProductCard({ product }: ProductCardProps) {
  const image = getPrimaryImage(product.images);
  const [imageFailed, setImageFailed] = useState(false);
  const startingPrice = getStartingPrice(product);
  const variantPrices = product.variants.map((variant) => getVariantPricing(product, variant));
  const regularPrice = variantPrices.reduce<number | null>((lowest, price) => {
    if (price.salePrice == null) return lowest;
    return lowest == null ? price.regularPrice : Math.min(lowest, price.regularPrice);
  }, product.salePrice != null && product.salePrice < product.basePrice ? product.basePrice : null);
  const hasSale = regularPrice != null && regularPrice > startingPrice;
  const lowStock = product.totalStock > 0 && product.totalStock <= 5;

  return (
    <Link to={paths.productDetail(product.slug)} className="store-product-link">
      <Card className="store-product-card" hoverable>
        <div className="store-product-image">
          {image && !imageFailed ? (
            <img src={image.url} alt={image.alt || product.name} loading="lazy" decoding="async" onError={() => setImageFailed(true)} />
          ) : (
            <span className="store-product-image-fallback"><PictureOutlined /> Chưa có ảnh</span>
          )}
          <Tag className="store-product-brand">{product.brand.name}</Tag>
          {hasSale && <span className="store-product-sale-badge">Ưu đãi</span>}
        </div>
        <div className="store-product-content">
          <span className="store-product-category">{product.category.name}</span>
          <h3>{product.name}</h3>
          <div className="store-product-bottom">
            <div className="store-product-price">
              <strong>{formatCurrency(startingPrice)}</strong>
              {hasSale && <del>{formatCurrency(regularPrice)}</del>}
            </div>
            <ArrowRightOutlined aria-hidden="true" />
          </div>
          <span className={product.totalStock > 0 ? "store-product-stock" : "store-product-stock unavailable"}><CheckCircleFilled /> {product.totalStock > 0 ? (lowStock ? "Sắp hết hàng" : "Còn hàng") : "Tạm hết hàng"}</span>
        </div>
      </Card>
    </Link>
  );
}
