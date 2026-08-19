"use client";

import { useEffect, useState } from "react";
import { Star, Clock, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

const LOW_RATING_NOTES = [
  "",
  "Sorry to hear that — thank you for telling us.",
  "We appreciate the honest feedback.",
  "Thanks — we'll pass this along to the team.",
];

/**
 * What a guest sees when they tap the review-request text/notification the
 * scheduled job sends ~30 minutes after their meal (see
 * supabase/functions/send-review-requests). Rating first, redirect second —
 * and only 4–5 star visits get pushed on to the public Google listing, so a
 * rough visit doesn't turn into a bad public review instead of feedback the
 * restaurant can act on.
 */
export function ReviewScreen({
  restaurantName,
  tableNumber,
  googleReviewUrl,
}: {
  restaurantName: string;
  tableNumber?: number;
  googleReviewUrl: string | null;
}) {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [poppedStar, setPoppedStar] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);

  const isPositive = rating >= 4;

  function rate(value: number) {
    setRating(value);
    setPoppedStar(value);
    setTimeout(() => setPoppedStar(0), 300);
    if (value >= 4 && googleReviewUrl) {
      setCountdown(2);
    } else {
      setCountdown(null);
    }
  }

  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      window.location.href = googleReviewUrl!;
      return;
    }
    const id = setTimeout(() => setCountdown((c) => (c ?? 1) - 1), 1000);
    return () => clearTimeout(id);
  }, [countdown, googleReviewUrl]);

  return (
    <div className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-gradient-to-b from-ink-800 to-ink-900 px-6 pb-10 pt-8 text-white">
      <div className="pointer-events-none absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-brand-500/15 blur-[70px]" />

      <div className="relative mx-auto flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-3 py-[7px] text-[11px] font-semibold text-white/50">
        <Clock className="h-3 w-3 text-brand-400" />
        Sent 30 minutes after your visit
      </div>

      <div className="relative flex flex-1 flex-col items-center justify-center gap-6 text-center">
        <div>
          <h1 className="mx-auto max-w-[260px] font-display text-[26px] font-semibold leading-[1.15] text-balance">
            How was dinner at {restaurantName} tonight?
          </h1>
          <p className="mt-1.5 text-[13.5px] text-white/50">
            {tableNumber ? `Table ${tableNumber} · ` : ""}Your feedback helps the kitchen
          </p>
        </div>

        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((value) => {
            const filled = value <= (hovered || rating);
            return (
              <button
                key={value}
                onClick={() => rate(value)}
                onMouseEnter={() => setHovered(value)}
                onMouseLeave={() => setHovered(0)}
                aria-label={`Rate ${value} star${value > 1 ? "s" : ""}`}
                className={cn("p-1 transition-transform", poppedStar === value && "animate-pop")}
              >
                <Star
                  className={cn(
                    "h-9 w-9 transition-colors",
                    filled ? "fill-amber-400 text-amber-400" : "fill-white/[0.08] text-white/20"
                  )}
                  strokeWidth={1.5}
                />
              </button>
            );
          })}
        </div>

        <p className="min-h-[20px] text-[13px] font-semibold text-white/60">
          {rating === 0
            ? "Tap a star to rate your visit"
            : isPositive
              ? "Thanks! Taking you to Google Reviews…"
              : LOW_RATING_NOTES[rating]}
        </p>
      </div>

      <div
        className={cn(
          "relative flex flex-col gap-2.5 transition-all duration-300",
          isPositive && googleReviewUrl ? "opacity-100" : "pointer-events-none h-0 opacity-0"
        )}
      >
        <a
          href={googleReviewUrl ?? "#"}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 px-5 py-[17px] text-[15px] font-bold text-ink-900 shadow-[0_14px_28px_-12px_rgba(200,121,59,0.6)] transition-transform active:scale-[0.97]"
        >
          <ExternalLink className="h-4 w-4" />
          Continue to Google Reviews
          {countdown ? <span className="tabular-nums text-ink-900/60">· {countdown}s</span> : null}
        </a>
        <button
          onClick={() => {
            setCountdown(null);
            setRating(0);
          }}
          className="py-1.5 text-center text-[12px] font-medium text-white/40"
        >
          Not now
        </button>
      </div>
    </div>
  );
}
