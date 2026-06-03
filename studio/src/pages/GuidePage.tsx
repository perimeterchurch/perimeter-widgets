import { useParams } from 'react-router';

// Stub — Chunk 3 (Task 12) renders the MDX guide here.
export function GuidePage() {
  const { slug } = useParams();
  return (
    <div className="px-6 py-10">
      <h1 className="text-xl font-semibold text-fg">Guide: {slug}</h1>
    </div>
  );
}
