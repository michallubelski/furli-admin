import { afterEach, describe, expect, it, vi } from 'vitest';
import { rejectProvider, requestProviderChanges } from './api';

const providerResponse = {
  id: 'provider-1',
  profile: { name: 'Testowa placówka' },
};

describe('admin provider decisions API', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each([
    ['reject', rejectProvider],
    ['request-changes', requestProviderChanges],
  ] as const)('sends the administrator note for %s', async (action, request) => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(providerResponse), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));

    await request('token-123', 'provider-1', 'Uzupełnij dane kontaktowe');

    expect(fetchMock).toHaveBeenCalledWith(`/api/admin/providers/provider-1/${action}`, expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ note: 'Uzupełnij dane kontaktowe' }),
      headers: expect.objectContaining({
        Authorization: 'Bearer token-123',
        'Content-Type': 'application/json',
      }),
    }));
  });
});
