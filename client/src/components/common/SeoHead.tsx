import { useEffect } from "react";

interface SeoHeadProps {
  title: string;
  description: string;
  canonicalPath?: string;
  structuredData?: Record<string, unknown> | Record<string, unknown>[];
}

function setMeta(attribute: "name" | "property", key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
  const created = !element;
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.append(element);
  }
  const previous = element.content;
  element.content = content;
  return () => {
    if (created) element.remove();
    else element.content = previous;
  };
}

export function SeoHead({ title, description, canonicalPath = "/", structuredData }: SeoHeadProps) {
  const serializedData = structuredData ? JSON.stringify(structuredData) : "";

  useEffect(() => {
    const previousTitle = document.title;
    document.title = title;
    const restoreMeta = [
      setMeta("name", "description", description),
      setMeta("property", "og:title", title),
      setMeta("property", "og:description", description),
      setMeta("property", "og:type", "website"),
      setMeta("property", "og:locale", "vi_VN"),
      setMeta("name", "twitter:card", "summary_large_image"),
      setMeta("name", "twitter:title", title),
      setMeta("name", "twitter:description", description),
    ];

    const canonicalUrl = new URL(canonicalPath, window.location.origin).toString();
    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    const canonicalCreated = !canonical;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.append(canonical);
    }
    const previousCanonical = canonical.href;
    canonical.href = canonicalUrl;
    const restoreOpenGraphUrl = setMeta("property", "og:url", canonicalUrl);

    let script: HTMLScriptElement | null = null;
    if (serializedData) {
      script = document.createElement("script");
      script.type = "application/ld+json";
      script.dataset.seo = "page-structured-data";
      script.text = serializedData;
      document.head.append(script);
    }

    return () => {
      document.title = previousTitle;
      restoreMeta.forEach((restore) => restore());
      restoreOpenGraphUrl();
      if (canonicalCreated) canonical.remove();
      else canonical.href = previousCanonical;
      script?.remove();
    };
  }, [canonicalPath, description, serializedData, title]);

  return null;
}
