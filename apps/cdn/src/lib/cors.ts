import type { NextConfig } from 'next';

type HeaderEntry = NonNullable<Awaited<ReturnType<NonNullable<NextConfig['headers']>>>>[number];

// eslint-disable-next-line @typescript-eslint/require-await
export async function corsHeaders(): Promise<HeaderEntry[]> {
  return [
    {
      source: '/(.*)',
      headers: [{ key: 'Access-Control-Allow-Origin', value: '*' }],
    },
  ];
}
