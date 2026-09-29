import { connectDatabase, disconnectDatabase } from "../config/database.js";
import { buildRagText, listCatalogProducts } from "../modules/catalog/catalog.service.js";

async function previewRagData(): Promise<void> {
  await connectDatabase();

  const products = await listCatalogProducts({ limit: 3 });

  console.log(`Preview RAG data from ${products.length} products`);

  for (const [index, product] of products.entries()) {
    console.log(`\n===== PRODUCT ${index + 1} =====`);
    console.log(
      JSON.stringify(
        {
          id: product.id,
          slug: product.slug,
          name: product.name,
          brandName: product.brandName,
          categoryName: product.categoryName,
          basePrice: product.basePrice,
          salePrice: product.salePrice,
          effectivePrice: product.effectivePrice,
          totalStock: product.totalStock,
          primaryImage: product.primaryImage,
          updatedAt: product.updatedAt,
        },
        null,
        2,
      ),
    );
    console.log("\nRAG text:");
    console.log(buildRagText(product));
  }
}

previewRagData()
  .catch((error) => {
    console.error("Unable to preview RAG data:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDatabase();
  });
