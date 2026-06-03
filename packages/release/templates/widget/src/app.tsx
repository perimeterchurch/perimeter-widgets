import * as React from 'react';
import { Card, CardHeader, CardTitle } from '@perimeter/ui/card';

export interface AppProps {
  config: { title: string };
}

export function App({ config }: AppProps): React.JSX.Element {
  return (
    <div className="grid gap-3 p-4">
      <Card>
        <CardHeader>
          <CardTitle>{config.title}</CardTitle>
        </CardHeader>
      </Card>
    </div>
  );
}
