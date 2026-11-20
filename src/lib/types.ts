/**
 * Core domain types for SnagSnap.
 * The same shapes are used by the demo store and (later) the Supabase live adapter.
 */

export type Role = "contractor" | "team" | "owner";

export type Severity = "safety" | "major" | "minor" | "cosmetic";

export type Trade =
  | "plumber"
  | "electrician"
  | "painter"
  | "carpenter"
  | "tiler"
  | "plasterer"
  | "bricklayer"
  | "roofer"
  | "groundworker"
  | "kitchen fitter"
  | "cleaner"
  | "general";

export type Category =
  | "Cracks"
  | "Paintwork"
  | "Plaster/Drylining"
  | "Tiling"
  | "Sealant/Silicone"
  | "Carpentry/Joinery"
  | "Doors"
  | "Windows"
  | "Flooring"
  | "Plumbing"
  | "Electrical"
  | "Kitchen units/Worktops"
  | "Sanitaryware"
  | "Brickwork/Pointing"
  | "Roofing"
  | "Drainage/External"
  | "Insulation/Loft"
  | "Cleaning/Debris"
  | "Other";

export type SnagStatus =
  | "ai_draft" // AI result, owner has not reviewed yet
  | "submitted" // owner submitted to contractor
  | "quoted" // included in a quote sent to the owner
  | "accepted" // owner accepted this item in the quote
  | "declined" // owner declined this item
  | "assigned" // assigned to a team member
  | "in_progress"
  | "fixed" // team member claims fixed
  | "verified" // owner confirmed the fix
  | "reopened"; // owner said not fixed

export type ReportStatus = "draft" | "submitted" | "quoted" | "in_progress" | "completed";

export interface CompanySettings {
  name: string;
  tagline: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  brandColor: string;
  vatRate: number; // e.g. 0.2
  defaultDepositPercent: number; // e.g. 30
  reminderDays: number[]; // e.g. [14, 28]
  reportFooter: string;
  /** Default number of days a new quote stays valid. */
  quoteValidDays: number;
  /** Days an owner has to pay an invoice. */
  invoiceDueDays: number;
  /** Automatic reminders (sent by the system, logged in history). */
  autoReminders: {
    quotes: boolean;
    quoteAfterDays: number;
    invoices: boolean;
    invoiceAfterDaysOverdue: number;
    overdueJobsToTeam: boolean;
  };
  /** Which events email the contractor. */
  notify: {
    newReport: boolean;
    quoteAccepted: boolean;
    paymentReceived: boolean;
    jobFixed: boolean;
    fixReopened: boolean;
    weeklySummary: boolean;
  };
  quoteMessage: string;
}

export interface User {
  id: string;
  role: Role;
  name: string;
  email: string;
  phone?: string;
  trade?: Trade; // team members only
  avatarColor: string;
  title?: string;
}

export interface Property {
  id: string;
  ownerId: string;
  plot: string;
  addressLine1: string;
  town: string;
  postcode: string;
  development: string;
  completionDate: string; // ISO
  invitedAt: string;
  joinedAt?: string;
  coverHue: number; // for generated cover art
}

export interface Room {
  id: string;
  propertyId: string;
  name: string;
  code: string; // KIT, BED1...
  sortOrder: number;
}

export interface BBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Snag {
  id: string;
  propertyId: string;
  reportId: string;
  roomId: string;
  ref: string; // KIT-03
  title: string;
  description: string;
  locationInRoom: string;
  category: Category;
  severity: Severity;
  trade: Trade;
  suggestedFix: string;
  confidence: number;
  bbox?: BBox;
  photoUrl?: string;
  source: "ai" | "manual";
  status: SnagStatus;
  assigneeId?: string;
  price?: number; // quoted price ex VAT
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
  /** Owner has checked this AI draft and is happy with it. */
  reviewed?: boolean;
  /** Who produced the draft: the real model or the demo simulator. */
  aiSource?: "claude" | "demo";
  aiModel?: string;
  /** What the owner typed when taking the photo. */
  ownerNote?: string;
}

export interface SnagUpdate {
  id: string;
  snagId: string;
  propertyId: string;
  actorId: string;
  kind: "status" | "progress" | "assign" | "comment";
  fromStatus?: SnagStatus;
  toStatus?: SnagStatus;
  note?: string;
  photoUrl?: string;
  createdAt: string;
}

export interface Report {
  id: string;
  propertyId: string;
  version: number;
  status: ReportStatus;
  summary: string;
  submittedAt?: string;
  createdAt: string;
}

export interface QuoteItem {
  snagId: string;
  price: number; // ex VAT
  decision: "pending" | "accepted" | "declined";
}

export interface Quote {
  id: string;
  number: string; // Q-1042
  reportId: string;
  propertyId: string;
  items: QuoteItem[];
  depositPercent: number;
  vatRate: number;
  message?: string;
  status: "draft" | "sent" | "accepted" | "partially_accepted" | "declined";
  sentAt?: string;
  respondedAt?: string;
  createdAt: string;
}

export interface Invoice {
  id: string;
  number: string; // INV-2041
  quoteId: string;
  propertyId: string;
  kind: "deposit" | "balance";
  amount: number; // inc VAT
  status: "unpaid" | "paid";
  issuedAt: string;
  dueAt: string;
  paidAt?: string;
}

export interface Payment {
  id: string;
  invoiceId: string;
  propertyId: string;
  amount: number;
  cardLast4: string;
  reference: string; // pi_test_...
  paidAt: string;
}

export interface DemoEmail {
  id: string;
  to: string;
  subject: string;
  preview: string;
  body: string;
  link?: string;
  sentAt: string;
  read: boolean;
  /** What the email was about, so it can be shown in that record's history. */
  kind?: "quote_reminder" | "invoice_reminder";
  refId?: string; // quote or invoice id
  /** True when the contractor changed the default wording before sending. */
  edited?: boolean;
  sentById?: string;
}
