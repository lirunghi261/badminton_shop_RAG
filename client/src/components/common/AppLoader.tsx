import { Spin } from "antd";

interface AppLoaderProps {
  label?: string;
}

export function AppLoader({ label = "Đang tải dữ liệu" }: AppLoaderProps) {
  return (
    <div className="screen-loader" role="status" aria-label={label}>
      <Spin size="large" />
    </div>
  );
}

