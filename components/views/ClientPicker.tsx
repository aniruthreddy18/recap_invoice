"use client";

import { useId } from "react";
import { Field, Input, Label } from "@/components/ui";
import type { Client } from "@/lib/db";

export type ClientChoice = {
  clientId: number;
  name: string;
  phone: string;
  city: string;
};

/**
 * One box: type the client's name. If it matches someone on file the document
 * attaches to them; if it doesn't, they're created when the document is saved.
 * Picking from a dropdown of people who may not exist yet was the main thing
 * making a new invoice slow.
 */
export default function ClientPicker({
  clients,
  value,
  onChange,
}: {
  clients: Client[];
  value: ClientChoice;
  onChange: (v: ClientChoice) => void;
}) {
  const listId = useId();
  const match = clients.find((c) => c.name.trim().toLowerCase() === value.name.trim().toLowerCase());
  const isNew = value.name.trim() !== "" && !match;

  const setName = (name: string) => {
    const found = clients.find((c) => c.name.trim().toLowerCase() === name.trim().toLowerCase());
    onChange({
      clientId: found?.id ?? 0,
      name,
      phone: found ? found.phone : value.phone,
      city: found ? found.city : value.city,
    });
  };

  return (
    <div className="grid gap-3">
      <div>
        <Label htmlFor={`${listId}-name`}>Client *</Label>
        <Input
          id={`${listId}-name`}
          list={listId}
          value={value.name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Type a name — new or existing"
          autoComplete="off"
          required
        />
        <datalist id={listId}>
          {clients.map((c) => (
            <option key={c.id} value={c.name}>
              {[c.org, c.city].filter(Boolean).join(" · ")}
            </option>
          ))}
        </datalist>

        {match && (
          <p className="mt-1.5 text-sm text-green">
            ✓ {match.name}{match.city ? ` · ${match.city}` : ""} — existing client
          </p>
        )}
        {isNew && (
          <p className="mt-1.5 text-sm text-blue">
            + New client — “{value.name.trim()}” will be added when you save
          </p>
        )}
      </div>

      {isNew && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Phone (optional)">
            <Input
              value={value.phone}
              onChange={(e) => onChange({ ...value, phone: e.target.value })}
              placeholder="+91 …"
              inputMode="tel"
            />
          </Field>
          <Field label="City (optional)">
            <Input
              value={value.city}
              onChange={(e) => onChange({ ...value, city: e.target.value })}
              placeholder="Hyderabad"
            />
          </Field>
        </div>
      )}
    </div>
  );
}
