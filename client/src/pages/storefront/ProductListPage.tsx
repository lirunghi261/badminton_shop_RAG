import { FilterOutlined, HomeOutlined, ReloadOutlined } from "@ant-design/icons";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Alert, Button, Card, Checkbox, Drawer, Empty, Pagination, Radio, Select, Skeleton, Space, Tag } from "antd";
import { useMemo, useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import heroEquipment from "../../assets/storefront-hero-equipment-ocean.webp";
import {
  getStorefrontProducts,
  type StorefrontProductFacet,
  type StorefrontProductListParams,
} from "../../api/storefront/products.api";
import { ProductCard } from "../../components/storefront/ProductCard";
import { SeoHead } from "../../components/common/SeoHead";
import { paths } from "../../routes/paths";

const pageSize = 16;

interface PriceRange {
  key: string;
  label: string;
  minPrice?: number;
  maxPrice?: number;
}

const priceRanges: PriceRange[] = [
  { key: "under-500", label: "Dưới 500.000đ", maxPrice: 499_999 },
  { key: "500-1m", label: "500.000đ đến 1 triệu", minPrice: 500_000, maxPrice: 1_000_000 },
  { key: "1m-2m", label: "1 đến 2 triệu", minPrice: 1_000_001, maxPrice: 2_000_000 },
  { key: "2m-3m", label: "2 đến 3 triệu", minPrice: 2_000_001, maxPrice: 3_000_000 },
  { key: "over-3m", label: "Trên 3 triệu", minPrice: 3_000_001 },
];

function positiveInteger(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function facetToken(scope: StorefrontProductFacet["scope"], key: string, value: string) {
  return `${scope}|${key}|${value}`;
}

function parseFacetToken(token: string) {
  const [scope, key, ...valueParts] = token.split("|");
  if ((scope !== "variant" && scope !== "specification") || !key || valueParts.length === 0) return null;
  return { scope, key, value: valueParts.join("|") } as const;
}

interface CatalogFilterPanelProps {
  category: string;
  brand: string;
  price: string;
  inStock: boolean;
  facetTokens: string[];
  categories: Array<{ name: string; slug: string }>;
  brands: Array<{ name: string; slug: string }>;
  facets: StorefrontProductFacet[];
  onParamChange: (key: string, value: string) => void;
  onFacetChange: (facet: StorefrontProductFacet, values: string[]) => void;
  onReset: () => void;
}

function FilterSection({ title, children }: { title: string; children: ReactNode }) {
  return <section className="store-facet-section"><h2>{title}</h2>{children}</section>;
}

function CatalogFilterPanel({
  category,
  brand,
  price,
  inStock,
  facetTokens,
  categories,
  brands,
  facets,
  onParamChange,
  onFacetChange,
  onReset,
}: CatalogFilterPanelProps) {
  const selectedByFacet = useMemo(() => {
    const grouped = new Map<string, string[]>();
    facetTokens.forEach((token) => {
      const parsed = parseFacetToken(token);
      if (!parsed) return;
      const key = `${parsed.scope}:${parsed.key}`;
      grouped.set(key, [...(grouped.get(key) ?? []), parsed.value]);
    });
    return grouped;
  }, [facetTokens]);

  return (
    <div className="store-facet-panel">
      <div className="store-facet-heading">
        <strong>Bộ lọc sản phẩm</strong>
        <Button type="link" size="small" icon={<ReloadOutlined />} onClick={onReset}>Đặt lại</Button>
      </div>

      {category === "all" && (
        <FilterSection title="Danh mục">
          <Radio.Group value={category} onChange={(event) => onParamChange("category", event.target.value)}>
            <Radio value="all">Tất cả danh mục</Radio>
            {categories.map((item) => <Radio value={item.slug} key={item.slug}>{item.name}</Radio>)}
          </Radio.Group>
        </FilterSection>
      )}

      <FilterSection title="Khoảng giá">
        <Radio.Group value={price} onChange={(event) => onParamChange("price", event.target.value)}>
          <Radio value="all">Tất cả mức giá</Radio>
          {priceRanges.map((item) => <Radio value={item.key} key={item.key}>{item.label}</Radio>)}
        </Radio.Group>
      </FilterSection>

      <FilterSection title="Thương hiệu">
        <Radio.Group value={brand} onChange={(event) => onParamChange("brand", event.target.value)}>
          <Radio value="all">Tất cả thương hiệu</Radio>
          {brands.map((item) => <Radio value={item.slug} key={item.slug}>{item.name}</Radio>)}
        </Radio.Group>
      </FilterSection>

      <FilterSection title="Tình trạng">
        <Checkbox checked={inStock} onChange={(event) => onParamChange("stock", event.target.checked ? "available" : "all")}>Chỉ xem sản phẩm còn hàng</Checkbox>
      </FilterSection>

      {facets.map((facet) => {
        const selected = selectedByFacet.get(`${facet.scope}:${facet.key}`) ?? [];
        return (
          <FilterSection title={facet.label} key={`${facet.scope}:${facet.key}`}>
            <Checkbox.Group
              value={selected}
              options={facet.options.map((option) => ({ label: option, value: option }))}
              onChange={(values) => onFacetChange(facet, values.map(String))}
            />
          </FilterSection>
        );
      })}
    </div>
  );
}

export function ProductListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const search = searchParams.get("q") ?? "";
  const category = searchParams.get("category") ?? "all";
  const brand = searchParams.get("brand") ?? "all";
  const price = searchParams.get("price") ?? "all";
  const inStock = searchParams.get("stock") === "available";
  const selectedFacetTokens = searchParams.getAll("facet");
  const sort = (searchParams.get("sort") ?? "newest") as StorefrontProductListParams["sort"];
  const page = positiveInteger(searchParams.get("page"), 1);
  const selectedPrice = priceRanges.find((item) => item.key === price);

  const apiFacets = useMemo(() => {
    const grouped = new Map<string, { scope: "variant" | "specification"; key: string; values: string[] }>();
    selectedFacetTokens.forEach((token) => {
      const parsed = parseFacetToken(token);
      if (!parsed) return;
      const id = `${parsed.scope}:${parsed.key}`;
      const current = grouped.get(id) ?? { scope: parsed.scope, key: parsed.key, values: [] };
      current.values.push(parsed.value);
      grouped.set(id, current);
    });
    return JSON.stringify([...grouped.values()]);
  }, [selectedFacetTokens]);

  const params = useMemo<StorefrontProductListParams>(() => ({
    page,
    limit: pageSize,
    search,
    category,
    brand,
    sort: ["newest", "price-asc", "price-desc"].includes(sort) ? sort : "newest",
    ...(selectedPrice?.minPrice != null ? { minPrice: selectedPrice.minPrice } : {}),
    ...(selectedPrice?.maxPrice != null ? { maxPrice: selectedPrice.maxPrice } : {}),
    inStock: inStock ? "true" : "false",
    facets: apiFacets,
  }), [apiFacets, brand, category, inStock, page, search, selectedPrice, sort]);

  const productsQuery = useQuery({
    queryKey: ["storefront", "products", params],
    queryFn: () => getStorefrontProducts(params),
    placeholderData: keepPreviousData,
  });

  const updateParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (!value || value === "all" || (key === "sort" && value === "newest")) next.delete(key);
    else next.set(key, value);
    next.delete("page");
    if (key === "category") next.delete("facet");
    setSearchParams(next);
  };

  const updateFacet = (facet: StorefrontProductFacet, values: string[]) => {
    const next = new URLSearchParams(searchParams);
    const facetId = `${facet.scope}:${facet.key}`;
    const preserved = next.getAll("facet").filter((token) => {
      const parsed = parseFacetToken(token);
      return !parsed || `${parsed.scope}:${parsed.key}` !== facetId;
    });
    next.delete("facet");
    preserved.forEach((token) => next.append("facet", token));
    values.forEach((value) => next.append("facet", facetToken(facet.scope, facet.key, value)));
    next.delete("page");
    setSearchParams(next);
  };

  const removeFacetToken = (token: string) => {
    const next = new URLSearchParams(searchParams);
    const remaining = next.getAll("facet").filter((item) => item !== token);
    next.delete("facet");
    remaining.forEach((item) => next.append("facet", item));
    next.delete("page");
    setSearchParams(next);
  };

  const filters = productsQuery.data?.filters;
  const activeCategory = filters?.categories.find((item) => item.slug === category);
  const activeBrand = filters?.brands.find((item) => item.slug === brand);
  const pageTitle = [activeCategory?.name, activeBrand?.name].filter(Boolean).join(" ") || (search ? `Kết quả cho “${search}”` : "Tất cả sản phẩm cầu lông");
  const productCount = productsQuery.data?.pagination.total ?? 0;
  const hasRefinements = Boolean(search || category !== "all" || brand !== "all" || price !== "all" || inStock || selectedFacetTokens.length);
  const canonicalQuery = new URLSearchParams();
  if (category !== "all") canonicalQuery.set("category", category);
  if (brand !== "all") canonicalQuery.set("brand", brand);
  const canonicalPath = `${paths.products}${canonicalQuery.size ? `?${canonicalQuery.toString()}` : ""}`;

  const filterPanel = (
    <CatalogFilterPanel
      category={category}
      brand={brand}
      price={price}
      inStock={inStock}
      facetTokens={selectedFacetTokens}
      categories={filters?.categories ?? []}
      brands={filters?.brands ?? []}
      facets={filters?.facets ?? []}
      onParamChange={updateParam}
      onFacetChange={updateFacet}
      onReset={() => setSearchParams({})}
    />
  );

  return (
    <section className="store-catalog">
      <SeoHead
        title={`${pageTitle} | Badminton Shop`}
        description={`Khám phá ${pageTitle.toLocaleLowerCase("vi-VN")}, lọc theo giá, thương hiệu, thông số và tình trạng tồn kho.`}
        canonicalPath={canonicalPath}
      />
      <div className="store-container">
        <nav className="store-breadcrumb" aria-label="Đường dẫn trang">
          <Link to={paths.home}><HomeOutlined /> Trang chủ</Link>
          <span aria-hidden="true">/</span>
          {activeCategory ? <Link to={paths.productsByCategory(activeCategory.slug)}>{activeCategory.name}</Link> : <span>Sản phẩm</span>}
          {activeBrand && <><span aria-hidden="true">/</span><span>{activeBrand.name}</span></>}
        </nav>

        <div className="store-catalog-layout">
          <aside className="store-catalog-sidebar" aria-label="Bộ lọc sản phẩm">{filterPanel}</aside>

          <div className="store-catalog-results">
            <header className="store-catalog-hero">
              <img src={heroEquipment} alt="Dụng cụ cầu lông trên sân thi đấu" />
              <span className="store-catalog-hero-shade" />
              <div className="store-catalog-hero-content">
                <span className="eyebrow">Danh mục sản phẩm</span>
                <h1>{pageTitle}</h1>
                <p>Lọc nhanh theo thương hiệu, khoảng giá và thông số phù hợp với nhu cầu chơi của bạn.</p>
              </div>
            </header>

            <div className="store-catalog-toolbar">
              <div>
                <h2>{pageTitle}</h2>
                <span>{productsQuery.isPending ? "Đang cập nhật sản phẩm" : `${productCount} sản phẩm phù hợp`}</span>
              </div>
              <div className="store-catalog-toolbar-actions">
                <Button className="store-mobile-filter-button" icon={<FilterOutlined />} onClick={() => setMobileFiltersOpen(true)}>Bộ lọc</Button>
                <Select
                  aria-label="Sắp xếp sản phẩm"
                  value={params.sort}
                  onChange={(value) => updateParam("sort", value)}
                  options={[
                    { label: "Mới nhất", value: "newest" },
                    { label: "Giá thấp đến cao", value: "price-asc" },
                    { label: "Giá cao đến thấp", value: "price-desc" },
                  ]}
                />
              </div>
            </div>

            {hasRefinements && (
              <div className="store-active-filters" aria-label="Bộ lọc đang chọn">
                <span>Đang lọc:</span>
                {search && <Tag closable onClose={() => updateParam("q", "")}>Từ khóa: {search}</Tag>}
                {activeCategory && <Tag closable onClose={() => updateParam("category", "all")}>{activeCategory.name}</Tag>}
                {activeBrand && <Tag closable onClose={() => updateParam("brand", "all")}>{activeBrand.name}</Tag>}
                {selectedPrice && <Tag closable onClose={() => updateParam("price", "all")}>{selectedPrice.label}</Tag>}
                {inStock && <Tag closable onClose={() => updateParam("stock", "all")}>Còn hàng</Tag>}
                {selectedFacetTokens.map((token) => {
                  const parsed = parseFacetToken(token);
                  if (!parsed) return null;
                  const facet = filters?.facets.find((item) => item.scope === parsed.scope && item.key === parsed.key);
                  return <Tag closable onClose={() => removeFacetToken(token)} key={token}>{facet?.label ?? parsed.key}: {parsed.value}</Tag>;
                })}
                <Button type="link" size="small" onClick={() => setSearchParams({})}>Xóa tất cả</Button>
              </div>
            )}

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
                  {productsQuery.data.products.map((product) => <ProductCard product={product} key={product.id} />)}
                </div>
                {productsQuery.data.pagination.totalPages > 1 && (
                  <div className="store-pagination">
                    <Pagination
                      current={productsQuery.data.pagination.page}
                      pageSize={productsQuery.data.pagination.limit}
                      total={productsQuery.data.pagination.total}
                      showSizeChanger={false}
                      responsive
                      onChange={(nextPage) => updateParam("page", String(nextPage))}
                    />
                  </div>
                )}
              </>
            ) : !productsQuery.isError ? (
              <div className="store-catalog-empty">
                <Empty description="Chưa tìm thấy sản phẩm phù hợp">
                  <Space><Button type="primary" onClick={() => setSearchParams({})}>Xem tất cả sản phẩm</Button></Space>
                </Empty>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <Drawer
        rootClassName="store-filter-drawer"
        title="Bộ lọc sản phẩm"
        placement="left"
        size={340}
        open={mobileFiltersOpen}
        onClose={() => setMobileFiltersOpen(false)}
      >
        {filterPanel}
      </Drawer>
    </section>
  );
}
