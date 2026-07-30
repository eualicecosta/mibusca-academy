"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { toggleChecklistItem } from "@/lib/actions";

export function LessonChecklist({
  items,
  checkedIds
}: {
  items: Array<{ id: string; text: string }>;
  checkedIds: string[];
}) {
  const [checked, setChecked] = useState(new Set(checkedIds));
  const [pendingIds, setPendingIds] = useState(new Set<string>());
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const isChecked = checked.has(item.id);
        return (
          <label
            key={item.id}
            className="flex min-w-0 cursor-pointer items-start gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-4 text-sm text-white/78"
          >
            <Checkbox
              checked={isChecked}
              disabled={pending && pendingIds.has(item.id)}
              onCheckedChange={(value) => {
                const previous = new Set(checked);
                const next = new Set(previous);
                const nextValue = Boolean(value);
                if (value) {
                  next.add(item.id);
                } else {
                  next.delete(item.id);
                }
                setChecked(next);
                setPendingIds((current) => new Set(current).add(item.id));
                startTransition(() => {
                  void toggleChecklistItem(item.id, nextValue)
                    .catch(() => {
                      setChecked(previous);
                    })
                    .finally(() => {
                      setPendingIds((current) => {
                        const updated = new Set(current);
                        updated.delete(item.id);
                        return updated;
                      });
                    });
                });
              }}
            />
            <span className="min-w-0 break-words">{item.text}</span>
            {pendingIds.has(item.id) ? <Loader2 className="ml-auto h-4 w-4 shrink-0 animate-spin text-[#8A1DEE]" /> : null}
          </label>
        );
      })}
    </div>
  );
}
