import { DeleteOutlined, MinusOutlined, PlusOutlined, ShoppingOutlined } from "@ant-design/icons";
import { Alert, Button, Card, Empty, InputNumber, Popconfirm } from "antd";
import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../../cart/useCart";
import { formatCurrency } from "../../components/storefront/productPresentation";
import { paths } from "../../routes/paths";

export function CartPage() {
  const { items, itemCount, subtotal, updateQuantity, removeItem, clearCart, refreshCart, isSyncing,
    hasUnavailableItems, hasPriceChanges, syncError, acceptPrices } = useCart();
  const navigate = useNavigate();

  useEffect(() => { void refreshCart(); }, [refreshCart]);

  if (!items.length) {
    return (
      <section className="store-cart-page"><div className="store-container store-cart-empty">
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Giỏ hàng của bạn đang trống">
          <Link to={paths.products}><Button type="primary" icon={<ShoppingOutlined />}>Khám phá sản phẩm</Button></Link>
        </Empty>
      </div></section>
    );
  }

  return (
    <section className="store-cart-page">
      <div className="store-container">
        <div className="store-cart-heading">
          <div><span className="eyebrow">Giỏ hàng</span><h1>Sản phẩm bạn đã chọn</h1></div>
          <div>
            <Button type="text" loading={isSyncing} onClick={() => void refreshCart()}>Cập nhật giỏ hàng</Button>
            <Popconfirm title="Xóa toàn bộ giỏ hàng?" description="Thao tác này không thể hoàn tác." okText="Xóa giỏ hàng" cancelText="Hủy" onConfirm={clearCart}>
              <Button danger type="text" icon={<DeleteOutlined />}>Xóa tất cả</Button>
            </Popconfirm>
          </div>
        </div>
        <div className="store-cart-progress"><span className="active">1. Giỏ hàng</span><i /> <span>2. Thông tin giao nhận</span><i /> <span>3. Xác nhận đơn</span></div>
        {hasUnavailableItems && <Alert className="store-cart-notice" type="warning" showIcon message="Có sản phẩm không còn hàng" description="Hãy xoá sản phẩm hết hàng trước khi tiếp tục đặt hàng." />}
        {syncError && <Alert className="store-cart-notice" type="error" showIcon message="Chưa kiểm tra được giá và tồn kho" description="Giỏ hàng vẫn được giữ. Hãy bấm Cập nhật giỏ hàng để thử lại." />}
        {hasPriceChanges && <Alert className="store-cart-notice" type="warning" showIcon message="Giá sản phẩm đã thay đổi"
          description="Xem giá mới trong giỏ và xác nhận trước khi tiếp tục."
          action={<Button disabled={isSyncing} onClick={acceptPrices}>Xác nhận giá mới</Button>} />}
        <div className="store-cart-layout">
          <div className="store-cart-items">
            {items.map((item) => (
              <Card className="store-cart-item" key={item.key}>
                <div className="store-cart-image">
                  {item.imageUrl ? <img src={item.imageUrl} alt={item.imageAlt} /> : <ShoppingOutlined />}
                </div>
                <div className="store-cart-item-info">
                  <Link to={paths.productDetail(item.slug)}>{item.name}</Link>
                  <span>{item.variantName}{item.colorHex && <i style={{ backgroundColor: item.colorHex }} />}</span>
                  <small>SKU: {item.variantSku} · {
                    item.availabilityIssue === "PRODUCT_UNAVAILABLE" || item.availabilityIssue === "SKU_UNAVAILABLE"
                      ? "Không còn bán" : item.stock > 0 ? `Còn ${item.stock}` : "Tạm hết hàng"
                  }</small>
                  {item.priceChanged && <small>Đã cập nhật giá</small>}
                </div>
                <strong className="store-cart-item-price">{formatCurrency(item.price)}</strong>
                <div className="store-quantity-control">
                  <Button size="small" shape="circle" icon={<MinusOutlined />} disabled={item.stock < 1} aria-label={`Giảm số lượng ${item.name}`} onClick={() => updateQuantity(item.key, item.quantity - 1)} />
                  <InputNumber min={1} max={Math.min(item.stock, 999)} step={1} precision={0} value={item.quantity} disabled={item.stock < 1} controls={false} aria-label={`Số lượng ${item.name}`} onChange={(value) => { if (value !== null) updateQuantity(item.key, value); }} />
                  <Button size="small" shape="circle" icon={<PlusOutlined />} disabled={item.quantity >= Math.min(item.stock, 999)} aria-label={`Tăng số lượng ${item.name}`} onClick={() => updateQuantity(item.key, item.quantity + 1)} />
                </div>
                <div className="store-cart-line-total">
                  <strong>{formatCurrency(item.price * item.quantity)}</strong>
                  <Button type="text" danger shape="circle" icon={<DeleteOutlined />} aria-label={`Xóa ${item.name}`} onClick={() => removeItem(item.key)} />
                </div>
              </Card>
            ))}
          </div>
          <aside className="store-cart-summary-shell">
            <Card className="store-cart-summary" title="Tóm tắt đơn hàng">
              <div><span>Tạm tính ({itemCount} sản phẩm)</span><strong>{formatCurrency(subtotal)}</strong></div>
              <div><span>Phí vận chuyển</span><span>Chọn ở bước đặt hàng</span></div>
              <div className="store-cart-total"><span>Tổng tạm tính</span><strong>{formatCurrency(subtotal)}</strong></div>
              <Alert type="info" showIcon message="Kiểm tra địa chỉ và phương thức thanh toán ở bước tiếp theo." />
              <Button type="primary" size="large" block loading={isSyncing} disabled={hasPriceChanges || hasUnavailableItems}
                onClick={async () => { if (await refreshCart()) navigate(paths.checkout); }}>Tiến hành đặt hàng</Button>
              <Link to={paths.products} className="store-cart-continue">← Tiếp tục mua sắm</Link>
            </Card>
            <p className="store-cart-summary-note">Bạn vẫn có thể điều chỉnh số lượng hoặc xoá sản phẩm trước khi sang bước nhập thông tin nhận hàng.</p>
          </aside>
        </div>
      </div>
    </section>
  );
}
