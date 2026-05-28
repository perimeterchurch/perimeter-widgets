'use client';
import { signIn } from '@/lib/auth/auth-client';

export default function AdminLogin() {
  return (
    <main className="mx-auto max-w-sm p-8 space-y-4">
      <h1 className="text-xl font-semibold">Admin sign-in</h1>
      <button
        className="rounded-md border border-border px-4 py-2 text-sm"
        onClick={() =>
          void signIn.social({ provider: 'ministryplatform', callbackURL: '/admin/releases' })
        }
      >
        Sign in with Ministry Platform
      </button>
    </main>
  );
}
