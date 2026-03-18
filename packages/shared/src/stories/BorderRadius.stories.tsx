import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';

const radiusTokens = [
    { name: 'none', var: '--radius-none', value: '0' },
    { name: 'sm', var: '--radius-sm', value: '0.375rem (6px)' },
    { name: 'md', var: '--radius-md', value: '0.5rem (8px)' },
    { name: 'lg', var: '--radius-lg', value: '0.75rem (12px)' },
    { name: 'xl', var: '--radius-xl', value: '1rem (16px)' },
    { name: '2xl', var: '--radius-2xl', value: '1.5rem (24px)' },
    { name: 'full', var: '--radius-full', value: '9999px' },
];

function BorderRadiusPage() {
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
            'Border Radius Tokens',
        ),
        React.createElement(
            'div',
            {
                style: {
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                    gap: '1.5rem',
                },
            },
            ...radiusTokens.map((token) =>
                React.createElement(
                    'div',
                    {
                        key: token.name,
                        style: {
                            display: 'flex',
                            flexDirection: 'column' as const,
                            alignItems: 'center',
                            gap: '0.75rem',
                        },
                    },
                    React.createElement('div', {
                        style: {
                            width: '5rem',
                            height: '5rem',
                            backgroundColor: 'var(--color-primary)',
                            borderRadius: `var(${token.var})`,
                        },
                    }),
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
                                fontSize: '0.7rem',
                                color: 'var(--color-text-muted)',
                                fontFamily: 'var(--font-mono)',
                                textAlign: 'center' as const,
                            },
                        },
                        token.value,
                    ),
                ),
            ),
        ),
    );
}

const meta: Meta = {
    title: 'Design System/Border Radius',
    component: BorderRadiusPage,
    parameters: {
        layout: 'padded',
    },
};

export default meta;

type Story = StoryObj;

export const AllBorderRadius: Story = {};
