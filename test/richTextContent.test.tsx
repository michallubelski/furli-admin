import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RichTextContent } from '../src/shared/components/RichTextContent';

describe('admin provider rich-text description', () => {
  it('renders the formatting produced by the provider editor', () => {
    const { container } = render(
      <RichTextContent
        value="<p>Przyjmujemy <strong>wszystkie psy</strong>.</p><ul><li>Konsultacje</li><li>Profilaktyka</li></ul>"
        emptyFallback="Brak opisu"
      />,
    );

    expect(screen.getByText('wszystkie psy')).toHaveProperty('tagName', 'STRONG');
    expect(container.querySelectorAll('li')).toHaveLength(2);
  });

  it('removes executable markup and attributes before rendering', () => {
    const { container } = render(
      <RichTextContent
        value={'<p onclick="alert(1)">Bezpieczny <u>opis</u><script>alert(1)</script></p>'}
        emptyFallback="Brak opisu"
      />,
    );

    expect(container.querySelector('script')).not.toBeInTheDocument();
    expect(container.querySelector('[onclick]')).not.toBeInTheDocument();
    expect(screen.getByText('opis')).toHaveProperty('tagName', 'U');
  });

  it('keeps legacy plain-text descriptions and shows the empty fallback', () => {
    const { rerender } = render(<RichTextContent value="Zwykły opis" emptyFallback="Brak opisu" />);
    expect(screen.getByText('Zwykły opis')).toBeInTheDocument();

    rerender(<RichTextContent value="<p><br></p>" emptyFallback="Brak opisu" />);
    expect(screen.getByText('Brak opisu')).toBeInTheDocument();
  });
});
