import type { Meta, StoryObj } from '@storybook/react';
import { Card } from './Card';

const meta: Meta<typeof Card> = {
    title: 'Primitives/Card',
    component: Card,
    argTypes: {
        hoverable: { control: 'boolean' },
    },
};

export default meta;
type Story = StoryObj<typeof Card>;

export const Default: Story = {
    render: () => (
        <Card>
            <Card.Body>
                <p>Simple card content</p>
            </Card.Body>
        </Card>
    ),
};

export const WithHeader: Story = {
    render: () => (
        <Card>
            <Card.Header>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>
                    Card Title
                </h3>
                <p className='text-sm text-[var(--color-text-muted)]'>
                    Card description
                </p>
            </Card.Header>
            <Card.Body>
                <p>Card body content goes here.</p>
            </Card.Body>
        </Card>
    ),
};

export const WithFooter: Story = {
    render: () => (
        <Card>
            <Card.Body>
                <p>Card with a footer action area.</p>
            </Card.Body>
            <Card.Footer>
                <button>Action</button>
            </Card.Footer>
        </Card>
    ),
};

export const FullCard: Story = {
    render: () => (
        <Card>
            <Card.Header>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>
                    Full Card
                </h3>
                <p className='text-sm text-[var(--color-text-muted)]'>
                    With all subcomponents
                </p>
            </Card.Header>
            <Card.Body>
                <p>
                    This card demonstrates all three subcomponents: Header,
                    Body, and Footer.
                </p>
            </Card.Body>
            <Card.Footer>
                <button>Cancel</button>
                <button style={{ marginLeft: '8px' }}>Save</button>
            </Card.Footer>
        </Card>
    ),
};

export const Hoverable: Story = {
    render: () => (
        <Card hoverable>
            <Card.Header>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>
                    Hoverable Card
                </h3>
            </Card.Header>
            <Card.Body>
                <p>Hover over this card to see the shadow effect.</p>
            </Card.Body>
        </Card>
    ),
};
