import { LockOutlined, MailOutlined, PhoneOutlined, UserOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Button, Form, Input, Skeleton, Typography } from "antd";
import axios from "axios";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import {
  getCurrentCustomer,
  loginCustomer,
  registerCustomer,
  type CustomerUser,
} from "../../api/auth/auth.api";
import { currentCustomerQueryKey } from "../../auth/queryKeys";
import { paths } from "../../routes/paths";
import authImage from "../../assets/storefront-hero-equipment-ocean.webp";
import "../../styles/storefront-auth.css";

type AuthMode = "login" | "register";

interface LoginValues {
  identifier: string;
  password: string;
}

interface RegisterValues {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

function errorMessage(error: unknown) {
  if (!axios.isAxiosError(error)) return "Đã xảy ra lỗi. Vui lòng thử lại.";
  return (
    (error.response?.data as { error?: { message?: string } } | undefined)?.error?.message ??
    "Đã xảy ra lỗi. Vui lòng thử lại."
  );
}

export function CustomerAuthPage({ mode }: { mode: AuthMode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const currentUserQuery = useQuery({
    queryKey: currentCustomerQueryKey,
    queryFn: getCurrentCustomer,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const finishAuthentication = (user: CustomerUser) => {
    queryClient.setQueryData(currentCustomerQueryKey, user);
    const requestedPath = (location.state as { from?: string } | null)?.from;
    navigate(requestedPath?.startsWith("/") ? requestedPath : paths.account, { replace: true });
  };

  const loginMutation = useMutation({
    mutationFn: loginCustomer,
    onSuccess: finishAuthentication,
  });
  const registerMutation = useMutation({
    mutationFn: registerCustomer,
    onSuccess: finishAuthentication,
  });

  if (currentUserQuery.isPending) {
    return <section className="customer-auth-page"><div className="customer-auth-card"><Skeleton active /></div></section>;
  }
  if (currentUserQuery.data) return <Navigate to={paths.account} replace />;

  const mutation = mode === "login" ? loginMutation : registerMutation;

  return (
    <section className="customer-auth-page">
      <div className="customer-auth-card">
        <aside className="customer-auth-visual" aria-label="Trang bị cầu lông Badminton Shop">
          <img src={authImage} alt="Vợt, giày và phụ kiện cầu lông" />
          <div>
            <strong>Chọn đúng dụng cụ.</strong>
            <span>Tự tin hơn trong từng buổi tập.</span>
          </div>
        </aside>
        <div className="customer-auth-form-panel">
          <nav className="customer-auth-tabs" aria-label="Tài khoản">
            <Link className={mode === "login" ? "active" : ""} to={paths.login}>Đăng nhập</Link>
            <Link className={mode === "register" ? "active" : ""} to={paths.register}>Đăng ký</Link>
          </nav>
          <header>
            <Typography.Title level={1}>{mode === "login" ? "Đăng nhập tài khoản" : "Tạo tài khoản"}</Typography.Title>
            <Typography.Paragraph type="secondary">
              {mode === "login"
                ? "Nhập email hoặc số điện thoại và mật khẩu của bạn."
                : "Tạo tài khoản để lưu thông tin và theo dõi đơn hàng."}
            </Typography.Paragraph>
          </header>

          {mutation.isError && <Alert type="error" showIcon message={errorMessage(mutation.error)} />}

          {mode === "login" ? (
            <Form<LoginValues>
              layout="vertical"
              requiredMark={false}
              size="large"
              onFinish={(values) => loginMutation.mutate(values)}
            >
              <Form.Item
                label="Email hoặc số điện thoại"
                name="identifier"
                rules={[{ required: true, message: "Vui lòng nhập email hoặc số điện thoại." }]}
              >
                <Input prefix={<UserOutlined />} placeholder="email@example.com hoặc 09xxxxxxxx" autoComplete="username" />
              </Form.Item>
              <Form.Item
                label="Mật khẩu"
                name="password"
                rules={[
                  { required: true, message: "Vui lòng nhập mật khẩu." },
                  { min: 8, message: "Mật khẩu phải có ít nhất 8 ký tự." },
                ]}
              >
                <Input.Password prefix={<LockOutlined />} placeholder="Nhập mật khẩu" autoComplete="current-password" />
              </Form.Item>
              <Button type="primary" htmlType="submit" block loading={loginMutation.isPending}>Đăng nhập</Button>
            </Form>
          ) : (
            <Form<RegisterValues>
              layout="vertical"
              requiredMark={false}
              size="large"
              onFinish={({ confirmPassword: _confirmPassword, ...values }) => registerMutation.mutate(values)}
            >
              <Form.Item label="Họ và tên" name="name" rules={[{ required: true, message: "Vui lòng nhập họ tên." }, { min: 2 }]}>
                <Input prefix={<UserOutlined />} placeholder="Nguyễn Văn A" autoComplete="name" />
              </Form.Item>
              <Form.Item
                label="Email"
                name="email"
                rules={[{ required: true, message: "Vui lòng nhập email." }, { type: "email", message: "Email không hợp lệ." }]}
              >
                <Input prefix={<MailOutlined />} placeholder="email@example.com" autoComplete="email" />
              </Form.Item>
              <Form.Item
                label="Số điện thoại"
                name="phone"
                rules={[
                  { required: true, message: "Vui lòng nhập số điện thoại." },
                  { pattern: /^(?:\+?84|0)[35789][0-9]{8}$/, message: "Số điện thoại Việt Nam không hợp lệ." },
                ]}
              >
                <Input prefix={<PhoneOutlined />} placeholder="09xxxxxxxx" autoComplete="tel" />
              </Form.Item>
              <Form.Item
                label="Mật khẩu"
                name="password"
                rules={[
                  { required: true, message: "Vui lòng nhập mật khẩu." },
                  { min: 8, message: "Tối thiểu 8 ký tự." },
                  { pattern: /^(?=.*[A-Za-z])(?=.*\d).+$/, message: "Cần có ít nhất một chữ cái và một chữ số." },
                ]}
              >
                <Input.Password prefix={<LockOutlined />} placeholder="Ít nhất 8 ký tự" autoComplete="new-password" />
              </Form.Item>
              <Form.Item
                label="Nhập lại mật khẩu"
                name="confirmPassword"
                dependencies={["password"]}
                rules={[
                  { required: true, message: "Vui lòng nhập lại mật khẩu." },
                  ({ getFieldValue }) => ({
                    validator: (_, value) => !value || getFieldValue("password") === value
                      ? Promise.resolve()
                      : Promise.reject(new Error("Mật khẩu nhập lại chưa khớp.")),
                  }),
                ]}
              >
                <Input.Password prefix={<LockOutlined />} placeholder="Nhập lại mật khẩu" autoComplete="new-password" />
              </Form.Item>
              <Button type="primary" htmlType="submit" block loading={registerMutation.isPending}>Tạo tài khoản</Button>
            </Form>
          )}

          <p className="customer-auth-switch">
            {mode === "login" ? "Chưa có tài khoản?" : "Đã có tài khoản?"}{" "}
            <Link to={mode === "login" ? paths.register : paths.login}>
              {mode === "login" ? "Đăng ký ngay" : "Đăng nhập"}
            </Link>
          </p>
          <p className="customer-auth-legal">
            Bằng việc tiếp tục, bạn đồng ý với điều khoản sử dụng và chính sách bảo mật của cửa hàng.
          </p>
        </div>
      </div>
    </section>
  );
}
