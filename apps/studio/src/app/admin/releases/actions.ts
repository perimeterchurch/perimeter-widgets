'use server';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { auth } from '@/lib/auth/better-auth';
import { releaseStore } from '@/lib/release-store';

async function requireUser(): Promise<string> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.email) throw new Error('Unauthorized');
  return session.user.email;
}

export async function promote(name: string, version: string): Promise<void> {
  const by = await requireUser();
  await releaseStore().setLatest(name, version, 'promote', by);
  revalidatePath('/admin/releases');
}

export async function rollback(name: string, version: string): Promise<void> {
  const by = await requireUser();
  await releaseStore().setLatest(name, version, 'rollback', by);
  revalidatePath('/admin/releases');
}
