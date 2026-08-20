import { redirect } from "next/navigation";
import LoginView from "@/components/views/LoginView";
import { getPinHash } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  // /login sits outside the proxy matcher, so it has to check this itself.
  if (!process.env.DATABASE_URL) redirect("/setup");

  const { next } = await searchParams;
  const hasPin = (await getPinHash()) !== null;
  return <LoginView next={next ?? "/"} hasPin={hasPin} />;
}
