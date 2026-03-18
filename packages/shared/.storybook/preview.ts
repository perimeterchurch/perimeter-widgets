import type { Preview } from '@storybook/react';
import React from 'react';
import '../src/styles/base.css';

const preview: Preview = {
    parameters: {
        controls: {
            matchers: {
                color: /(background|color)$/i,
                date: /Date$/i,
            },
        },
    },
    globalTypes: {
        theme: {
            description: 'Theme mode',
            toolbar: {
                title: 'Theme',
                icon: 'sun',
                items: [
                    { value: 'light', title: 'Light', icon: 'sun' },
                    { value: 'dark', title: 'Dark', icon: 'moon' },
                ],
                dynamicTitle: true,
            },
        },
    },
    initialGlobals: {
        theme: 'light',
    },
    decorators: [
        (Story, context) => {
            const theme = context.globals.theme;
            return React.createElement(
                'div',
                {
                    className: 'storybook-root',
                    'data-theme': theme === 'dark' ? 'dark' : undefined,
                    style: { padding: '1rem' },
                },
                React.createElement(Story),
            );
        },
    ],
};

export default preview;
