interface ProductRichTextProps { html: string; fallback: string; }

export function ProductRichText({ html, fallback }: ProductRichTextProps) {
  if (!html) return <p>{fallback || "Thông tin chi tiết sẽ được cập nhật sớm."}</p>;
  const documentFragment = new DOMParser().parseFromString(html, "text/html");
  documentFragment.querySelectorAll('a[href*="shopvnb.com"]').forEach((link) => {
    const container = link.closest("p");
    if (container?.textContent?.trim() === link.textContent?.trim()) container.remove();
    else link.remove();
  });
  return <div className="store-rich-description" dangerouslySetInnerHTML={{ __html: documentFragment.body.innerHTML }} />;
}
