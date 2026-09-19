import { Button, Result } from "antd";
import { useNavigate } from "react-router-dom";
import { paths } from "../../routes/paths";

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <Result
      status="404"
      title="404"
      subTitle="Trang bạn đang tìm không tồn tại."
      extra={<Button type="primary" onClick={() => navigate(paths.home)}>Về trang chủ</Button>}
    />
  );
}
