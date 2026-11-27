import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);

function read(relativePath) {
  return readFileSync(resolve(root, relativePath), "utf8");
}

const panel = read("client/src/components/storefront/AdvisorChatPanel.tsx");
const prompts = read("client/src/components/storefront/advisorPrompts.ts");
const cartAction = read("client/src/components/storefront/AdvisorCartAction.tsx");
const appRoutes = read("client/src/routes/AppRoutes.tsx");
const paths = read("client/src/routes/paths.ts");
const sources = { panel, prompts, cartAction, appRoutes, paths };

const checks = [
  {
    name: "No unresolved merge markers",
    passed: Object.values(sources).every((source) => !/^<<<<<<<|^=======|^>>>>>>>/m.test(source)),
  },
  {
    name: "Assistant source is propagated to the message",
    passed: /source:\s*reply\.source/.test(panel) && /message\.source/.test(panel),
  },
  {
    name: "Top-k is capped at three products",
    passed: /\.slice\(0,\s*3\)/.test(prompts),
  },
  {
    name: "Out-of-stock products are excluded from ranking",
    passed: /product\.totalStock\s*>\s*0/.test(prompts),
  },
  {
    name: "Result card builds the canonical product link",
    passed: /paths\.productDetail\(product\.slug\)/.test(panel) && /productDetail:\s*\(slug: string\)\s*=>\s*`\/products\/\$\{slug\}`/.test(paths),
  },
  {
    name: "Product detail route is registered",
    passed: /path="products\/:slug"/.test(appRoutes),
  },
  {
    name: "Add-to-cart revalidates the live product",
    passed: /getStorefrontProduct\(product\.slug\)/.test(cartAction),
  },
  {
    name: "Add-to-cart verifies product identity, SKU, stock, and price",
    passed: /fresh\.id\s*!==\s*product\.id/.test(cartAction)
      && /candidate\.sku\s*===\s*selection\.sku/.test(cartAction)
      && /variant\.stock\s*<\s*1/.test(cartAction)
      && /unitPrice\(fresh, variant\)\s*!==\s*selection\.price/.test(cartAction),
  },
];

const failed = checks.filter((check) => !check.passed);
const result = {
  suite: "week11-khang-static-topk-ui",
  mode: "static source contract checks",
  passed: checks.length - failed.length,
  total: checks.length,
  checks,
};

console.log(JSON.stringify(result, null, 2));
if (failed.length) process.exitCode = 1;
