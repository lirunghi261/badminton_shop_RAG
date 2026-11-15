import { ShoppingCartOutlined } from "@ant-design/icons";
import { useMutation } from "@tanstack/react-query";
import { App, Button, Select } from "antd";
import { isAxiosError } from "axios";
import { useState } from "react";
import { Link } from "react-router-dom";
import { getStorefrontProduct, type StorefrontProduct, type StorefrontProductVariant } from "../../api/storefront/products.api";
import { useCart } from "../../cart/useCart";
import { paths } from "../../routes/paths";
import { formatCurrency, getVariantName, getVariantPricing } from "./productPresentation";

function unitPrice(product: StorefrontProduct, variant: StorefrontProductVariant) {
  const { salePrice, regularPrice } = getVariantPricing(product, variant);
  return salePrice ?? regularPrice;
}

export function AdvisorCartAction({ product }: { product: StorefrontProduct }) {
  const { items, addProduct } = useCart();
  const { message } = App.useApp();
  const [current, setCurrent] = useState<StorefrontProduct>();
  const [sku, setSku] = useState<string>();
  const [notice, setNotice] = useState<{ text: string; showCart?: boolean }>();
  const [unavailable, setUnavailable] = useState(false);
  const selected = current?.variants.find((variant) => variant.sku === sku);
  const selectedQuantity = items.find((item) => item.productId === product.id && item.variantSku === sku)?.quantity ?? 0;

  const check = useMutation({
    mutationFn: (_selection: { sku: string; price: number } | null) => getStorefrontProduct(product.slug),
    onSuccess: (fresh, selection) => {
      if (fresh.id !== product.id) {
        setUnavailable(true);
        setNotice({ text: "Gợi ý này không còn khả dụng. Hãy tìm sản phẩm khác." });
        return;
      }

      setCurrent(fresh);
      if (!fresh.variants.some((variant) => variant.stock >= 1)) {
        setSku(undefined);
        setNotice({ text: "Sản phẩm hiện hết hàng. Hãy chọn sản phẩm khác." });
        return;
      }
      if (!selection) return;

      const variant = fresh.variants.find((candidate) => candidate.sku === selection.sku);
      if (!variant || variant.stock < 1) {
        setSku(undefined);
        setNotice({ text: "Phiên bản vừa chọn đã hết hàng hoặc không còn bán. Hãy chọn phiên bản khác." });
        return;
      }
      if (unitPrice(fresh, variant) !== selection.price) {
        setNotice({ text: "Giá đã thay đổi. Hãy xem giá mới rồi bấm thêm vào giỏ lần nữa nếu bạn đồng ý." });
        return;
      }
      const inCart = items.find((item) => item.productId === fresh.id && item.variantSku === variant.sku)?.quantity ?? 0;
      const stock = Math.floor(variant.stock);
      const showStockLimit = () => {
        const text = `Giỏ đã đạt giới hạn tồn kho (trong giỏ: ${inCart}, tồn kho: ${stock}). Số lượng không tăng.`;
        setNotice({ text, showCart: true });
        void message.warning({ key: `advisor-cart-limit:${fresh.id}:${variant.sku}`, content: text });
      };
      if (inCart >= stock) {
        showStockLimit();
        return;
      }
      const result = addProduct(fresh, variant);
      if (result?.addedQuantity === 0) {
        showStockLimit();
        return;
      }
      if (!result) {
        setNotice({ text: "Chưa thể thêm phiên bản này. Hãy kiểm tra giỏ hàng.", showCart: true });
        return;
      }
      setNotice({ text: "Đã thêm 1 sản phẩm vào giỏ.", showCart: true });
    },
    onError: (error) => {
      if (isAxiosError(error) && error.response?.status === 404) {
        setUnavailable(true);
        setNotice({ text: "Sản phẩm không còn bán. Hãy chọn sản phẩm khác." });
      } else {
        setNotice({ text: "Chưa kiểm tra được giá và tồn kho. Vui lòng thử lại." });
      }
    },
  });

  function verify(selection: { sku: string; price: number } | null) {
    setNotice(undefined);
    check.mutate(selection);
  }

  return (
    <div className="advisor-cart-action">
      {!unavailable && (
        current?.variants.some((variant) => variant.stock >= 1) ? (
          <div className="advisor-cart-controls">
            <Select
              aria-label={`Phiên bản của ${product.name}`}
              placeholder="Chọn phiên bản"
              value={sku}
              disabled={check.isPending}
              onChange={(value) => { setSku(value); setNotice(undefined); }}
              options={current.variants.map((variant) => ({
                value: variant.sku,
                label: `${getVariantName(variant) || variant.sku} · ${variant.sku}`,
                disabled: variant.stock < 1,
              }))}
            />
            {selected && (
              <span className="advisor-cart-price">
                {formatCurrency(unitPrice(current, selected))} · Tồn kho: {selected.stock} · Trong giỏ: {selectedQuantity}
              </span>
            )}
            <Button
              size="small"
              icon={<ShoppingCartOutlined />}
              disabled={!selected}
              loading={check.isPending}
              onClick={() => selected && verify({ sku: selected.sku, price: unitPrice(current, selected) })}
            >
              Thêm vào giỏ
            </Button>
          </div>
        ) : (
          <Button size="small" loading={check.isPending} onClick={() => verify(null)}>
            {current ? "Kiểm tra lại tồn kho" : "Chọn phiên bản"}
          </Button>
        )
      )}
      {notice && (
        <div className="advisor-cart-notice" role="status">
          {notice.text}{" "}
          {notice.showCart && <Link to={paths.cart}>Xem giỏ hàng</Link>}
        </div>
      )}
    </div>
  );
}
