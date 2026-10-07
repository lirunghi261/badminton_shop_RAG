import { LogoutOutlined, MailOutlined, PhoneOutlined, SafetyCertificateOutlined, UserOutlined } from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Avatar, Button, Card, Descriptions, Skeleton, Space, Typography } from "antd";
import { Navigate } from "react-router-dom";
import { getCurrentCustomer, logoutUser } from "../../api/auth/auth.api";
import { currentCustomerQueryKey } from "../../auth/queryKeys";
import { paths } from "../../routes/paths";
import "../../styles/storefront-account.css";

export function AccountPage() {
  const queryClient = useQueryClient();
  const userQuery = useQuery({
    queryKey: currentCustomerQueryKey,
    queryFn: getCurrentCustomer,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
  const logoutMutation = useMutation({
    mutationFn: logoutUser,
    onSuccess: () => queryClient.removeQueries({ queryKey: currentCustomerQueryKey }),
  });
  const user = userQuery.data;

  if (userQuery.isError) {
    return <Navigate to={paths.login} state={{ from: paths.account }} replace />;
  }

  return (
    <section className="store-account-page">
      <div className="store-container">
        <header className="store-account-heading">
          <span className="eyebrow">Tài khoản</span>
          <h1>{user ? `Xin chào, ${user.name}` : "Quản lý thông tin và đơn hàng"}</h1>
          <p>{user
            ? "Thông tin thành viên của bạn được bảo vệ và sẵn sàng dùng cho quy trình đặt hàng."
            : "Đăng nhập để quản lý thông tin cá nhân và theo dõi lịch sử mua hàng."}</p>
        </header>

        {userQuery.isPending && <Card className="store-account-loading"><Skeleton active paragraph={{ rows: 5 }} /></Card>}
        {user && (
          <div className="store-account-dashboard">
            <Card className="store-profile-card">
              <div className="store-profile-card__header">
                <Space size={14}>
                  <Avatar size={54} icon={<UserOutlined />}>{user.name.charAt(0).toUpperCase()}</Avatar>
                  <span>
                    <Typography.Title level={3}>{user.name}</Typography.Title>
                    <Typography.Text type="secondary">Thành viên Badminton Shop</Typography.Text>
                  </span>
                </Space>
                <Button
                  icon={<LogoutOutlined />}
                  loading={logoutMutation.isPending}
                  onClick={() => logoutMutation.mutate()}
                >
                  Đăng xuất
                </Button>
              </div>
              <Descriptions column={1} bordered size="middle">
                <Descriptions.Item label={<><MailOutlined /> Email</>}>{user.email}</Descriptions.Item>
                <Descriptions.Item label={<><PhoneOutlined /> Số điện thoại</>}>{user.phone ?? "Chưa cập nhật"}</Descriptions.Item>
                <Descriptions.Item label={<><SafetyCertificateOutlined /> Bảo mật</>}>Phiên đăng nhập bằng cookie httpOnly</Descriptions.Item>
              </Descriptions>
            </Card>
            <Card className="store-orders-preview">
              <span className="store-account-icon"><SafetyCertificateOutlined /></span>
              <Typography.Title level={3}>Đơn hàng của tôi</Typography.Title>
              <Typography.Paragraph type="secondary">
                Tài khoản đã sẵn sàng. Danh sách đơn sẽ được nối ở bước triển khai checkout phía người dùng.
              </Typography.Paragraph>
            </Card>
          </div>
        )}
      </div>
    </section>
  );
}
