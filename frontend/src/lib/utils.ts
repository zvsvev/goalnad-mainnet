import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Parse backend date string (UTC) to Date object
 * backend format: "2026-02-13 14:19:13" (no Z)
 */
export function parseApiDate(dateStr: string): Date {
  if (!dateStr) return new Date();
  // If it already has Z or offset, trust it
  if (dateStr.includes("Z") || dateStr.includes("+")) return new Date(dateStr);

  // Replace space with T and append Z to force UTC
  // "2026-02-13 14:19:13" -> "2026-02-13T14:19:13Z"
  return new Date(dateStr.replace(" ", "T") + "Z");
}

/**
 * Format relative time (e.g. "5m ago", "2h ago")
 * Handles the timezone correction via parseApiDate
 */
export function formatRelativeTime(dateStr: string): string {
  const date = parseApiDate(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();

  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

// --- Flavor Information ---

const BID_COMMENTS = [
  "I'm challenging this prediction. The stats don't add up.",
  "Taking a risk here, but the odds are too good.",
  "GoalNad is underestimating the underdog.",
  "My model sees a different outcome.",
  "Putting my $GOAL where my mouth is.",
  "Fade the Oracle. Trust the code.",
  "This line is mispriced. Easy value.",
  "Counter-trading the consensus.",
];

const SUPPORT_COMMENTS = [
  "Solid analysis. Backing this.",
  "Oracle is on point today.",
  "Agreed. Easy win.",
  "Supporting the data.",
  "The logic holds up.",
  "Following the Oracle on this one.",
  "Safest bet of the week.",
  "Confirmed by my own model.",
];

/**
 * Get a random flavor comment if none exists
 * deterministically based on txHash or agentWallet so it doesn't flicker
 */
export function getFlavorComment(
  type: "challenge" | "support",
  txHash: string | null,
  agentWallet: string
): string {
  const seedStr = txHash || agentWallet || "default";
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = ((hash << 5) - hash) + seedStr.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }

  const comments = type === "challenge" ? BID_COMMENTS : SUPPORT_COMMENTS;
  const index = Math.abs(hash) % comments.length;
  return comments[index];
}
