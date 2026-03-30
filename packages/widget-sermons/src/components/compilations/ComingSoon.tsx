import {
    Empty,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
    EmptyDescription,
} from '@perimeter-widgets/shared';
import { Clock } from 'lucide-react';

export function ComingSoon() {
    return (
        <Empty>
            <EmptyHeader>
                <EmptyMedia>
                    <Clock className='h-12 w-12' />
                </EmptyMedia>
                <EmptyTitle>Compilations coming soon</EmptyTitle>
                <EmptyDescription>
                    We&apos;re working on bringing curated sermon compilations to
                    this page.
                </EmptyDescription>
            </EmptyHeader>
        </Empty>
    );
}
