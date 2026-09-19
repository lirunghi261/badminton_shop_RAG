import { Link } from "react-router-dom";
import { paths } from "../../routes/paths";

interface StoreLogoProps {
  variant?: "header" | "footer";
}

export function StoreLogo({ variant = "header" }: StoreLogoProps) {
  const isFooter = variant === "footer";

  return (
    <Link
      className={isFooter ? "store-logo store-logo-footer" : "store-logo"}
      to={paths.home}
      aria-label="Badminton Shop - Trang chủ"
    >
      <span className="brand-mark">B</span>
      <span>
        <strong>Badminton Shop</strong>
        <small>{isFooter ? "Đồng hành cùng đam mê cầu lông" : "Play beyond limits"}</small>
      </span>
    </Link>
  );
}

