import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';

const colorSwatch = (name: string, cssVar: string, hex: string) =>
    React.createElement(
        'div',
        {
            key: name,
            style: {
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.5rem 0',
            },
        },
        React.createElement('div', {
            style: {
                width: '3rem',
                height: '3rem',
                borderRadius: '0.5rem',
                backgroundColor: `var(${cssVar})`,
                border: '1px solid var(--color-border)',
                flexShrink: 0,
            },
        }),
        React.createElement(
            'div',
            {
                style: {
                    display: 'flex',
                    flexDirection: 'column' as const,
                    gap: '0.125rem',
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
                name,
            ),
            React.createElement(
                'code',
                {
                    style: {
                        fontSize: '0.75rem',
                        color: 'var(--color-text-secondary)',
                        fontFamily: 'var(--font-mono)',
                    },
                },
                cssVar,
            ),
            React.createElement(
                'span',
                {
                    style: {
                        fontSize: '0.75rem',
                        color: 'var(--color-text-muted)',
                    },
                },
                hex,
            ),
        ),
    );

const section = (title: string, children: React.ReactNode[]) =>
    React.createElement(
        'div',
        { key: title, style: { marginBottom: '2rem' } },
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
            title,
        ),
        React.createElement(
            'div',
            {
                style: {
                    display: 'grid',
                    gridTemplateColumns:
                        'repeat(auto-fill, minmax(280px, 1fr))',
                    gap: '0.25rem',
                },
            },
            ...children,
        ),
    );

function ColorsPage() {
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
            'Color Tokens',
        ),
        section('Primary', [
            colorSwatch('Primary', '--color-primary', '#5b5bd6'),
            colorSwatch('Primary Hover', '--color-primary-hover', '#4e4eca'),
            colorSwatch('Primary Active', '--color-primary-active', '#4242b8'),
            colorSwatch(
                'Primary Foreground',
                '--color-primary-foreground',
                '#ffffff',
            ),
        ]),
        section('Success', [
            colorSwatch('Success', '--color-success', '#46a758'),
            colorSwatch('Success Hover', '--color-success-hover', '#3d9b4f'),
            colorSwatch('Success Active', '--color-success-active', '#348746'),
            colorSwatch(
                'Success Foreground',
                '--color-success-foreground',
                '#ffffff',
            ),
        ]),
        section('Warning', [
            colorSwatch('Warning', '--color-warning', '#f5a623'),
            colorSwatch('Warning Hover', '--color-warning-hover', '#e09918'),
            colorSwatch('Warning Active', '--color-warning-active', '#c88a14'),
            colorSwatch(
                'Warning Foreground',
                '--color-warning-foreground',
                '#ffffff',
            ),
        ]),
        section('Error', [
            colorSwatch('Error', '--color-error', '#e54666'),
            colorSwatch('Error Hover', '--color-error-hover', '#d93d5c'),
            colorSwatch('Error Active', '--color-error-active', '#c63652'),
            colorSwatch(
                'Error Foreground',
                '--color-error-foreground',
                '#ffffff',
            ),
        ]),
        section('Surface Colors', [
            colorSwatch('Background', '--color-background', '#ffffff'),
            colorSwatch('Foreground', '--color-foreground', '#1c1917'),
            colorSwatch('Card', '--color-card', '#ffffff'),
            colorSwatch(
                'Card Foreground',
                '--color-card-foreground',
                '#1c1917',
            ),
            colorSwatch('Muted', '--color-muted', '#f5f5f4'),
            colorSwatch(
                'Muted Foreground',
                '--color-muted-foreground',
                '#78716c',
            ),
            colorSwatch('Accent', '--color-accent', '#f5f5f4'),
            colorSwatch(
                'Accent Foreground',
                '--color-accent-foreground',
                '#1c1917',
            ),
            colorSwatch('Popover', '--color-popover', '#ffffff'),
            colorSwatch(
                'Popover Foreground',
                '--color-popover-foreground',
                '#1c1917',
            ),
            colorSwatch('Destructive', '--color-destructive', '#e54666'),
            colorSwatch(
                'Destructive Foreground',
                '--color-destructive-foreground',
                '#ffffff',
            ),
            colorSwatch('Border', '--color-border', '#d6d3d1'),
            colorSwatch('Input', '--color-input', '#d6d3d1'),
            colorSwatch('Ring', '--color-ring', '#5b5bd6'),
        ]),
        section('Base Scale', [
            colorSwatch('Background', '--color-bg', '#fafaf9'),
            colorSwatch('Background Subtle', '--color-bg-subtle', '#f5f5f4'),
            colorSwatch('Background Muted', '--color-bg-muted', '#e7e5e4'),
            colorSwatch('Text', '--color-text', '#1c1917'),
            colorSwatch('Text Secondary', '--color-text-secondary', '#57534e'),
            colorSwatch('Text Muted', '--color-text-muted', '#a8a29e'),
            colorSwatch('Border Subtle', '--color-border-subtle', '#e7e5e4'),
        ]),
    );
}

const meta: Meta = {
    title: 'Design System/Colors',
    component: ColorsPage,
    parameters: {
        layout: 'padded',
    },
};

export default meta;

type Story = StoryObj;

export const AllColors: Story = {};
