import { CheckCircleFilled, GiftOutlined, MinusOutlined, PlusOutlined, SafetyCertificateOutlined, ShoppingOutlined, TruckOutlined } from "@ant-design/icons";
import { Button, InputNumber } from "antd";

interface ProductOfferPanelProps {
  quantity: number;
  stock: number;
  onQuantityChange: (quantity: number) => void;
  onAddToCart: () => void;
}

export function ProductOfferPanel({ quantity, stock, onQuantityChange, onAddToCart }: ProductOfferPanelProps) {
  return (
    <div className="store-product-offer-panel">
      <div className="store-product-offer-heading"><GiftOutlined /><div><strong>Ưu đãi và hỗ trợ mua sắm</strong><span>Thông tin rõ ràng trước khi bạn thêm vào giỏ.</span></div></div>
      <ul>
        <li><CheckCircleFilled /> Giá và tình trạng hàng được cập nhật theo từng phiên bản.</li>
        <li><SafetyCertificateOutlined /> Kiểm tra đầy đủ thông số, hình ảnh và biến thể trước khi mua.</li>
        <li><TruckOutlined /> Chọn địa chỉ giao nhận và phương thức thanh toán ở bước checkout.</li>
      </ul>
      <div className="store-product-buy-row">
        <div className="store-detail-quantity" aria-label="Chọn số lượng">
          <Button type="text" shape="circle" disabled={quantity <= 1} icon={<MinusOutlined />} onClick={() => onQuantityChange(quantity - 1)} aria-label="Giảm số lượng" />
          <InputNumber min={1} max={stock} precision={0} controls={false} value={quantity} onChange={(value) => onQuantityChange(Number(value ?? 1))} aria-label="Số lượng" />
          <Button type="text" shape="circle" disabled={quantity >= stock} icon={<PlusOutlined />} onClick={() => onQuantityChange(quantity + 1)} aria-label="Tăng số lượng" />
        </div>
        <Button type="primary" size="large" icon={<ShoppingOutlined />} onClick={onAddToCart} block>Thêm vào giỏ hàng</Button>
      </div>
    </div>
  );
}
