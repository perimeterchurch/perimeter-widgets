import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';

const shadowTokens = [
    { name: 'xs', var: '--shadow-xs' },
    { name: 'sm', var: '--shadow-sm' },
    { name: 'md', var: '--shadow-md' },
    { name: 'lg', var: '--shadow-lg' },
    { name: 'xl', var: '--shadow-xl' },
    { name: '2xl', var: '--shadow-2xl' },
];

function ShadowsPage() {
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
            'Shadow Tokens',
        ),
        React.createElement(
            'div',
            {
                style: {
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                    gap: '2rem',
                },
            },
            ...shadowTokens.map((token) =>
                React.createElement(
                    'div',
                    {
                        key: token.name,
                        style: {
                            padding: '2rem',
                            borderRadius: '0.75rem',
                            backgroundColor: 'var(--color-card)',
                            boxShadow: `var(${token.var})`,
                            display: 'flex',
                            flexDirection: 'column' as const,
                            alignItems: 'center',
                            gap: '0.5rem',
                        },
                    },
                    React.createElement(
                        'span',
                        {
                            style: {
                                fontWeight: 600,
                                fontSize: '0.875rem',
                                color: 'var(--color-text)',
                            },
                        },
                        token.name,
                    ),
                    React.createElement(
                        'code',
                        {
                            style: {
                                fontSize: '0.75rem',
                                color: 'var(--color-text-muted)',
                                fontFamily: 'var(--font-mono)',
                            },
                        },
                        token.var,
                    ),
                ),
            ),
        ),
    );
}

const meta: Meta = {
    title: 'Design System/Shadows',
    component: ShadowsPage,
    parameters: {
        layout: 'padded',
    },
};

export default meta;

type Story = StoryObj;

export const AllShadows: Story = {};
