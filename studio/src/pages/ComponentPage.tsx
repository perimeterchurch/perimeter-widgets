import { useParams } from 'react-router';

// Stub — Task 4 renders the component doc / gallery here.
export function ComponentPage() {
  const { name } = useParams();
  return (
    <div className="px-6 py-10">
      <h1 className="text-xl font-semibold text-fg">Component: {name}</h1>
    </div>
  );
}
