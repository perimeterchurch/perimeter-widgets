import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';

const spacingTokens = [
    { name: 'xs', var: '--spacing-xs', rem: '0.5rem', px: '8px' },
    { name: 'sm', var: '--spacing-sm', rem: '0.75rem', px: '12px' },
    { name: 'md', var: '--spacing-md', rem: '1rem', px: '16px' },
    { name: 'lg', var: '--spacing-lg', rem: '1.5rem', px: '24px' },
    { name: 'xl', var: '--spacing-xl', rem: '2rem', px: '32px' },
    { name: '2xl', var: '--spacing-2xl', rem: '3rem', px: '48px' },
    { name: '3xl', var: '--spacing-3xl', rem: '4rem', px: '64px' },
];

function SpacingPage() {
    return React.createElement(
        'div',
        { style: { maxWidth: '960px' } },
        React.createElement(
            'h1',
            {
                style: {
                    fontSize: '1.875rem',
                    fontWeight: 700,
                    marginBottom: '2rem',
                    color: 'var(--color-text)',
                },
            },
            'Spacing Tokens',
        ),
        ...spacingTokens.map((token) =>
            React.createElement(
                'div',
                {
                    key: token.name,
                    style: {
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem',
                        padding: '0.75rem 0',
                        borderBottom: '1px solid var(--color-border-subtle)',
                    },
                },
                React.createElement(
                    'code',
                    {
                        style: {
                            width: '8rem',
                            flexShrink: 0,
                            fontSize: '0.75rem',
                            color: 'var(--color-text-muted)',
                            fontFamily: 'var(--font-mono)',
                        },
                    },
                    token.var,
                ),
                React.createElement(
                    'span',
                    {
                        style: {
                            width: '5rem',
                            flexShrink: 0,
                            fontSize: '0.75rem',
                            color: 'var(--color-text-secondary)',
                        },
                    },
                    `${token.rem} / ${token.px}`,
                ),
                React.createElement('div', {
                    style: {
                        width: `var(${token.var})`,
                        height: '1.5rem',
                        backgroundColor: 'var(--color-primary)',
                        borderRadius: '0.25rem',
                        flexShrink: 0,
                    },
                }),
            ),
        ),
    );
}

const meta: Meta = {
    title: 'Design System/Spacing',
    component: SpacingPage,
    parameters: {
        layout: 'padded',
    },
};

export default meta;

type Story = StoryObj;

export const AllSpacing: Story = {};
