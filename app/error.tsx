"use client";

/**
 * Any server-side failure lands here — most often a database that can't be
 * reached. The raw AggregateError from the Postgres driver says nothing useful
 * on screen, so name the likely cause and how to fix it.
 */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const looksLikeDb =
    /ECONNREFUSED|ENOTFOUND|CONNECT_TIMEOUT|password authentication|SASL|DATABASE_URL|getaddrinfo/i.test(
      `${error.message} ${error.name}`
    ) || !error.message;

  return (
    <div className="min-h-screen bg-field flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-lg rounded-xl border border-line bg-paper p-6">
        <h1 className="display text-xl font-bold text-navy mb-2">
          {looksLikeDb ? "Can't reach the database" : "Something went wrong"}
        </h1>

        {looksLikeDb ? (
          <div className="text-sm text-mute grid gap-2">
            <p>
              The app couldn&apos;t connect to Postgres. The usual causes, in order:
            </p>
            <ul className="list-disc pl-5 grid gap-1">
              <li><code>DATABASE_URL</code> is missing or has a typo in <code>.env.local</code></li>
              <li>the password still says <code>[YOUR-PASSWORD]</code></li>
              <li>the dev server wasn&apos;t restarted after editing <code>.env.local</code></li>
              <li>the Supabase project is paused</li>
            </ul>
            <a href="/setup" className="mt-2 font-semibold text-blue">Open setup instructions →</a>
          </div>
        ) : (
          <p className="text-sm text-mute">{error.message}</p>
        )}

        {error.digest && <p className="mt-4 text-xs text-mute">Error digest: {error.digest}</p>}

        <button
          onClick={reset}
          className="mt-5 rounded-lg bg-navy px-4 py-2.5 font-semibold text-white cursor-pointer"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
