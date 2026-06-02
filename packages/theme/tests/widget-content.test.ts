import { describe, expect, it } from 'vitest';
import { widgetContent } from '../src/tailwind';

describe('widgetContent', () => {
  it('scans the widget source and every shared UI source a widget can render', () => {
    expect(widgetContent).toContain('./src/**/*.{ts,tsx}');
    expect(widgetContent).toContain('../../packages/ui/src/**/*.{ts,tsx}');
  });
});
