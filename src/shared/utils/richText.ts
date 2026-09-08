const ALLOWED_ELEMENTS = new Set(['P', 'BR', 'STRONG', 'EM', 'U', 'UL', 'OL', 'LI']);
const BLOCKED_ELEMENTS = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED']);
const NORMALIZED_ELEMENTS: Record<string, string> = {
  B: 'strong',
  DIV: 'p',
  I: 'em',
};

/** Matches the provider panel's supported description format and strips all unsafe markup. */
export function sanitizeRichText(value: string): string {
  if (!value) return '';

  const documentNode = new DOMParser().parseFromString(`<body>${value}</body>`, 'text/html');

  const sanitizeNode = (node: Node): void => {
    if (!(node instanceof Element)) return;

    if (BLOCKED_ELEMENTS.has(node.tagName)) {
      node.remove();
      return;
    }

    [...node.childNodes].forEach(sanitizeNode);

    const normalizedTag = NORMALIZED_ELEMENTS[node.tagName];
    if (normalizedTag) {
      const replacement = documentNode.createElement(normalizedTag);
      replacement.append(...node.childNodes);
      node.replaceWith(replacement);
      return;
    }

    if (ALLOWED_ELEMENTS.has(node.tagName)) {
      [...node.attributes].forEach((attribute) => node.removeAttribute(attribute.name));
      return;
    }

    node.replaceWith(...node.childNodes);
  };

  [...documentNode.body.childNodes].forEach(sanitizeNode);
  const sanitized = documentNode.body.innerHTML;
  return richTextToPlainText(sanitized) ? sanitized : '';
}

export function richTextToPlainText(value: string): string {
  if (!value) return '';
  const documentNode = new DOMParser().parseFromString(`<body>${value}</body>`, 'text/html');
  return (documentNode.body.textContent || '').replace(/\u00a0/g, ' ').trim();
}
