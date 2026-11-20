import type { Category, Severity, SnagStatus, Trade } from "./types";

export const CATEGORIES: Category[] = [
  "Cracks",
  "Paintwork",
  "Plaster/Drylining",
  "Tiling",
  "Sealant/Silicone",
  "Carpentry/Joinery",
  "Doors",
  "Windows",
  "Flooring",
  "Plumbing",
  "Electrical",
  "Kitchen units/Worktops",
  "Sanitaryware",
  "Brickwork/Pointing",
  "Roofing",
  "Drainage/External",
  "Insulation/Loft",
  "Cleaning/Debris",
  "Other",
];

export const SEVERITIES: Severity[] = ["safety", "major", "minor", "cosmetic"];

export const SEVERITY_META: Record<Severity, { label: string; dot: string; badge: string; text: string }> = {
  safety: {
    label: "Safety",
    dot: "bg-sev-safety",
    badge: "bg-red-50 text-red-700 ring-red-200",
    text: "text-sev-safety",
  },
  major: {
    label: "Major",
    dot: "bg-sev-major",
    badge: "bg-orange-50 text-orange-700 ring-orange-200",
    text: "text-sev-major",
  },
  minor: {
    label: "Minor",
    dot: "bg-sev-minor",
    badge: "bg-amber-50 text-amber-800 ring-amber-200",
    text: "text-sev-minor",
  },
  cosmetic: {
    label: "Cosmetic",
    dot: "bg-sev-cosmetic",
    badge: "bg-zinc-100 text-zinc-700 ring-zinc-200",
    text: "text-sev-cosmetic",
  },
};

export const TRADE_LABEL: Record<Trade, string> = {
  plumber: "Plumber",
  electrician: "Electrician",
  painter: "Painter & Decorator",
  carpenter: "Carpenter / Joiner",
  tiler: "Tiler",
  plasterer: "Plasterer",
  bricklayer: "Bricklayer",
  roofer: "Roofer",
  groundworker: "Groundworker",
  "kitchen fitter": "Kitchen Fitter",
  cleaner: "Cleaner",
  general: "General",
};

export const STATUS_META: Record<SnagStatus, { label: string; badge: string; dot: string }> = {
  ai_draft: { label: "AI draft", badge: "bg-violet-50 text-violet-700 ring-violet-200", dot: "bg-violet-500" },
  submitted: { label: "Submitted", badge: "bg-slate-100 text-slate-700 ring-slate-200", dot: "bg-slate-500" },
  quoted: { label: "Quoted", badge: "bg-indigo-50 text-indigo-700 ring-indigo-200", dot: "bg-indigo-500" },
  accepted: { label: "Accepted", badge: "bg-blue-50 text-blue-700 ring-blue-200", dot: "bg-blue-500" },
  declined: { label: "Declined", badge: "bg-zinc-100 text-zinc-500 ring-zinc-200", dot: "bg-zinc-400" },
  assigned: { label: "Assigned", badge: "bg-sky-50 text-sky-700 ring-sky-200", dot: "bg-sky-500" },
  in_progress: { label: "In progress", badge: "bg-amber-50 text-amber-800 ring-amber-200", dot: "bg-amber-500" },
  fixed: { label: "Fixed", badge: "bg-teal-50 text-teal-700 ring-teal-200", dot: "bg-teal-500" },
  verified: { label: "Verified", badge: "bg-emerald-50 text-emerald-700 ring-emerald-200", dot: "bg-emerald-600" },
  reopened: { label: "Reopened", badge: "bg-rose-50 text-rose-700 ring-rose-200", dot: "bg-rose-500" },
};

/** Statuses that count as "open work" for the contractor. */
export const OPEN_WORK: SnagStatus[] = ["accepted", "assigned", "in_progress", "reopened"];

export const ROOM_TEMPLATE: { name: string; code: string }[] = [
  { name: "Hallway", code: "HAL" },
  { name: "Kitchen", code: "KIT" },
  { name: "Living Room", code: "LIV" },
  { name: "Bedroom 1", code: "BED1" },
  { name: "Bedroom 2", code: "BED2" },
  { name: "Bedroom 3", code: "BED3" },
  { name: "Bathroom", code: "BATH" },
  { name: "En-suite", code: "ENS" },
  { name: "WC", code: "WC" },
  { name: "Landing", code: "LAN" },
  { name: "Garage", code: "GAR" },
  { name: "External", code: "EXT" },
  { name: "Loft", code: "LOFT" },
];
