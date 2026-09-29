import { http } from "../core/http";

export interface RagPreviewImage {
  url: string;
  alt: string;
  isPrimary: boolean;
  sortOrder: number;
}

export interface RagPreviewProduct {
  id: string;
  slug: string;
  name: string;
  brandName: string | null;
  categoryName: string | null;
  effectivePrice: number | null;
  totalStock: number;
  primaryImage: RagPreviewImage | null;
  ragText: string;
}

export interface RagPreviewResponse {
  success: true;
  count: number;
  products: RagPreviewProduct[];
}

export async function getRagPreview(): Promise<RagPreviewResponse> {
  const response = await http.get<RagPreviewResponse>("/rag/preview");
  return response.data;
}
