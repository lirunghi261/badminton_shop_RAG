import { useQuery } from "@tanstack/react-query";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { getCurrentUser } from "../api/auth/auth.api";
import { AppLoader } from "../components/common/AppLoader";
import { paths } from "../routes/paths";
import { currentUserQueryKey } from "./queryKeys";

export function AuthGuard() {
  const location = useLocation();
  const userQuery = useQuery({
    queryKey: currentUserQueryKey,
    queryFn: getCurrentUser,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  if (userQuery.isPending) {
    return <AppLoader label="Đang kiểm tra đăng nhập" />;
  }

  if (userQuery.isError) {
    return <Navigate to={paths.admin.login} state={{ from: location.pathname }} replace />;
  }

  return <Outlet />;
}
