import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { caretAfterDigits, DateInput, displayToIso, maskDate } from '../src/shared/components/DateInput';
import { I18nProvider } from '../src/shared/i18n';

// The field moves the cursor in the next animation frame - wait for it before placing the cursor.
const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

// Every typed date is DD.MM.RRRR and the dots come by themselves - the person only types digits.

function Field({ initial = '', min, max, onChange = () => undefined }: { initial?: string; min?: string; max?: string; onChange?: (iso: string) => void }) {
  const [value, setValue] = useState(initial);
  return (
    <I18nProvider>
      <DateInput id="date" value={value} min={min} max={max} ariaLabel="Data" inputStyle={{}} onChange={(iso) => { setValue(iso); onChange(iso); }} />
      <output data-testid="value">{value}</output>
      <button type="button" onClick={() => setValue('2026-12-01')}>ustaw z zewnątrz</button>
    </I18nProvider>
  );
}

beforeEach(() => window.localStorage.setItem('furli.locale', 'pl-PL'));

describe('the date mask', () => {
  it('puts the dots in as digits come and drops anything else', () => {
    expect(maskDate('2')).toBe('2');
    expect(maskDate('240')).toBe('24.0');
    expect(maskDate('24062026')).toBe('24.06.2026');
    expect(maskDate('24-06/2026')).toBe('24.06.2026');
    expect(maskDate('240620261')).toBe('24.06.2026');
  });

  it('while typing puts each dot in as soon as the day or the month is complete', () => {
    expect(maskDate('24', true)).toBe('24.');
    expect(maskDate('240', true)).toBe('24.0');
    expect(maskDate('2406', true)).toBe('24.06.');
    expect(maskDate('24062026', true)).toBe('24.06.2026');
    expect(maskDate('24')).toBe('24');
    expect(maskDate('2406')).toBe('24.06');
  });

  it('reads only a day that exists', () => {
    expect(displayToIso('24.06.2026')).toBe('2026-06-24');
    expect(displayToIso('29.02.2028')).toBe('2028-02-29');
    expect(displayToIso('31.02.2026')).toBeNull();
    expect(displayToIso('24.06')).toBeNull();
  });

  it('keeps the cursor after the same digit', () => {
    expect(caretAfterDigits('24.06.2026', 2)).toBe(2);
    expect(caretAfterDigits('24.06.2026', 3)).toBe(4);
    expect(caretAfterDigits('24.06.2026', 0)).toBe(0);
  });
});

describe('the date field', () => {
  it('turns typed digits into DD.MM.RRRR and gives the form an ISO date', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Field onChange={onChange} />);
    const input = screen.getByLabelText('Data');

    expect(input).toHaveAttribute('placeholder', 'DD.MM.RRRR');
    expect(input).toHaveAttribute('inputmode', 'numeric');
    await user.type(input, '24062026');

    expect(input).toHaveValue('24.06.2026');
    expect(screen.getByTestId('value')).toHaveTextContent('2026-06-24');
    expect(onChange).toHaveBeenLastCalledWith('2026-06-24');
  });

  it("says when a date doesn't exist or is out of range", async () => {
    const user = userEvent.setup();
    render(<Field min="2026-06-01" max="2026-06-30" />);
    const input = screen.getByLabelText('Data');

    await user.type(input, '31022026');
    expect(screen.getByRole('alert')).toHaveTextContent('Taka data nie istnieje');
    expect(screen.getByTestId('value')).toHaveTextContent('');

    await user.clear(input);
    await user.type(input, '15052026');
    expect(screen.getByRole('alert')).toHaveTextContent('Najwcześniejsza możliwa data to 01.06.2026.');

    await user.clear(input);
    await user.type(input, '01072026');
    expect(screen.getByRole('alert')).toHaveTextContent('Najpóźniejsza możliwa data to 30.06.2026.');

    await user.clear(input);
    await user.type(input, '15062026');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByTestId('value')).toHaveTextContent('2026-06-15');
  });

  it('shows each dot right after the day and the month, before the next digit is typed', async () => {
    const user = userEvent.setup();
    render(<Field />);
    const input = screen.getByLabelText('Data') as HTMLInputElement;

    await user.type(input, '24');
    expect(input).toHaveValue('24.');
    await nextFrame();
    expect(input.selectionStart).toBe(3);
    await user.type(input, '06');
    expect(input).toHaveValue('24.06.');
    await user.type(input, '2026');
    expect(input).toHaveValue('24.06.2026');
  });

  it('removes a trailing dot with one Backspace instead of getting stuck on it', async () => {
    const user = userEvent.setup();
    render(<Field />);
    const input = screen.getByLabelText('Data');

    await user.type(input, '2406');
    await user.keyboard('{Backspace}');
    expect(input).toHaveValue('24.06');
    await user.keyboard('{Backspace}');
    expect(input).toHaveValue('24.0');
    // The dot that would be left at the end goes with the digit.
    await user.keyboard('{Backspace}');
    expect(input).toHaveValue('24');
    await user.keyboard('{Backspace}');
    expect(input).toHaveValue('2');
  });

  it('deletes the digit before a dot in the middle on Backspace', async () => {
    const user = userEvent.setup();
    render(<Field />);
    const input = screen.getByLabelText('Data') as HTMLInputElement;
    await user.type(input, '24062026');

    await nextFrame();
    input.setSelectionRange(3, 3); // 24.|06.2026
    await user.keyboard('{Backspace}');
    expect(input).toHaveValue('20.62.026');
  });

  it('asks for the full date only once the field is left half-typed', async () => {
    const user = userEvent.setup();
    render(<Field />);
    const input = screen.getByLabelText('Data');

    await user.type(input, '2406');
    expect(input).toHaveValue('24.06.');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    await user.tab();

    expect(screen.getByRole('alert')).toHaveTextContent('Wpisz pełną datę w formacie DD.MM.RRRR');
  });

  it('reads a pasted year-first date the right way round', () => {
    render(<Field />);
    fireEvent.change(screen.getByLabelText('Data'), { target: { value: '2026-06-24' } });

    expect(screen.getByLabelText('Data')).toHaveValue('24.06.2026');
    expect(screen.getByTestId('value')).toHaveTextContent('2026-06-24');
  });

  it('shows a date set from outside and one picked in the calendar', async () => {
    const user = userEvent.setup();
    const { container } = render(<Field initial="2026-06-24" />);
    expect(screen.getByLabelText('Data')).toHaveValue('24.06.2026');

    await user.click(screen.getByRole('button', { name: 'ustaw z zewnątrz' }));
    expect(screen.getByLabelText('Data')).toHaveValue('01.12.2026');

    fireEvent.change(container.querySelector('input[type="date"]') as HTMLInputElement, { target: { value: '2026-07-03' } });
    expect(screen.getByLabelText('Data')).toHaveValue('03.07.2026');
    expect(screen.getByTestId('value')).toHaveTextContent('2026-07-03');
  });
});
