import { CheckCircleFilled, InfoCircleOutlined } from "@ant-design/icons";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Alert, Col, Row, Spin, Steps } from "antd";
import axios from "axios";
import { useEffect, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { getCurrentCustomer } from "../../api/auth/auth.api";
import { createCustomerOrder } from "../../api/storefront/orders.api";
import { currentCustomerQueryKey } from "../../auth/queryKeys";
import { useCart } from "../../cart/useCart";
import { CheckoutCustomerForm, type CheckoutFormValues } from "../../components/storefront/CheckoutCustomerForm";
import { CheckoutOrderSummary } from "../../components/storefront/CheckoutOrderSummary";
import { CheckoutReview } from "../../components/storefront/CheckoutReview";
import { paths } from "../../routes/paths";

function orderError(error: unknown) {
  if (!axios.isAxiosError(error)) return "Vui lòng thử lại sau.";
  return (error.response?.data as { error?: { message?: string } } | undefined)?.error?.message ?? "Vui lòng thử lại sau.";
}

export function CheckoutPage() {
  const navigate = useNavigate();
  const { items, itemCount, subtotal, hasUnavailableItems, hasPriceChanges, refreshCart, isSyncing, syncError, clearCart } = useCart();
  const userQuery = useQuery({ queryKey: currentCustomerQueryKey, queryFn: getCurrentCustomer, retry: false, staleTime: 5 * 60 * 1000 });
  const [checkoutValues, setCheckoutValues] = useState<CheckoutFormValues | null>(null);
  const [isReviewing, setIsReviewing] = useState(false);
  const [cartVerified, setCartVerified] = useState<boolean | null>(null);
  const idempotencyKey = useRef(crypto.randomUUID());
  const createOrder = useMutation({
    mutationFn: (values: CheckoutFormValues) => createCustomerOrder({
      customer: { fullName: values.fullName, phone: values.phone, email: values.email?.trim() ?? "" },
      shippingAddress: { addressLine: values.address },
      items: items.map((item) => ({ productId: item.productId, sku: item.variantSku, quantity: item.quantity })),
      paymentMethod: "cod",
      customerNote: values.note?.trim() ?? "",
    }, idempotencyKey.current),
    onSuccess: (order) => {
      clearCart();
      navigate(paths.orderSuccess(order.id), { replace: true });
    },
  });

  useEffect(() => {
    let active = true;
    void refreshCart().then((verified) => { if (active) setCartVerified(verified); });
    return () => { active = false; };
  }, [refreshCart]);

  if (userQuery.isError) return <Navigate to={paths.login} state={{ from: paths.checkout }} replace />;
  if (userQuery.isPending || cartVerified === null || isSyncing) return <section className="store-checkout-page"><div className="store-container"><Spin aria-label="Đang kiểm tra giỏ hàng" /></div></section>;
  if (!items.length || hasUnavailableItems || hasPriceChanges || syncError || !cartVerified) return <Navigate to={paths.cart} replace />;

  return <section className="store-checkout-page"><div className="store-container">
    <header className="store-checkout-heading"><span className="eyebrow">Thanh toán</span><h1>Hoàn tất thông tin đặt hàng</h1><p>Kiểm tra thông tin nhận hàng và đơn hàng trước khi xác nhận.</p></header>
    <Alert className="store-checkout-preview-notice" type="info" showIcon message="Thanh toán khi nhận hàng" description="Đơn hàng sẽ được gửi đến cửa hàng sau khi bạn xác nhận." />
    <Steps className="store-checkout-steps" current={isReviewing ? 1 : 0} items={[{ title: "Thông tin giao nhận" }, { title: "Kiểm tra đơn" }, { title: "Hoàn tất" }]} />
    {isReviewing && checkoutValues && <Alert className="store-checkout-contract-notice" type="info" showIcon icon={<InfoCircleOutlined />} message="Thông tin giao nhận đã hợp lệ" description={`Cảm ơn ${checkoutValues.fullName}. Hãy xác nhận để tạo đơn hàng.`} />}
    <Row gutter={[28, 28]} align="top"><Col xs={24} lg={15}>{isReviewing && checkoutValues
      ? <CheckoutReview values={checkoutValues} onEdit={() => setIsReviewing(false)} submitting={createOrder.isPending} error={createOrder.isError ? orderError(createOrder.error) : undefined} onConfirm={() => createOrder.mutate(checkoutValues)} />
      : <CheckoutCustomerForm initialValues={checkoutValues ?? { fullName: userQuery.data?.name ?? "", phone: userQuery.data?.phone ?? "", email: userQuery.data?.email ?? "", address: "", paymentMethod: "cod" }} onFinish={async (values) => { if (await refreshCart()) { setCheckoutValues(values); setIsReviewing(true); } }} />}</Col><Col xs={24} lg={9}><CheckoutOrderSummary items={items} itemCount={itemCount} subtotal={subtotal} /></Col></Row>
    <div className="store-checkout-security"><CheckCircleFilled /> Thông tin đăng nhập được bảo vệ bằng cookie httpOnly.</div>
  </div></section>;
}
