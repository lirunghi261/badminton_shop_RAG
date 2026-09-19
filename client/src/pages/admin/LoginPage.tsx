import { LockOutlined, MailOutlined } from "@ant-design/icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert, Button, Form, Input, Typography } from "antd";
import axios from "axios";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { loginAdmin } from "../../api/auth/auth.api";
import { currentUserQueryKey } from "../../auth/queryKeys";
import { paths } from "../../routes/paths";

interface LoginValues {
  email: string;
  password: string;
}

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const existingUser = queryClient.getQueryData(currentUserQueryKey);

  const loginMutation = useMutation({
    mutationFn: loginAdmin,
    onSuccess: (user) => {
      queryClient.setQueryData(currentUserQueryKey, user);
      const destination = (location.state as { from?: string } | null)?.from ?? paths.admin.root;
      navigate(destination, { replace: true });
    },
  });

  if (existingUser) {
    return <Navigate to={paths.admin.root} replace />;
  }

  const errorMessage = axios.isAxiosError(loginMutation.error)
    ? (loginMutation.error.response?.data as { error?: { message?: string } } | undefined)?.error?.message
    : undefined;

  return (
    <main className="login-page">
      <section className="login-panel">
        <div className="login-brand">
          <span className="brand-mark brand-mark-large">B</span>
          <div>
            <strong>Badminton Shop</strong>
            <span>Hệ thống quản trị</span>
          </div>
        </div>

        <div className="login-heading">
          <Typography.Title level={2}>Chào mừng trở lại</Typography.Title>
          <Typography.Text type="secondary">
            Đăng nhập bằng tài khoản quản trị để tiếp tục.
          </Typography.Text>
        </div>

        {loginMutation.isError && (
          <Alert
            type="error"
            showIcon
            message={errorMessage ?? "Không thể đăng nhập. Vui lòng thử lại."}
          />
        )}

        <Form<LoginValues>
          layout="vertical"
          requiredMark={false}
          size="large"
          onFinish={(values) => loginMutation.mutate(values)}
        >
          <Form.Item
            label="Email"
            name="email"
            rules={[
              { required: true, message: "Vui lòng nhập email." },
              { type: "email", message: "Email không hợp lệ." },
            ]}
          >
            <Input prefix={<MailOutlined />} placeholder="admin@example.com" autoComplete="email" />
          </Form.Item>
          <Form.Item
            label="Mật khẩu"
            name="password"
            rules={[{ required: true, message: "Vui lòng nhập mật khẩu." }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Nhập mật khẩu"
              autoComplete="current-password"
            />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={loginMutation.isPending}>
            Đăng nhập
          </Button>
        </Form>
      </section>
      <aside className="login-visual" aria-hidden="true">
        <div className="court-lines" />
        <div className="shuttle">✦</div>
        <div className="visual-copy">
          <span>Quản lý thông minh</span>
          <h1>Một nơi cho toàn bộ cửa hàng cầu lông.</h1>
          <p>Sản phẩm, tồn kho, đơn hàng và khách hàng được vận hành trong một hệ thống.</p>
        </div>
      </aside>
    </main>
  );
}
