import { Link } from 'react-router';

export function NotFoundPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16 text-center">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-fg">404</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-fg">Page not found</h1>
      <Link
        to="/"
        className="mt-4 inline-block text-sm text-primary underline-offset-4 hover:underline"
      >
        Back to overview
      </Link>
    </div>
  );
}
