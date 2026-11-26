import { CheckCircleFilled } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Button, Col, Row, Spin, Steps } from "antd";
import axios from "axios";
import { useEffect, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { getCurrentCustomer, type CustomerUser } from "../../api/auth/auth.api";
import { createCustomerOrder } from "../../api/storefront/orders.api";
import { currentCustomerQueryKey } from "../../auth/queryKeys";
import { readPendingCheckout, savePendingCheckout, type PendingCheckout } from "../../cart/pendingCheckout";
import { useCart } from "../../cart/useCart";
import { CheckoutCustomerForm, type CheckoutFormValues } from "../../components/storefront/CheckoutCustomerForm";
import { CheckoutOrderSummary } from "../../components/storefront/CheckoutOrderSummary";
import { CheckoutReview } from "../../components/storefront/CheckoutReview";
import { paths } from "../../routes/paths";

function orderError(error: unknown) {
  if (!axios.isAxiosError(error)) return "Vui lòng thử lại sau.";
  return error.response?.data?.error?.message ?? "Chưa nhận được xác nhận từ cửa hàng. Vui lòng gửi lại yêu cầu đang chờ.";
}

export function CheckoutPage() {
  const customer = useQuery({ queryKey: currentCustomerQueryKey, queryFn: getCurrentCustomer, retry: false, staleTime: 5 * 60 * 1000 });
  const status = axios.isAxiosError(customer.error) ? customer.error.response?.status : undefined;
  if (status === 401 || status === 403 || (!customer.isPending && !customer.isError && !customer.data)) {
    return <Navigate to={paths.login} state={{ from: paths.checkout }} replace />;
  }
  if (customer.isError) return <section className="store-checkout-page"><div className="store-container">
    <Alert type="error" showIcon message="Chưa kiểm tra được tài khoản" action={<Button onClick={() => void customer.refetch()}>Thử lại</Button>} />
  </div></section>;
  if (!customer.data) return <Spin aria-label="Đang kiểm tra tài khoản" />;
  return <CustomerCheckout key={customer.data.id} customer={customer.data} />;
}

function CustomerCheckout({ customer }: { customer: CustomerUser }) {
  const cart = useCart();
  const { refreshCart } = cart;
  const queryClient = useQueryClient();
  const [pending, setPending] = useState(() => readPendingCheckout(customer.id));
  const attempt = useRef(pending);
  const [checkoutValues, setCheckoutValues] = useState<CheckoutFormValues | null>(null);
  const [isReviewing, setIsReviewing] = useState(false);
  const [cartVerified, setCartVerified] = useState<boolean | null>(null);
  const [completedOrderId, setCompletedOrderId] = useState<string | null>(null);
  const createOrder = useMutation({
    mutationFn: (request: PendingCheckout) => createCustomerOrder(request.input, request.key),
    onSuccess: (order, request) => {
      setCompletedOrderId(order.id);
      cart.removePurchasedItems(request.input.items);
      savePendingCheckout(customer.id, null);
      attempt.current = null;
      setPending(null);
      queryClient.setQueryData(["customer-orders", customer.id, "detail", order.id], order);
      void queryClient.invalidateQueries({ queryKey: ["customer-orders", customer.id, "list"] });
    },
    onError: (error, request) => {
      if (!axios.isAxiosError(error)) return;
      const status = error.response?.status;
      const code = error.response?.data?.error?.code;
      if (status === 401 || status === 403) queryClient.setQueryData(currentCustomerQueryKey, null);
      if (status === 400 || (status === 409 && code !== "IDEMPOTENCY_CONFLICT")) {
        setCheckoutValues({
          ...request.input.customer, address: request.input.shippingAddress.addressLine,
          note: request.input.customerNote, paymentMethod: "cod",
        });
        setIsReviewing(false);
        savePendingCheckout(customer.id, null);
        attempt.current = null;
        setPending(null);
        void cart.refreshCart().then(setCartVerified);
      }
    },
  });

  useEffect(() => {
    if (attempt.current) return;
    let active = true;
    void refreshCart().then((verified) => { if (active) setCartVerified(verified); });
    return () => { active = false; };
  }, [refreshCart]);

  const confirm = () => {
    if (createOrder.isPending) return;
    let request = attempt.current;
    if (!request && checkoutValues) {
      request = {
        key: crypto.randomUUID(),
        input: {
          customer: { fullName: checkoutValues.fullName.trim(), phone: checkoutValues.phone.trim(), email: checkoutValues.email?.trim() ?? "" },
          shippingAddress: { addressLine: checkoutValues.address.trim() },
          items: cart.items.map((item) => ({ productId: item.productId, sku: item.variantSku, quantity: item.quantity })),
          paymentMethod: "cod",
          customerNote: checkoutValues.note?.trim() ?? "",
        },
      };
      attempt.current = request;
      savePendingCheckout(customer.id, request);
      setPending(request);
    }
    if (request) createOrder.mutate(request);
  };

  if (completedOrderId) return <Navigate to={paths.orderSuccess(completedOrderId)} replace />;
  const status = axios.isAxiosError(createOrder.error) ? createOrder.error.response?.status : undefined;
  if (status === 401 || status === 403) return <Navigate to={paths.login} state={{ from: paths.checkout }} replace />;
  const pendingValues: CheckoutFormValues | null = pending ? {
    ...pending.input.customer, address: pending.input.shippingAddress.addressLine,
    note: pending.input.customerNote, paymentMethod: "cod",
  } : null;
  if (pendingValues) return <section className="store-checkout-page"><div className="store-container">
    <h1>Xác nhận đơn đang chờ</h1>
    <Alert type="info" showIcon message="Giữ nguyên yêu cầu đặt hàng"
      description="Nếu kết nối bị gián đoạn, gửi lại yêu cầu này để nhận kết quả. Bạn có thể sửa thông tin khi cửa hàng đã xác định kết quả của yêu cầu." />
    <CheckoutReview values={pendingValues} submitting={createOrder.isPending} locked
      onConfirm={confirm} error={createOrder.isError ? orderError(createOrder.error) : undefined} />
  </div></section>;
  if (cartVerified === null || cart.isSyncing) return <section className="store-checkout-page"><div className="store-container"><Spin aria-label="Đang kiểm tra giỏ hàng" /></div></section>;
  if (cart.syncError) return <section className="store-checkout-page"><div className="store-container">
    <Alert type="error" showIcon message="Chưa kiểm tra được giá và tồn kho"
      action={<Button onClick={() => void cart.refreshCart().then(setCartVerified)}>Thử lại</Button>} />
  </div></section>;
  if (!cart.items.length || cart.hasUnavailableItems || cart.hasPriceChanges || !cartVerified) return <Navigate to={paths.cart} replace />;

  return <section className="store-checkout-page"><div className="store-container">
    <header className="store-checkout-heading"><h1>Hoàn tất thông tin đặt hàng</h1><p>Kiểm tra thông tin nhận hàng và đơn hàng trước khi xác nhận.</p></header>
    <Alert type="info" showIcon message="Thanh toán khi nhận hàng" description="Đơn hàng sẽ được gửi đến cửa hàng sau khi bạn xác nhận." />
    <Steps className="store-checkout-steps" current={isReviewing ? 1 : 0} items={[{ title: "Thông tin giao nhận" }, { title: "Kiểm tra đơn" }, { title: "Hoàn tất" }]} />
    {createOrder.isError && <Alert type="error" showIcon message={orderError(createOrder.error)} />}
    <Row gutter={[28, 28]} align="top"><Col xs={24} lg={15}>{isReviewing && checkoutValues
      ? <CheckoutReview values={checkoutValues} onEdit={() => { createOrder.reset(); setIsReviewing(false); }} submitting={createOrder.isPending} onConfirm={confirm} />
      : <CheckoutCustomerForm initialValues={checkoutValues ?? { fullName: customer.name, phone: customer.phone, email: customer.email, address: "", paymentMethod: "cod" }}
          onFinish={async (values) => { if (await cart.refreshCart()) { setCheckoutValues(values); setIsReviewing(true); } }} />}
    </Col><Col xs={24} lg={9}><CheckoutOrderSummary items={cart.items} itemCount={cart.itemCount} subtotal={cart.subtotal} /></Col></Row>
    <div className="store-checkout-security"><CheckCircleFilled /> Thông tin đăng nhập được bảo vệ bằng cookie httpOnly.</div>
  </div></section>;
}
