"use client";

import { useActionState, useEffect, useState } from "react";
import Image from "next/image";
import { submitPin } from "@/app/actions";

export default function LoginView({ next, hasPin }: { next: string; hasPin: boolean }) {
  const [pin, setPin] = useState("");
  const [state, action, pending] = useActionState(submitPin, {} as { error?: string });

  // Clear the keypad after a rejected attempt — otherwise the next PIN is
  // typed onto the end of the failed one and can never match.
  useEffect(() => {
    if (state?.error) setPin("");
  }, [state]);

  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "back"];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-navy px-6 py-10">
      <Image src="/logo-wordmark.png" alt="RecapReels" width={274} height={87} className="h-14 w-auto mb-8" priority />

      <p className="text-white/70 text-sm mb-6">
        {hasPin ? "Enter your PIN" : "Set a PIN for this dashboard"}
      </p>

      <div className="flex gap-3 mb-8" role="status" aria-label="PIN entry">
        {Array.from({ length: Math.max(4, pin.length) }).map((_, i) => (
          <span
            key={i}
            className={`h-3.5 w-3.5 rounded-full border-2 ${
              i < pin.length ? "border-blue-bright bg-blue-bright" : "border-white/30"
            }`}
          />
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {keys.map((k, i) =>
          k === "" ? (
            <span key={i} />
          ) : (
            <button
              key={i}
              type="button"
              disabled={pending}
              aria-label={k === "back" ? "Delete digit" : k}
              onClick={() =>
                setPin((p) => (k === "back" ? p.slice(0, -1) : p.length >= 8 ? p : p + k))
              }
              className="h-16 w-16 rounded-full bg-white/10 text-2xl font-semibold text-white active:bg-white/25 disabled:opacity-50 cursor-pointer"
            >
              {k === "back" ? "⌫" : k}
            </button>
          )
        )}
      </div>

      {state?.error && <p className="text-red-soft text-sm mt-6">{state.error}</p>}

      <form action={action} className="mt-8 w-full max-w-xs">
        <input type="hidden" name="pin" value={pin} />
        <input type="hidden" name="next" value={next} />
        <button
          type="submit"
          disabled={pin.length < 4 || pending}
          className="w-full rounded-lg bg-blue-bright py-3 font-semibold text-white disabled:opacity-40 cursor-pointer"
        >
          {pending ? "Checking…" : hasPin ? "Unlock" : "Set PIN"}
        </button>
      </form>
    </div>
  );
}
