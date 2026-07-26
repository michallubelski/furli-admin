export const SUPPORTED_LOCALES = ['pl-PL', 'en-US'] as const;

export type Locale = typeof SUPPORTED_LOCALES[number];

export type TranslationLeaf =
  | string
  | {
      zero?: string;
      one?: string;
      two?: string;
      few?: string;
      many?: string;
      other: string;
    };

export interface TranslationNode {
  [key: string]: TranslationLeaf | TranslationNode;
}
