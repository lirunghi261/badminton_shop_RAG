import type { StorefrontProduct } from "../../api/storefront/products.api";
import { getStartingPrice } from "./productPresentation";

export const advisorSuggestions = [
  "Tôi mới chơi, cổ tay yếu, chọn vợt nào dưới 1,5 triệu?",
  "Tôi đánh đôi, cần vợt Yonex dưới 2 triệu.",
  "Giày bám sân cho chân bè, giá dưới 1,8 triệu?",
  "Cần túi 2 vợt có ngăn giày, khoảng 700 nghìn.",
];

export const advisorShoppingQuestions = [
  "Tôi mới tập 2 buổi mỗi tuần, cổ tay yếu, nên chọn vợt dễ đánh dưới 1,5 triệu?",
  "Tôi đánh đôi thiên về phản tạt, cần vợt Yonex dưới 2 triệu.",
  "Giày nào bám sân tốt cho chân bè, size 42, giá dưới 1,8 triệu?",
  "Tôi cần túi đựng 2 vợt có ngăn giày, ngân sách khoảng 700 nghìn.",
  "Tư vấn vợt công thủ toàn diện cho lực cổ tay trung bình, tầm 2-3 triệu.",
  "Người mới đi tập cần mua thêm những phụ kiện nào?",
];

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
    ? "Mình tìm được vài sản phẩm theo từ khóa bạn nhập. Bạn có thể mở trang chi tiết hoặc chọn phiên bản ngay bên dưới để xem giá và tồn kho hiện tại."
    : "Mình chưa tìm thấy sản phẩm khớp rõ ràng. Bạn hãy cho mình biết thêm ngân sách, trình độ hoặc loại dụng cụ đang cần nhé.";
  return {
    message,
    products: ranked,
    source: ranked.length ? {
      title: "Catalog Badminton Shop",
      detail: `Đã đối chiếu ${ranked.length} sản phẩm theo tên, danh mục, thương hiệu, giá mở đầu và tồn kho hiện có.`,
    } : undefined,
  };
}
