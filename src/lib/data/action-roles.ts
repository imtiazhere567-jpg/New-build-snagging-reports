import type { Role } from "../types";

/**
 * Every action that changes data, and which roles may run it.
 * In live mode the server refuses anything not listed here for the signed-in role,
 * and also checks that the action only touched records that person is allowed to change.
 */
export const ACTION_ROLES = {
  // Contractor
  sendQuote: ["contractor"],
  inviteOwner: ["contractor"],
  setSnagStatus: ["contractor"],
  assignSnags: ["contractor"],
  autoAssign: ["contractor"],
  setDueDate: ["contractor"],
  resendInvite: ["contractor"],
  addTeamMember: ["contractor"],
  sendInvoiceReminder: ["contractor"],
  sendQuoteReminder: ["contractor"],
  createBalanceInvoice: ["contractor"],
  updateSettings: ["contractor"],
  runAutoReminders: ["contractor"],
  saveRateCard: ["contractor"],
  resetRateCard: ["contractor"],
  // Contractor (record a payment taken offline) or the owner (card payment, test mode)
  markInvoicePaid: ["contractor", "owner"],
  // Home owner
  addAnalysedPhoto: ["owner"],
  addManualSnag: ["owner"],
  updateSnag: ["owner"],
  deleteSnag: ["owner"],
  submitDraft: ["owner"],
  confirmFix: ["owner"],
  reopenFix: ["owner"],
  respondToQuote: ["owner"],
  // Team member
  startJob: ["team"],
  postProgress: ["team"],
  markFixed: ["team"],
  // Everyone
  markEmailsRead: ["contractor", "owner", "team"],
} as const satisfies Record<string, readonly Role[]>;

export type ServerAction = keyof typeof ACTION_ROLES;
export const SERVER_ACTIONS = Object.keys(ACTION_ROLES) as ServerAction[];
