import { useParams } from 'react-router';

// Stub — Task 4 mounts the preview canvas + inspector here.
export function WidgetPage() {
  const { slug } = useParams();
  return (
    <div className="px-6 py-10">
      <h1 className="text-xl font-semibold text-fg">Widget: {slug}</h1>
    </div>
  );
}
