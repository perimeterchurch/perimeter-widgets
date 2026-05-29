import type { NextConfig } from 'next';

type HeaderEntry = NonNullable<Awaited<ReturnType<NonNullable<NextConfig['headers']>>>>[number];

export function corsHeaders(): HeaderEntry[] {
  return [
    {
      source: '/(.*)',
      headers: [{ key: 'Access-Control-Allow-Origin', value: '*' }],
    },
  ];
}
