import * as React from 'react';
import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { defineWidget } from '../src/define-widget';

describe('defineWidget', () => {
  it('returns the definition as-is, preserving fields', () => {
    const schema = z.object({ x: z.string() });
    const App = ({ config }: { config: { x: string } }): React.JSX.Element => <div>{config.x}</div>;
    const def = defineWidget({
      name: 'example',
      auth: 'none',
      schema,
      themeOverrides: { 'color-primary': 'red' },
      App,
    });
    expect(def.name).toBe('example');
    expect(def.auth).toBe('none');
    expect(def.schema).toBe(schema);
    expect(def.themeOverrides).toEqual({ 'color-primary': 'red' });
    expect(def.App).toBe(App);
  });
});
