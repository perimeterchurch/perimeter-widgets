import * as React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@perimeter/ui/card';

export interface AppProps {
  config: { greeting: string; count: number };
}

export function App({ config }: AppProps): React.JSX.Element {
  return (
    <div className="grid gap-3 p-4">
      {Array.from({ length: config.count }, (_, i) => (
        <Card key={i}>
          <CardHeader>
            <CardTitle>{config.greeting}</CardTitle>
          </CardHeader>
          <CardContent>Card #{i + 1}</CardContent>
        </Card>
      ))}
    </div>
  );
}
