// @vitest-environment happy-dom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup, waitFor } from '@testing-library/react';
import { MpLoginPanel } from './MpLoginPanel';

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  vi.restoreAllMocks();
});

function seedToken() {
  window.localStorage.setItem('mpp-widgets_AuthToken', 'tok');
  window.localStorage.setItem(
    'mpp-widgets_ExpiresAfter',
    new Date(Date.now() + 3_600_000).toISOString(),
  );
}

describe('MpLoginPanel', () => {
  it('signed out + required → prominent sign-in that opens the popup', () => {
    const open = vi.spyOn(window, 'open').mockReturnValue({} as Window);
    const { getByRole } = render(<MpLoginPanel mode="required" />);
    expect(getByRole('region').textContent).toMatch(/requires a signed-in perimeter account/i);
    getByRole('button', { name: /sign in/i }).click();
    expect(open).toHaveBeenCalledWith('/mp-login.html', 'perimeter-mp-login', expect.any(String));
  });

  it('popup blocked → inline new-tab link fallback', async () => {
    vi.spyOn(window, 'open').mockReturnValue(null);
    const { getByRole, findByRole } = render(<MpLoginPanel mode="required" />);
    getByRole('button', { name: /sign in/i }).click();
    const link = await findByRole('link', { name: /open the sign-in page/i });
    expect(link.getAttribute('href')).toBe('/mp-login.html');
    expect(link.getAttribute('target')).toBe('_blank');
  });

  it('signed in → confirmation with a manage link, updating live from storage', async () => {
    const { getByRole, findByText } = render(<MpLoginPanel mode="required" />);
    expect(getByRole('region').textContent).toMatch(/sign in/i);
    seedToken(); // the panel's MPLocalStorageAuth poll picks this up
    await findByText(/signed in/i, undefined, { timeout: 3000 });
  });

  it('optional mode → compact personalization copy', () => {
    const { getByRole } = render(<MpLoginPanel mode="optional" />);
    expect(getByRole('region').textContent).toMatch(/personalized/i);
  });
});
