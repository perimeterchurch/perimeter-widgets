import Link from 'next/link';

export default function NotFound() {
    return (
        <div className='flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8 text-center'>
            <p className='font-mono text-sm text-muted-foreground'>404</p>
            <h1 className='text-2xl font-bold'>Page not found</h1>
            <p className='max-w-md text-muted-foreground'>
                The page you’re looking for doesn’t exist or has been moved.
            </p>
            <Link
                href='/'
                className='rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90'
            >
                Back to home
            </Link>
        </div>
    );
}
