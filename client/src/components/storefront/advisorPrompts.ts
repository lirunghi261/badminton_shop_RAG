import type { StorefrontProduct } from "../../api/storefront/products.api";

export const advisorSuggestions = ["Tôi mới chơi nên chọn vợt nào?", "Tìm sản phẩm Yonex", "Tôi cần giày bám sân", "Gợi ý vợt dưới 2 triệu"];

export function createAdvisorReply(question: string, products: StorefrontProduct[]) {
  const normalized = question.toLocaleLowerCase("vi-VN").trim();
  const terms = normalized.split(/\s+/).filter((term) => term.length > 2);
  const ranked = products
    .map((product) => {
      const haystack = `${product.name} ${product.brand.name} ${product.category.name} ${product.shortDescription}`.toLocaleLowerCase("vi-VN");
      return { product, score: terms.reduce((total, term) => total + (haystack.includes(term) ? 1 : 0), 0) };
    })
    .sort((first, second) => second.score - first.score || second.product.totalStock - first.product.totalStock)
    .filter(({ product }) => product.totalStock > 0)
    .slice(0, 3)
    .map(({ product }) => product);
  const message = ranked.length
    ? "Mình đã chọn một vài sản phẩm có điểm phù hợp cao theo từ khóa bạn nhập. Hãy mở trang chi tiết để so sánh biến thể, giá và tồn kho trước khi thêm vào giỏ."
    : "Mình chưa tìm thấy sản phẩm khớp rõ ràng. Bạn hãy cho mình biết thêm ngân sách, trình độ hoặc loại dụng cụ đang cần nhé.";
  return { message, products: ranked };
}
