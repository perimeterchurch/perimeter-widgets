import { redirect } from 'next/navigation';

/**
 * Legacy /tokens route — moved to /design/colors when the `/design/*` section
 * landed in Phase 5. Bookmarks and in-product links keep working via this
 * permanent redirect.
 */
export default function TokensRedirect() {
    redirect('/design/colors');
}
