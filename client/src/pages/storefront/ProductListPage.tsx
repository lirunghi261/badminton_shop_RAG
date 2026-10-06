import { ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Alert, Button, Card, Empty, Input, Pagination, Select, Skeleton, Space } from "antd";
import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import heroEquipment from "../../assets/storefront-hero-equipment-ocean.png";
import { getStorefrontProducts, type StorefrontProductListParams } from "../../api/storefront/products.api";
import { ProductCard } from "../../components/storefront/ProductCard";
import { paths } from "../../routes/paths";

const pageSize = 15;

function positiveInteger(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

interface ProductSearchProps {
  initialSearch: string;
  onSearch: (value: string) => void;
}

function ProductSearch({ initialSearch, onSearch }: ProductSearchProps) {
  const [value, setValue] = useState(initialSearch);

  return (
    <Input.Search
      allowClear
      enterButton={<SearchOutlined />}
      placeholder="Tìm theo tên sản phẩm hoặc SKU"
      value={value}
      onChange={(event) => setValue(event.target.value)}
      onSearch={() => onSearch(value)}
    />
  );
}

export function ProductListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get("q") ?? "";
  const category = searchParams.get("category") ?? "all";
  const brand = searchParams.get("brand") ?? "all";
  const sort = (searchParams.get("sort") ?? "newest") as StorefrontProductListParams["sort"];
  const page = positiveInteger(searchParams.get("page"), 1);

  const params = useMemo<StorefrontProductListParams>(() => ({
    page,
    limit: pageSize,
    search,
    category,
    brand,
    sort: ["newest", "price-asc", "price-desc"].includes(sort) ? sort : "newest",
  }), [brand, category, page, search, sort]);

  const productsQuery = useQuery({
    queryKey: ["storefront", "products", params],
    queryFn: () => getStorefrontProducts(params),
    placeholderData: keepPreviousData,
  });

  const updateParams = (updates: Record<string, string>) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (!value || value === "all" || (key === "sort" && value === "newest")) next.delete(key);
      else next.set(key, value);
    });
    setSearchParams(next);
  };

  const applySearch = (value: string) => updateParams({ q: value.trim(), page: "1" });
  const filters = productsQuery.data?.filters;
  const activeCategoryName = filters?.categories.find((item) => item.slug === category)?.name;

  return (
    <section className="store-catalog">
      <div className="store-container">
        <header className="store-catalog-hero">
          <img src={heroEquipment} alt="" />
          <span className="store-catalog-hero-shade" />
          <div className="store-catalog-hero-content">
            <span className="eyebrow">Bộ sưu tập cầu lông</span>
            <h1>{activeCategoryName ? activeCategoryName : "Tìm đúng dụng cụ cho trận đấu của bạn."}</h1>
            <p>Khám phá sản phẩm đang có sẵn, so sánh biến thể và chọn trang bị phù hợp với lối chơi của bạn.</p>
            <div className="store-catalog-quick-links">
              <Link className={category === "all" ? "active" : ""} to={paths.products}>Tất cả sản phẩm</Link>
              {filters?.categories.slice(0, 5).map((item) => <Link className={category === item.slug ? "active" : ""} key={item.slug} to={paths.productsByCategory(item.slug)}>{item.name}</Link>)}
            </div>
          </div>
        </header>

        <div className="store-catalog-highlights" aria-label="Lợi ích mua sắm">
          <span><strong>Chọn đúng hơn</strong> Lọc theo danh mục, thương hiệu và giá</span>
          <span><strong>Tồn kho rõ ràng</strong> Kiểm tra biến thể trước khi thêm giỏ</span>
          <span><strong>Tư vấn nhanh</strong> Nhận gợi ý từ trợ lý sản phẩm</span>
        </div>

        <Card className="store-filter-card">
          <div className="store-filter-main">
            <ProductSearch key={search} initialSearch={search} onSearch={applySearch} />
            <Select
              aria-label="Lọc theo danh mục"
              value={category}
              onChange={(value) => updateParams({ category: value, page: "1" })}
              options={[{ label: "Tất cả danh mục", value: "all" }, ...(filters?.categories.map((item) => ({ label: item.name, value: item.slug })) ?? [])]}
            />
            <Select
              aria-label="Lọc theo thương hiệu"
              value={brand}
              onChange={(value) => updateParams({ brand: value, page: "1" })}
              options={[{ label: "Tất cả thương hiệu", value: "all" }, ...(filters?.brands.map((item) => ({ label: item.name, value: item.slug })) ?? [])]}
            />
            <Select
              aria-label="Sắp xếp sản phẩm"
              value={params.sort}
              onChange={(value) => updateParams({ sort: value, page: "1" })}
              options={[
                { label: "Mới nhất", value: "newest" },
                { label: "Giá thấp đến cao", value: "price-asc" },
                { label: "Giá cao đến thấp", value: "price-desc" },
              ]}
            />
          </div>
          <div className="store-filter-meta">
            <span aria-live="polite">
              {productsQuery.isPending ? "Đang tìm sản phẩm..." : `${productsQuery.data?.pagination.total ?? 0} sản phẩm phù hợp`}
            </span>
            {(search || category !== "all" || brand !== "all" || params.sort !== "newest") && (
              <Button type="link" icon={<ReloadOutlined />} onClick={() => setSearchParams({})}>
                Xóa tất cả bộ lọc
              </Button>
            )}
          </div>
        </Card>

        {productsQuery.isError && (
          <Alert
            className="store-catalog-alert"
            type="error"
            showIcon
            message="Không thể tải danh sách sản phẩm"
            description="Hãy kiểm tra kết nối rồi thử lại."
            action={<Button size="small" onClick={() => productsQuery.refetch()}>Thử lại</Button>}
          />
        )}

        {productsQuery.isPending ? (
          <div className="store-product-grid">
            {Array.from({ length: 8 }, (_, index) => (
              <Card className="store-product-skeleton" key={index}><Skeleton active paragraph={{ rows: 3 }} /></Card>
            ))}
          </div>
        ) : productsQuery.data && productsQuery.data.products.length > 0 ? (
          <>
            <div className="store-product-grid">
              {productsQuery.data.products.map((product) => (
                <ProductCard product={product} key={product.id} />
              ))}
            </div>
            {productsQuery.data.pagination.totalPages > 1 && (
              <div className="store-pagination">
                <Pagination
                  current={productsQuery.data.pagination.page}
                  pageSize={productsQuery.data.pagination.limit}
                  total={productsQuery.data.pagination.total}
                  showSizeChanger={false}
                  responsive
                  onChange={(nextPage) => updateParams({ page: String(nextPage) })}
                />
              </div>
            )}
          </>
        ) : !productsQuery.isError ? (
          <div className="store-catalog-empty">
            <Empty description="Chưa tìm thấy sản phẩm phù hợp">
              <Space>
                <Button type="primary" onClick={() => setSearchParams({})}>Xem tất cả sản phẩm</Button>
              </Space>
            </Empty>
          </div>
        ) : null}
      </div>
    </section>
  );
}
