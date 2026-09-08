import { sanitizeRichText } from '../utils/richText';

export function RichTextContent({ value, emptyFallback }: { value: string; emptyFallback: string }) {
  const sanitized = sanitizeRichText(value);

  if (!sanitized) {
    return <div className="furli-rich-text-content furli-rich-text-content-empty">{emptyFallback}</div>;
  }

  return <div className="furli-rich-text-content" dangerouslySetInnerHTML={{ __html: sanitized }} />;
}
