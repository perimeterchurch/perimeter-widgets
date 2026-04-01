import type { ReactNode } from 'react';
import { Calendar, Library, User, BookOpen } from 'lucide-react';
import { cn } from '@perimeter-widgets/shared';

const iconClass = 'h-3 w-3 shrink-0';
const pillClass =
    'inline-flex items-center gap-1 rounded-full bg-muted/60 px-2 py-0.5 text-xs text-muted-foreground';

function Pill({
    children,
    className,
}: {
    children: ReactNode;
    className?: string;
}) {
    return <span className={cn(pillClass, className)}>{children}</span>;
}

export function DatePill({ date }: { date: string }) {
    return (
        <Pill>
            <Calendar className={iconClass} />
            {date}
        </Pill>
    );
}

export function SeriesPill({ name }: { name: string }) {
    return (
        <Pill>
            <Library className={iconClass} />
            {name}
        </Pill>
    );
}

export function SpeakerPill({ name }: { name: string }) {
    return (
        <Pill>
            <User className={iconClass} />
            {name}
        </Pill>
    );
}

export function BookPill({ name }: { name: string }) {
    return (
        <Pill>
            <BookOpen className={iconClass} />
            {name}
        </Pill>
    );
}
