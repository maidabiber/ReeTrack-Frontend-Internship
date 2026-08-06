import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div className="flex min-h-full flex-1 items-center justify-center px-10 py-8">
      <div className="max-w-sm rounded-2xl bg-white px-8 py-10 text-center shadow-card">
        <span className="font-display text-6xl font-bold text-navy/10">404</span>
        <h1 className="mt-2 font-display text-lg font-bold text-navy">Page not found</h1>
        <p className="mt-1.5 text-body leading-[1.5] text-navy/60">
          The page you're looking for doesn't exist or isn't available.
        </p>
        <Link
          to="/"
          className="mt-6 inline-block rounded-full bg-brand px-4 py-2 font-display text-sm font-semibold text-white transition-colors hover:bg-brand-deep"
        >
          Back to app
        </Link>
      </div>
    </div>
  )
}
