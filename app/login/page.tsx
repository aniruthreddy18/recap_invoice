import { redirect } from "next/navigation";
import LoginView from "@/components/views/LoginView";
import { getPinHash } from "@/lib/db";
import { isSignedIn } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  // Already unlocked on this device — skip the keypad.
  if (await isSignedIn()) redirect("/");

  const { next } = await searchParams;
  const hasPin = (await getPinHash()) !== null;
  return <LoginView next={next ?? "/"} hasPin={hasPin} />;
}
