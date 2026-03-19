import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { DateRangePicker } from './DateRangePicker';

const meta: Meta<typeof DateRangePicker> = {
    title: 'Composite/DateRangePicker',
    component: DateRangePicker,
};

export default meta;
type Story = StoryObj<typeof DateRangePicker>;

export const Default: Story = {
    render: () => {
        const Wrapper = () => {
            const [from, setFrom] = useState('');
            const [to, setTo] = useState('');
            return (
                <div className="flex flex-col gap-4">
                    <DateRangePicker
                        from={from}
                        to={to}
                        onFromChange={setFrom}
                        onToChange={setTo}
                    />
                    <div className="text-sm text-stone-500">
                        Range:{' '}
                        <span className="font-medium text-stone-800">
                            {from || 'any'} — {to || 'any'}
                        </span>
                    </div>
                </div>
            );
        };
        return <Wrapper />;
    },
};

export const WithPresetValues: Story = {
    render: () => {
        const Wrapper = () => {
            const [from, setFrom] = useState('2026-01-01');
            const [to, setTo] = useState('2026-03-31');
            return (
                <div className="flex flex-col gap-4">
                    <DateRangePicker
                        from={from}
                        to={to}
                        onFromChange={setFrom}
                        onToChange={setTo}
                    />
                    <div className="text-sm text-stone-500">
                        Range:{' '}
                        <span className="font-medium text-stone-800">
                            {from} — {to}
                        </span>
                    </div>
                </div>
            );
        };
        return <Wrapper />;
    },
};
