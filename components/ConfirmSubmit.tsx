"use client";

import { useState } from "react";

/**
 * Two-step delete: the first click swaps the button for an explicit
 * confirm/cancel pair, the second actually submits.
 *
 * This deliberately does NOT use window.confirm — that dialog is suppressed in
 * embedded browsers (and by "block dialogs" in normal ones), which silently
 * turned every delete into a no-op.
 */
export default function ConfirmSubmit({
  children,
  message,
  className = "",
}: {
  children: React.ReactNode;
  message: string;
  className?: string;
}) {
  const [armed, setArmed] = useState(false);

  const base =
    "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 font-semibold transition-colors cursor-pointer";

  if (!armed) {
    return (
      <button
        type="button"
        onClick={() => setArmed(true)}
        className={`${base} bg-red-soft text-red hover:bg-red hover:text-white ${className}`}
      >
        {children}
      </button>
    );
  }

  return (
    <div className={`grid gap-3 ${className}`}>
      <p className="text-sm text-red font-medium">{message}</p>
      <div className="flex flex-wrap gap-2">
        <button type="submit" className={`${base} bg-red text-white hover:bg-red/90`}>
          Yes, delete
        </button>
        <button
          type="button"
          onClick={() => setArmed(false)}
          className={`${base} bg-paper border border-line text-navy hover:bg-field`}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
