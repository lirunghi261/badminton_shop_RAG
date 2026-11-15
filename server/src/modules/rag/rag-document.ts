import { createHash } from "node:crypto";
import { z } from "zod";
import { buildRagText } from "../catalog/catalog.service.js";
import type { NormalizedCatalogProduct } from "../catalog/catalog.types.js";

const objectId = z.string().regex(/^[a-f\d]{24}$/);
export const ragDocumentSchema = z.strictObject({
  schemaVersion: z.literal(1),
  documentId: z.string().regex(/^product:[a-f\d]{24}$/),
  productId: objectId,
  categoryId: objectId,
  brandId: objectId,
  slug: z.string().min(1),
  sourceUrl: z.string().regex(/^\/products\/[^/?#]+$/),
  content: z.string().min(1),
  contentVersion: z.string().regex(/^[a-f\d]{64}$/),
  status: z.enum(["active", "inactive"]),
  // No embedding has been generated in week 8.
  embeddingModel: z.string().min(1).nullable(),
  embeddingDimensions: z.number().int().positive().nullable(),
  indexedAt: z.iso.datetime().nullable(),
}).superRefine((document, context) => {
  if (document.documentId !== `product:${document.productId}` || document.sourceUrl !== `/products/${document.slug}`) {
    context.addIssue({ code: "custom", message: "Document identity/source mismatch" });
  }
  if (document.contentVersion !== version(document.content, document.categoryId, document.brandId)) {
    context.addIssue({ code: "custom", message: "Content version mismatch" });
  }
  const embedding = [document.embeddingModel, document.embeddingDimensions, document.indexedAt];
  if (embedding.some((value) => value === null) && !embedding.every((value) => value === null)) {
    context.addIssue({ code: "custom", message: "Embedding metadata must be all null or all present" });
  }
});
export type RagDocument = z.infer<typeof ragDocumentSchema>;

function version(content: string, categoryId: string, brandId: string): string {
  return createHash("sha256").update(JSON.stringify({ schemaVersion: 1, categoryId, brandId, content })).digest("hex");
}

export function buildRagDocument(product: NormalizedCatalogProduct): RagDocument {
  const content = buildRagText(product).normalize("NFC");
  return ragDocumentSchema.parse({
    schemaVersion: 1, documentId: `product:${product.id}`, productId: product.id,
    categoryId: product.categoryId, brandId: product.brandId, slug: product.slug,
    sourceUrl: `/products/${product.slug}`, content,
    contentVersion: version(content, product.categoryId, product.brandId), status: "active",
    embeddingModel: null, embeddingDimensions: null, indexedAt: null,
  });
}

export interface RagSyncAction {
  documentId: string;
  action: "upsert" | "deactivate" | "noop";
  reason: "new" | "content_changed" | "reactivated" | "metadata_changed" | "not_public" | "unchanged";
  requiresEmbedding: boolean;
}

// Input MUST be the complete public catalog; never pass a page or preview limit.
// This is a pure plan, not an index write or an ingestion worker.
export function planRagSync(products: NormalizedCatalogProduct[], previousInput: unknown = []) {
  const previous = z.array(ragDocumentSchema).parse(previousInput);
  const before = new Map(previous.map((document) => [document.documentId, document]));
  if (before.size !== previous.length) throw new Error("Duplicate previous documentId");
  const current = products.map(buildRagDocument);
  if (new Set(current.map((document) => document.documentId)).size !== current.length) throw new Error("Duplicate catalog productId");
  const documents: RagDocument[] = [];
  const actions: RagSyncAction[] = [];
  for (const document of current) {
    const old = before.get(document.documentId);
    before.delete(document.documentId);
    const reason = !old ? "new" : old.status !== "active" ? "reactivated"
      : old.contentVersion !== document.contentVersion ? "content_changed"
      : old.slug !== document.slug || old.sourceUrl !== document.sourceUrl ? "metadata_changed" : "unchanged";
    const requiresEmbedding = reason === "new" || reason === "reactivated" || reason === "content_changed";
    documents.push(!requiresEmbedding && old ? { ...document, embeddingModel: old.embeddingModel,
      embeddingDimensions: old.embeddingDimensions, indexedAt: old.indexedAt } : document);
    actions.push({ documentId: document.documentId, action: reason === "unchanged" ? "noop" : "upsert", reason, requiresEmbedding });
  }
  for (const old of before.values()) {
    documents.push({ ...old, status: "inactive", embeddingModel: null, embeddingDimensions: null, indexedAt: null });
    actions.push({ documentId: old.documentId, action: old.status === "inactive" ? "noop" : "deactivate",
      reason: old.status === "inactive" ? "unchanged" : "not_public", requiresEmbedding: false });
  }
  documents.sort((a, b) => a.documentId.localeCompare(b.documentId, "en"));
  actions.sort((a, b) => a.documentId.localeCompare(b.documentId, "en"));
  return { schemaVersion: 1 as const, documents, actions };
}
