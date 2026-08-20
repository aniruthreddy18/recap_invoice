import Image from "next/image";

export const dynamic = "force-dynamic";

/**
 * Shown when DATABASE_URL or SESSION_SECRET is missing — the state a fresh
 * Vercel deploy starts in. Without them the Postgres driver has nothing to
 * dial and the session signer throws, so proxy.ts sends people here rather
 * than letting the request die on a stack trace.
 */
export default function SetupPage() {
  const hasDb = Boolean(process.env.DATABASE_URL);
  const hasSecret = Boolean(process.env.SESSION_SECRET);
  const hosted = Boolean(process.env.VERCEL);

  return (
    <div className="min-h-screen bg-navy text-white px-6 py-12">
      <div className="mx-auto max-w-xl">
        <Image src="/logo-wordmark.png" alt="RecapReels" width={274} height={87} className="h-12 w-auto mb-8" priority />

        {hasDb && hasSecret ? (
          <>
            <h1 className="display text-2xl font-bold mb-3">Ready to go</h1>
            <p className="text-white/70 mb-6">Both environment variables are set.</p>
            <a href="/" className="inline-flex rounded-lg bg-blue-bright px-5 py-3 font-semibold">
              Open the dashboard
            </a>
          </>
        ) : (
          <>
            <h1 className="display text-2xl font-bold mb-3">One step left</h1>
            <p className="text-white/70 mb-6">
              This app keeps clients, invoices and MOUs in Supabase Postgres. It needs two
              environment variables before it can start.
            </p>

            <ul className="grid gap-2 mb-8 text-sm">
              <Var name="DATABASE_URL" ok={hasDb} />
              <Var name="SESSION_SECRET" ok={hasSecret} />
            </ul>

            <ol className="grid gap-6">
              <Step n={1} title="Create a Supabase project">
                At <span className="text-blue-bright">supabase.com</span> — the free tier is enough.
                Note the database password you set.
              </Step>
              <Step n={2} title="Copy the pooler connection string">
                Project Settings → Database → Connection string → <b>Transaction pooler</b> (port 6543,
                the only mode that works from serverless). Replace <code>[YOUR-PASSWORD]</code> with
                your password.
              </Step>
              {hosted ? (
                <>
                  <Step n={3} title="Add both variables in Vercel">
                    Project → Settings → Environment Variables. Add{" "}
                    <code>DATABASE_URL</code> (the string above) and <code>SESSION_SECRET</code> (any
                    long random string — <code>openssl rand -hex 32</code>), for all environments.
                  </Step>
                  <Step n={4} title="Redeploy">
                    Deployments → ⋯ → Redeploy. Variables are only read at build and boot, so an
                    existing deployment won&apos;t pick them up on its own. Tables are created on the
                    first request afterwards.
                  </Step>
                </>
              ) : (
                <>
                  <Step n={3} title="Paste them into .env.local">
                    In the project folder, open <code>.env.local</code> and set:
                    <pre className="mt-2 overflow-x-auto rounded-lg bg-black/30 p-3 text-xs text-blue-bright">
DATABASE_URL=postgresql://postgres.xxxx:PASSWORD@aws-0-region.pooler.supabase.com:6543/postgres?sslmode=require
SESSION_SECRET=any-long-random-string
                    </pre>
                  </Step>
                  <Step n={4} title="Restart the dev server">
                    Environment variables are only read at startup: stop <code>npm run dev</code> and
                    start it again. Tables are created automatically on the first request.
                  </Step>
                </>
              )}
            </ol>
          </>
        )}
      </div>
    </div>
  );
}

function Var({ name, ok }: { name: string; ok: boolean }) {
  return (
    <li className="flex items-center gap-2">
      <span className={ok ? "text-green" : "text-white/40"}>{ok ? "✓" : "○"}</span>
      <code className={ok ? "text-white/70" : "text-blue-bright"}>{name}</code>
      <span className="text-white/40">{ok ? "set" : "missing"}</span>
    </li>
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
