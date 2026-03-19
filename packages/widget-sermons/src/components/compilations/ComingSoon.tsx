import { EmptyState } from '@perimeter-widgets/shared';
import { Clock } from 'lucide-react';

export function ComingSoon() {
    return <EmptyState icon={<Clock className="h-12 w-12" />} title="Compilations coming soon" description="We're working on bringing curated sermon compilations to this page." />;
}
