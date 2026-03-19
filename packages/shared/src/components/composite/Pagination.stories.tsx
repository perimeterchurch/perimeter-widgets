import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Pagination } from './Pagination';

const meta: Meta<typeof Pagination> = {
    title: 'Composite/Pagination',
    component: Pagination,
};

export default meta;
type Story = StoryObj<typeof Pagination>;

export const Default: Story = {
    render: () => {
        const Wrapper = () => {
            const [page, setPage] = useState(1);
            return (
                <div className="flex flex-col items-center gap-4">
                    <Pagination page={page} totalPages={29} onChange={setPage} />
                    <div className="text-sm text-stone-600">Page {page} of 29</div>
                </div>
            );
        };
        return <Wrapper />;
    },
};

export const FewPages: Story = {
    render: () => {
        const Wrapper = () => {
            const [page, setPage] = useState(1);
            return (
                <div className="flex flex-col items-center gap-4">
                    <Pagination page={page} totalPages={3} onChange={setPage} />
                    <div className="text-sm text-stone-600">Page {page} of 3</div>
                </div>
            );
        };
        return <Wrapper />;
    },
};
