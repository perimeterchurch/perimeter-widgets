import { Calendar, Library, User, BookOpen } from 'lucide-react';

const iconClass = 'inline h-3 w-3 shrink-0';

export function DateLabel({ date }: { date: string }) {
  return (
    <span className="flex items-center gap-1">
      <Calendar className={iconClass} />
      {date}
    </span>
  );
}

export function SeriesPill({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted/60 px-2 py-0.5 text-xs text-muted-fg">
      <Library className={iconClass} />
      {name}
    </span>
  );
}

export function SpeakerLabel({ name }: { name: string }) {
  return (
    <span className="flex items-center gap-1">
      <User className={iconClass} />
      {name}
    </span>
  );
}

export function BookLabel({ name }: { name: string }) {
  return (
    <span className="flex items-center gap-1">
      <BookOpen className={iconClass} />
      {name}
    </span>
  );
}
