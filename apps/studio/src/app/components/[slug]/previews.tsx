'use client';
import * as React from 'react';
import { Button } from '@perimeter/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@perimeter/ui/card';
import { Input } from '@perimeter/ui/input';
import { Label } from '@perimeter/ui/label';
import { Skeleton } from '@perimeter/ui/skeleton';

export function ButtonPreview(): React.JSX.Element {
  const [variant, setVariant] = React.useState<'primary' | 'secondary' | 'ghost'>('primary');
  const [size, setSize] = React.useState<'sm' | 'md' | 'lg'>('md');
  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <label>
          Variant{' '}
          <select value={variant} onChange={(e) => setVariant(e.target.value as never)}>
            <option>primary</option>
            <option>secondary</option>
            <option>ghost</option>
          </select>
        </label>
        <label>
          Size{' '}
          <select value={size} onChange={(e) => setSize(e.target.value as never)}>
            <option>sm</option>
            <option>md</option>
            <option>lg</option>
          </select>
        </label>
      </div>
      <Button variant={variant} size={size}>
        Example button
      </Button>
    </div>
  );
}

export function CardPreview(): React.JSX.Element {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Card title</CardTitle>
      </CardHeader>
      <CardContent>Card body content goes here.</CardContent>
    </Card>
  );
}

export function InputPreview(): React.JSX.Element {
  const [v, setV] = React.useState('');
  return (
    <div className="space-y-2">
      <Label htmlFor="i">Name</Label>
      <Input id="i" value={v} onChange={(e) => setV(e.target.value)} placeholder="Type here" />
    </div>
  );
}

export function LabelPreview(): React.JSX.Element {
  return <Label htmlFor="x">Example label</Label>;
}

export function SkeletonPreview(): React.JSX.Element {
  return (
    <div className="space-y-2">
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}

export const previews: Record<string, React.ComponentType> = {
  button: ButtonPreview,
  card: CardPreview,
  input: InputPreview,
  label: LabelPreview,
  skeleton: SkeletonPreview,
};
