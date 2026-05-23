import { describe, it, expect } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { AuthProviderProvider } from '../src/providers/auth-provider';
import { AuthGate } from '../src/providers/auth-gate';
import type { AuthProvider as IAuth } from '@perimeter/auth';

function fakeAuth(initial: string | null): IAuth & { _emit: (t: string | null) => void } {
  const listeners = new Set<(t: string | null) => void>();
  let token = initial;
  return {
    getToken: () => token,
    isAuthenticated: () => token !== null,
    onChange: (cb) => {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },
    _emit: (t) => {
      token = t;
      listeners.forEach((cb) => cb(t));
    },
  };
}

describe('AuthGate', () => {
  it('renders children when auth is "none"', () => {
    const auth = fakeAuth(null);
    render(
      <AuthProviderProvider value={auth}>
        <AuthGate widgetName="x" mode="none">
          <div>hi</div>
        </AuthGate>
      </AuthProviderProvider>,
    );
    expect(screen.getByText('hi')).toBeInTheDocument();
  });

  it('renders children when auth is "optional"', () => {
    const auth = fakeAuth(null);
    render(
      <AuthProviderProvider value={auth}>
        <AuthGate widgetName="x" mode="optional">
          <div>hi</div>
        </AuthGate>
      </AuthProviderProvider>,
    );
    expect(screen.getByText('hi')).toBeInTheDocument();
  });

  it('blocks children with a sign-in prompt when "required" and no token', () => {
    const auth = fakeAuth(null);
    render(
      <AuthProviderProvider value={auth}>
        <AuthGate widgetName="x" mode="required">
          <div>hi</div>
        </AuthGate>
      </AuthProviderProvider>,
    );
    expect(screen.queryByText('hi')).toBeNull();
    expect(screen.getByText(/sign in/i)).toBeInTheDocument();
  });

  it('re-renders children when a token appears', () => {
    const auth = fakeAuth(null);
    render(
      <AuthProviderProvider value={auth}>
        <AuthGate widgetName="x" mode="required">
          <div>hi</div>
        </AuthGate>
      </AuthProviderProvider>,
    );
    expect(screen.queryByText('hi')).toBeNull();
    act(() => {
      auth._emit('abc');
    });
    expect(screen.getByText('hi')).toBeInTheDocument();
  });
});
