"use client";

import * as React from "react";

// Tipo locale: istogramma 1..5 -> count
type Histogram = Partial<Record<1 | 2 | 3 | 4 | 5, number>>;

export default function RatingSummary({ histogram }: { histogram?: Histogram }) {
  const rows = [1, 2, 3, 4, 5].map((k) => ({ k, v: histogram?.[k as 1 | 2 | 3 | 4 | 5] ?? 0 }));
  const total = rows.reduce((s, r) => s + r.v, 0);

  return (
    <div className="insightsuite-card h-full">
      <h3 className="mb-2 text-lg font-semibold">Rating Summary</h3>
      {total === 0 ? (
        <div className="insightsuite-muted">Nessun rating nel dataset.</div>
      ) : (
        <div className="space-y-2">
          {rows.map(({ k, v }) => {
            const w = total ? Math.round((v / total) * 100) : 0;
            return (
              <div key={k} className="flex items-center gap-3">
                <div className="w-8">{k}★</div>
                <div className="h-2 flex-1 rounded bg-neutral-800">
                  <div className="h-2 rounded bg-neutral-300" style={{ width: `${w}%` }} />
                </div>
                <div className="w-10 text-right text-neutral-400">{v}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
