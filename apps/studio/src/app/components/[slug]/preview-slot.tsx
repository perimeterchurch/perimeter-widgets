'use client';
import * as React from 'react';
import { previews } from './previews';

export interface PreviewSlotProps {
  slug: string;
}

export function PreviewSlot({ slug }: PreviewSlotProps): React.JSX.Element | null {
  const Preview = previews[slug];
  if (!Preview) return null;
  return <Preview />;
}
