import Image from "next/image";

export const dynamic = "force-dynamic";

/**
 * Shown when DATABASE_URL is missing. Without it the Postgres driver quietly
 * falls back to localhost:5432 and every page dies with an unreadable
 * ECONNREFUSED, so proxy.ts sends people here instead.
 */
export default function SetupPage() {
  const configured = Boolean(process.env.DATABASE_URL);

  return (
    <div className="min-h-screen bg-navy text-white px-6 py-12">
      <div className="mx-auto max-w-xl">
        <Image src="/logo-wordmark.png" alt="RecapReels" width={274} height={87} className="h-12 w-auto mb-8" priority />

        {configured ? (
          <>
            <h1 className="display text-2xl font-bold mb-3">Database connected</h1>
            <p className="text-white/70 mb-6">
              <code className="text-blue-bright">DATABASE_URL</code> is set. Open the dashboard to continue.
            </p>
            <a href="/" className="inline-flex rounded-lg bg-blue-bright px-5 py-3 font-semibold">
              Go to the dashboard
            </a>
          </>
        ) : (
          <>
            <h1 className="display text-2xl font-bold mb-3">One step left</h1>
            <p className="text-white/70 mb-8">
              This app stores clients, invoices and MOUs in Supabase Postgres. It needs a connection
              string before it can start.
            </p>

            <ol className="grid gap-6">
              <Step n={1} title="Create a Supabase project">
                At <span className="text-blue-bright">supabase.com</span> — the free tier is enough.
                Note the database password you set.
              </Step>
              <Step n={2} title="Copy the pooler connection string">
                Project Settings → Database → Connection string → <b>Transaction pooler</b> (port 6543).
                Replace <code>[YOUR-PASSWORD]</code> with your password.
              </Step>
              <Step n={3} title="Paste it into .env.local">
                In the project folder, open <code>.env.local</code> and set:
                <pre className="mt-2 overflow-x-auto rounded-lg bg-black/30 p-3 text-xs text-blue-bright">
DATABASE_URL=postgresql://postgres.xxxx:PASSWORD@aws-0-region.pooler.supabase.com:6543/postgres?sslmode=require
                </pre>
                <span className="text-white/60">
                  SESSION_SECRET is already filled in for you.
                </span>
              </Step>
              <Step n={4} title="Restart the dev server">
                Environment variables are only read at startup: stop <code>npm run dev</code> and start it
                again. Tables are created automatically on the first request, then this page will let you in.
              </Step>
            </ol>
          </>
        )}
      </div>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-4">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 font-bold">
        {n}
      </span>
      <div>
        <h2 className="font-semibold mb-1">{title}</h2>
        <div className="text-sm text-white/70 leading-relaxed">{children}</div>
      </div>
    </li>
  );
}
