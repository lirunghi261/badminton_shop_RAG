import { RouteScrollManager } from "./components/common/RouteScrollManager";
import { AppRoutes } from "./routes/AppRoutes";

export default function App() {
  return (
    <>
      <RouteScrollManager />
      <AppRoutes />
    </>
  );
}
