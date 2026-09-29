import { GuestAccountPanel } from "../../components/storefront/GuestAccountPanel";

export function AccountPage() {
  return <section className="store-account-page"><div className="store-container"><header className="store-account-heading"><span className="eyebrow">Tài khoản</span><h1>Quản lý thông tin và đơn hàng</h1><p>Thông tin tài khoản và lịch sử mua hàng của bạn được đặt tại một nơi.</p></header><GuestAccountPanel /></div></section>;
}
