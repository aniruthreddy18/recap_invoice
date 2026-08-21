"use client";

/**
 * Any server-side failure lands here. The data is a file on this machine, so
 * the realistic failure is that the file can't be opened — name that plainly
 * instead of showing a stack trace.
 */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const looksLikeDb =
    /SQLITE|database|EACCES|ENOENT|EPERM|disk|readonly|locked/i.test(`${error.message} ${error.name}`) ||
    !error.message;

  return (
    <div className="min-h-screen bg-field flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-lg rounded-xl border border-line bg-paper p-6">
        <h1 className="display text-xl font-bold text-navy mb-2">
          {looksLikeDb ? "Can't open the database file" : "Something went wrong"}
        </h1>

        {looksLikeDb ? (
          <div className="text-sm text-mute grid gap-2">
            <p>
              Your clients, invoices and MOUs live in <code>data/recapreels.db</code> inside the
              project folder. The usual causes, in order:
            </p>
            <ul className="list-disc pl-5 grid gap-1">
              <li>the app was started from a different folder, so it looked in the wrong place</li>
              <li>the disk is full</li>
              <li>the <code>data</code> folder was moved, renamed, or is read-only</li>
              <li>another copy of the app is running against the same file</li>
            </ul>
            {error.message && <p className="mt-1 text-xs">{error.message}</p>}
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
