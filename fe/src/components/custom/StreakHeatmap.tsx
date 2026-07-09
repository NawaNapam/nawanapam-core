"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

type DayCell = { date: string; count: number };

const WEEKS = 53;
const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function utcDateOnly(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// Builds a WEEKS x 7 grid ending today (UTC), columns = weeks, rows = Sun..Sat.
// The last column is the current week (Sun..Sat), so it must extend to the
// Saturday *after* today, not before — otherwise today falls outside the
// grid entirely once the week is more than a few days in.
function buildGrid(counts: Map<string, number>): { date: string; count: number }[][] {
  const today = utcDateOnly(new Date());
  const totalDays = WEEKS * 7;
  const daysUntilSaturday = 6 - today.getUTCDay();
  const start = new Date(today);
  start.setUTCDate(start.getUTCDate() + daysUntilSaturday - (totalDays - 1));

  const columns: DayCell[][] = [];
  const cursor = new Date(start);
  for (let w = 0; w < WEEKS; w++) {
    const column: DayCell[] = [];
    for (let d = 0; d < 7; d++) {
      const iso = isoDay(cursor);
      column.push({ date: iso, count: counts.get(iso) ?? 0 });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    columns.push(column);
  }
  return columns;
}

function levelForCount(count: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count === 2) return 2;
  if (count <= 4) return 3;
  return 4;
}

const LEVEL_CLASSES: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: "bg-muted",
  1: "bg-signature-mint/40",
  2: "bg-signature-mint/70",
  3: "bg-signature-mint",
  4: "bg-signature-coral",
};

// Minimum column gap between two shown month labels so their text (~3
// columns wide) never overlaps.
const MIN_LABEL_GAP = 3;

type Props = {
  // Fetch is deferred until true, so callers that register today's session
  // first (e.g. NMBadge) can avoid a race where the heatmap reads before
  // today's activity row is written.
  ready?: boolean;
};

export default function StreakHeatmap({ ready = true }: Props) {
  const [grid, setGrid] = useState<DayCell[][] | null>(null);
  const [loaded, setLoaded] = useState(false);
  const todayIso = isoDay(utcDateOnly(new Date()));

  // Optimistic placeholder: rendering this component at all means the
  // viewer is here right now, so today's cell is shown as active
  // immediately rather than waiting on the network round trip. It's
  // reconciled with the server's real counts as soon as the fetch resolves.
  const optimisticGrid = useMemo(() => {
    const g = buildGrid(new Map());
    for (const col of g) {
      for (const cell of col) {
        if (cell.date === todayIso) cell.count = 1;
      }
    }
    return g;
  }, [todayIso]);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    fetch("/api/nm-score/heatmap")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (cancelled) return;
        const counts = new Map<string, number>(
          (json?.days as DayCell[] | undefined)?.map((d) => [d.date, d.count]) ?? []
        );
        setGrid(buildGrid(counts));
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [ready]);

  const displayGrid = grid ?? optimisticGrid;

  // First column index where each new month starts, for the label row.
  // Skips a label if it would land too close to the previous one (e.g. the
  // grid starting mid-month) so the text never overlaps.
  const monthMarkers = displayGrid.reduce<{ index: number; label: string }[]>((acc, col, i) => {
    const d = new Date(col[0].date);
    const label = MONTH_LABELS[d.getUTCMonth()];
    const prev = acc[acc.length - 1];
    if (prev?.label === label) return acc;
    if (prev && i - prev.index < MIN_LABEL_GAP) return acc;
    acc.push({ index: i, label });
    return acc;
  }, []);

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">Activity</h3>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <span>Less</span>
          {([0, 1, 2, 3, 4] as const).map((lvl) => (
            <span key={lvl} className={cn("h-2.5 w-2.5 rounded-sm", LEVEL_CLASSES[lvl])} />
          ))}
          <span>More</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="inline-flex flex-col gap-1">
          <div className="flex gap-[3px] pl-0 text-[10px] text-muted-foreground">
            {displayGrid.map((_, i) => {
              const marker = monthMarkers.find((m) => m.index === i);
              return (
                <span key={i} className="w-2.5 shrink-0">
                  {marker ? marker.label : ""}
                </span>
              );
            })}
          </div>
          <div className="flex gap-[3px]">
            {displayGrid.map((col, i) => (
              <div key={i} className="flex flex-col gap-[3px]">
                {col.map((cell) => {
                  const isToday = cell.date === todayIso;
                  const todayRing =
                    isToday && "ring-1 ring-signature-coral ring-offset-1 ring-offset-card";

                  // Every cell except today stays a skeleton pulse until the
                  // real fetch resolves; today is shown optimistically from
                  // the moment the grid renders.
                  if (!loaded && !isToday) {
                    return (
                      <Skeleton key={cell.date} className="h-2.5 w-2.5 rounded-sm" />
                    );
                  }

                  return (
                    <div
                      key={cell.date}
                      title={`${cell.date}${isToday ? " (today)" : ""}: ${cell.count} session${cell.count === 1 ? "" : "s"}`}
                      className={cn(
                        "h-2.5 w-2.5 rounded-sm",
                        LEVEL_CLASSES[levelForCount(cell.count)],
                        todayRing
                      )}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
