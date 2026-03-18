import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';

const fontSizes = [
    { name: 'xs', var: '--font-size-xs', value: '0.75rem (12px)' },
    { name: 'sm', var: '--font-size-sm', value: '0.875rem (14px)' },
    { name: 'base', var: '--font-size-base', value: '1rem (16px)' },
    { name: 'lg', var: '--font-size-lg', value: '1.125rem (18px)' },
    { name: 'xl', var: '--font-size-xl', value: '1.25rem (20px)' },
    { name: '2xl', var: '--font-size-2xl', value: '1.5rem (24px)' },
    { name: '3xl', var: '--font-size-3xl', value: '1.875rem (30px)' },
    { name: '4xl', var: '--font-size-4xl', value: '2.25rem (36px)' },
];

const fontWeights = [
    { name: 'Normal', var: '--font-weight-normal', value: '400' },
    { name: 'Medium', var: '--font-weight-medium', value: '500' },
    { name: 'Semibold', var: '--font-weight-semibold', value: '600' },
    { name: 'Bold', var: '--font-weight-bold', value: '700' },
];

function TypographyPage() {
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
            'Typography Tokens',
        ),
        // Font Size Scale
        React.createElement(
            'h2',
            {
                style: {
                    fontSize: '1.25rem',
                    fontWeight: 700,
                    marginBottom: '1rem',
                    color: 'var(--color-text)',
                    borderBottom: '1px solid var(--color-border-subtle)',
                    paddingBottom: '0.5rem',
                },
            },
            'Font Size Scale',
        ),
        ...fontSizes.map((size) =>
            React.createElement(
                'div',
                {
                    key: size.name,
                    style: {
                        display: 'flex',
                        alignItems: 'baseline',
                        gap: '1rem',
                        padding: '0.75rem 0',
                        borderBottom: '1px solid var(--color-border-subtle)',
                    },
                },
                React.createElement(
                    'code',
                    {
                        style: {
                            width: '10rem',
                            flexShrink: 0,
                            fontSize: '0.75rem',
                            color: 'var(--color-text-muted)',
                            fontFamily: 'var(--font-mono)',
                        },
                    },
                    `${size.var} (${size.value})`,
                ),
                React.createElement(
                    'span',
                    {
                        style: {
                            fontSize: `var(${size.var})`,
                            color: 'var(--color-text)',
                        },
                    },
                    `The quick brown fox — ${size.name}`,
                ),
            ),
        ),
        // Font Weights
        React.createElement(
            'h2',
            {
                style: {
                    fontSize: '1.25rem',
                    fontWeight: 700,
                    marginTop: '2rem',
                    marginBottom: '1rem',
                    color: 'var(--color-text)',
                    borderBottom: '1px solid var(--color-border-subtle)',
                    paddingBottom: '0.5rem',
                },
            },
            'Font Weights',
        ),
        ...fontWeights.map((weight) =>
            React.createElement(
                'div',
                {
                    key: weight.name,
                    style: {
                        display: 'flex',
                        alignItems: 'baseline',
                        gap: '1rem',
                        padding: '0.75rem 0',
                        borderBottom: '1px solid var(--color-border-subtle)',
                    },
                },
                React.createElement(
                    'code',
                    {
                        style: {
                            width: '10rem',
                            flexShrink: 0,
                            fontSize: '0.75rem',
                            color: 'var(--color-text-muted)',
                            fontFamily: 'var(--font-mono)',
                        },
                    },
                    `${weight.var} (${weight.value})`,
                ),
                React.createElement(
                    'span',
                    {
                        style: {
                            fontSize: '1.25rem',
                            fontWeight: Number(weight.value),
                            color: 'var(--color-text)',
                        },
                    },
                    `The quick brown fox — ${weight.name}`,
                ),
            ),
        ),
    );
}

const meta: Meta = {
    title: 'Design System/Typography',
    component: TypographyPage,
    parameters: {
        layout: 'padded',
    },
};

export default meta;

type Story = StoryObj;

export const AllTypography: Story = {};
