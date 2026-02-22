"use client"

import { cn } from "@/lib/utils"
import { AlertTriangle, FileText } from "lucide-react"

interface FieldNotesChartProps {
  totalMatches: number
  totalNotes: number
  matchRate: string
  matches: Array<{
    noteId: string
    date: string
    author: string
    noteType: string
    matchedKeywords: string[]
    excerpt: string
  }>
  keywords: string[]
}

export function FieldNotesChart({
  totalMatches,
  totalNotes,
  matchRate,
  matches,
  keywords,
}: FieldNotesChartProps) {
  // Count keywords across all matches
  const keywordCounts: Record<string, number> = {}
  for (const m of matches) {
    for (const kw of m.matchedKeywords) {
      keywordCounts[kw] = (keywordCounts[kw] || 0) + 1
    }
  }
  const sortedKeywords = Object.entries(keywordCounts).sort((a, b) => b[1] - a[1])
  const maxCount = sortedKeywords[0]?.[1] || 1

  return (
    <div className="my-2 flex flex-col gap-2 w-full">
      {/* Summary header */}
      <div className={cn(
        "rounded-lg border p-3",
        totalMatches > 10
          ? "border-red-500/20 bg-red-500/5"
          : totalMatches > 3
            ? "border-amber-500/20 bg-amber-500/5"
            : "border-border bg-card/50"
      )}>
        <div className="flex items-center gap-2 mb-2">
          <FileText className={cn(
            "h-3.5 w-3.5",
            totalMatches > 10 ? "text-red-400" : totalMatches > 3 ? "text-amber-400" : "text-muted-foreground"
          )} />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Field Note Risk Signals
          </span>
        </div>
        <div className="flex gap-4 mb-3">
          <div>
            <div className="text-xl font-bold text-foreground">{totalMatches}</div>
            <div className="text-[10px] text-muted-foreground">Matches</div>
          </div>
          <div>
            <div className="text-xl font-bold text-foreground">{totalNotes}</div>
            <div className="text-[10px] text-muted-foreground">Notes Scanned</div>
          </div>
          <div>
            <div className="text-xl font-bold text-foreground">{matchRate}</div>
            <div className="text-[10px] text-muted-foreground">Match Rate</div>
          </div>
        </div>

        {/* Keyword frequency bars */}
        {sortedKeywords.length > 0 && (
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mb-0.5">
              Keyword Frequency
            </span>
            {sortedKeywords.slice(0, 6).map(([kw, count]) => (
              <div key={kw} className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground w-24 truncate">
                  {kw}
                </span>
                <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      count >= maxCount * 0.7 ? "bg-red-500" : count >= maxCount * 0.4 ? "bg-amber-500" : "bg-sky-500"
                    )}
                    style={{ width: `${(count / maxCount) * 100}%` }}
                  />
                </div>
                <span className="text-[10px] font-medium text-muted-foreground w-5 text-right">
                  {count}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Top risk excerpts */}
      {matches.length > 0 && (
        <div className="rounded-lg border border-border bg-card/50 p-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Recent Risk Signals
          </span>
          <div className="mt-2 flex flex-col gap-2">
            {matches.slice(0, 4).map((m, i) => (
              <div key={i} className="rounded-md bg-secondary/30 p-2">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="h-3 w-3 text-amber-400 shrink-0" />
                  <span className="text-[10px] font-mono text-muted-foreground">{m.noteId}</span>
                  <span className="text-[10px] text-muted-foreground">{m.date}</span>
                  <span className="text-[10px] text-muted-foreground/50">{m.author}</span>
                </div>
                <p className="text-xs text-card-foreground/80 leading-relaxed line-clamp-2">
                  {m.excerpt}
                </p>
                <div className="flex gap-1 mt-1">
                  {m.matchedKeywords.map((kw) => (
                    <span
                      key={kw}
                      className="rounded-full bg-amber-500/15 border border-amber-500/20 px-1.5 py-0 text-[9px] text-amber-400"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
