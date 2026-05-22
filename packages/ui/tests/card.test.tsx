import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card, CardHeader, CardTitle, CardContent } from '../src/card';

describe('Card', () => {
  it('renders a region with content', () => {
    render(<Card data-testid="card">hello</Card>);
    expect(screen.getByTestId('card')).toHaveTextContent('hello');
  });

  it('composes header, title, and content', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Title</CardTitle>
        </CardHeader>
        <CardContent>Body</CardContent>
      </Card>,
    );
    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Body')).toBeInTheDocument();
  });

  it('applies border and bg classes', () => {
    render(<Card data-testid="card" />);
    const el = screen.getByTestId('card');
    expect(el.className).toContain('border');
    expect(el.className).toContain('bg-bg');
  });
});
