import type { StorefrontProduct } from "../../api/storefront/products.api";
import { getStartingPrice } from "./productPresentation";

export const advisorSuggestions = ["Tôi mới chơi nên chọn vợt nào?", "Tìm sản phẩm Yonex", "Tôi cần giày bám sân", "Gợi ý vợt dưới 2 triệu"];

const categoryKeywords = ["vợt", "giày", "áo", "quần", "váy", "túi", "balo", "phụ kiện"];

function getMaximumPrice(question: string) {
  const priceMatch = question.match(/(?:dưới|tối đa|khoảng)\s*(\d+(?:[.,]\d+)?)\s*(triệu|tr|nghìn|k)/i);
  if (!priceMatch) return null;
  const value = Number(priceMatch[1].replace(",", "."));
  return value * (priceMatch[2].toLocaleLowerCase("vi-VN").startsWith("tr") ? 1_000_000 : 1_000);
}

export function createAdvisorReply(question: string, products: StorefrontProduct[]) {
  const normalized = question.toLocaleLowerCase("vi-VN").trim();
  const terms = normalized.split(/\s+/).filter((term) => term.length > 2);
  const requestedCategory = categoryKeywords.find((keyword) => normalized.includes(keyword));
  const requestedBrand = products
    .map((product) => product.brand.name)
    .find((brand) => normalized.includes(brand.toLocaleLowerCase("vi-VN")));
  const maximumPrice = getMaximumPrice(normalized);
  let candidates = products.filter((product) => product.totalStock > 0);

  if (requestedCategory) {
    candidates = candidates.filter((product) =>
      `${product.category.name} ${product.name}`.toLocaleLowerCase("vi-VN").includes(requestedCategory),
    );
  }
  if (requestedBrand) {
    candidates = candidates.filter((product) => product.brand.name === requestedBrand);
  }
  if (maximumPrice != null) {
    candidates = candidates.filter((product) => getStartingPrice(product) <= maximumPrice);
  }

  const ranked = candidates
    .map((product) => {
      const haystack = `${product.name} ${product.brand.name} ${product.category.name} ${product.shortDescription}`.toLocaleLowerCase("vi-VN");
      return { product, score: terms.reduce((total, term) => total + (haystack.includes(term) ? 1 : 0), 0) };
    })
    .sort((first, second) => second.score - first.score || second.product.totalStock - first.product.totalStock)
    .slice(0, 3)
    .map(({ product }) => product);
  const message = ranked.length
    ? "Mình đã chọn một vài sản phẩm có điểm phù hợp cao theo từ khóa bạn nhập. Hãy mở trang chi tiết để so sánh biến thể, giá và tồn kho trước khi thêm vào giỏ."
    : "Mình chưa tìm thấy sản phẩm khớp rõ ràng. Bạn hãy cho mình biết thêm ngân sách, trình độ hoặc loại dụng cụ đang cần nhé.";
  return { message, products: ranked };
}
