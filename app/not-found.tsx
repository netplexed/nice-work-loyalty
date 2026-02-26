import Link from 'next/link'
import { Button } from '@/components/ui/button'

export const dynamic = 'force-dynamic'

export default function NotFound() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">404</h1>
            <h2 className="text-xl font-semibold text-gray-700 mb-4">Page Not Found</h2>
            <p className="text-gray-500 mb-8 max-w-xs">
                Sorry, we couldn't find the page you're looking for.
            </p>
            <Link href="/">
                <Button variant="default">
                    Go Back Home
                </Button>
            </Link>
        </div>
    )
}
