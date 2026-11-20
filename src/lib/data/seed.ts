/**
 * Demo seed data. Dates are generated relative to "now" so the demo always looks current.
 * All people, companies and addresses are fictional.
 */
import type {
  BBox,
  Category,
  CompanySettings,
  DemoEmail,
  Invoice,
  Payment,
  Property,
  Quote,
  Report,
  Room,
  Severity,
  Snag,
  SnagStatus,
  SnagUpdate,
  Trade,
  User,
} from "../types";
import { ROOM_TEMPLATE } from "../constants";
import { DEFAULT_RATE_CARD, type RateRow } from "../rate-card";

export interface DemoState {
  settings: CompanySettings;
  users: User[];
  properties: Property[];
  rooms: Room[];
  reports: Report[];
  snags: Snag[];
  updates: SnagUpdate[];
  quotes: Quote[];
  invoices: Invoice[];
  payments: Payment[];
  emails: DemoEmail[];
  rateCard: RateRow[];
  /** When the contractor last saved the rate card (undefined = defaults). */
  rateCardUpdatedAt?: string;
}

const DAY = 86_400_000;
const HOUR = 3_600_000;

/* ---------- People ---------- */

export const CONTRACTOR_ID = "u_contractor";

const users: User[] = [
  {
    id: CONTRACTOR_ID,
    role: "contractor",
    name: "Richard Hartwell",
    title: "Managing Director",
    email: "richard@hartwell.example",
    phone: "01632 960 418",
    avatarColor: "#12695a",
  },
  { id: "u_james", role: "team", name: "James Whitaker", trade: "plumber", email: "james@hartwell.example", phone: "07700 900 211", avatarColor: "#2563eb" },
  { id: "u_oliver", role: "team", name: "Oliver Bennett", trade: "electrician", email: "oliver@hartwell.example", phone: "07700 900 342", avatarColor: "#ca8a04" },
  { id: "u_harry", role: "team", name: "Harry Collins", trade: "painter", email: "harry@hartwell.example", phone: "07700 900 517", avatarColor: "#db2777" },
  { id: "u_jack", role: "team", name: "Jack Turner", trade: "carpenter", email: "jack@hartwell.example", phone: "07700 900 638", avatarColor: "#9333ea" },
  { id: "u_george", role: "team", name: "George Hughes", trade: "tiler", email: "george@hartwell.example", phone: "07700 900 764", avatarColor: "#0891b2" },
  { id: "u_thomas", role: "team", name: "Thomas Wright", trade: "plasterer", email: "thomas@hartwell.example", phone: "07700 900 829", avatarColor: "#ea580c" },
  { id: "u_emily", role: "team", name: "Emily Clarke", trade: "general", email: "emily@hartwell.example", phone: "07700 900 953", avatarColor: "#16a34a" },
  { id: "u_morgan", role: "owner", name: "Daniel & Charlotte Morgan", email: "morgan.family@example.co.uk", phone: "07700 900 101", avatarColor: "#0f766e" },
  { id: "u_price", role: "owner", name: "Hannah Price", email: "hannah.price@example.co.uk", phone: "07700 900 102", avatarColor: "#7c3aed" },
  { id: "u_fletcher", role: "owner", name: "Michael & Laura Fletcher", email: "fletchers@example.co.uk", phone: "07700 900 103", avatarColor: "#b45309" },
  { id: "u_blake", role: "owner", name: "Edward Blake", email: "edward.blake@example.co.uk", phone: "07700 900 104", avatarColor: "#be123c" },
  { id: "u_dawson", role: "owner", name: "Matthew & Lucy Dawson", email: "dawsons@example.co.uk", phone: "07700 900 106", avatarColor: "#0369a1" },
  { id: "u_lawson", role: "owner", name: "Joanne Lawson", email: "jo.lawson@example.co.uk", phone: "07700 900 114", avatarColor: "#b45309" },
];

/** Which team member a trade is auto-assigned to (the "general" member is the fallback). */
export const TRADE_TO_MEMBER: Partial<Record<Trade, string>> = {
  plumber: "u_james",
  electrician: "u_oliver",
  painter: "u_harry",
  carpenter: "u_jack",
  "kitchen fitter": "u_jack",
  tiler: "u_george",
  plasterer: "u_thomas",
  general: "u_emily",
  cleaner: "u_emily",
};

/* ---------- Snag library ---------- */

interface Tpl {
  room: string; // room code
  title: string;
  description: string;
  location: string;
  category: Category;
  severity: Severity;
  trade: Trade;
  fix: string;
  price: number;
  confidence: number;
  bbox: BBox;
}

const T = (t: Tpl) => t;

const LIB = {
  hallCrack: T({ room: "HAL", title: "Hairline crack above front door frame", description: "Hairline crack approx. 220 mm long running diagonally from the top-left corner of the front door lining towards the ceiling.", location: "Wall above front door, left corner", category: "Cracks", severity: "minor", trade: "plasterer", fix: "Rake out, fill with flexible filler, sand and repaint to match.", price: 55, confidence: 0.91, bbox: { x: 0.18, y: 0.12, w: 0.3, h: 0.22 } }),
  hallSkirting: T({ room: "HAL", title: "Gap between skirting and floor", description: "Continuous gap of 4–6 mm between the skirting board and laminate flooring along 1.4 m of the hallway.", location: "Right-hand wall, from front door to stairs", category: "Carpentry/Joinery", severity: "minor", trade: "carpenter", fix: "Refix skirting tight to the floor or fit a matching scotia bead; caulk and paint.", price: 65, confidence: 0.84, bbox: { x: 0.05, y: 0.68, w: 0.85, h: 0.14 } }),
  kitTile: T({ room: "KIT", title: "Cracked floor tile by kitchen door", description: "Hairline crack running diagonally across one 600x600 floor tile, approx. 300 mm from the kitchen door threshold.", location: "Floor, near kitchen door threshold", category: "Tiling", severity: "minor", trade: "tiler", fix: "Remove and replace the cracked tile; match grout colour.", price: 85, confidence: 0.86, bbox: { x: 0.41, y: 0.55, w: 0.18, h: 0.12 } }),
  kitDoor: T({ room: "KIT", title: "Misaligned wall unit door", description: "Left-hand wall unit door sits 5 mm lower than the adjacent door and does not close flush.", location: "Wall units above the hob, left side", category: "Kitchen units/Worktops", severity: "cosmetic", trade: "kitchen fitter", fix: "Adjust the concealed hinges so doors align and close flush.", price: 25, confidence: 0.78, bbox: { x: 0.12, y: 0.2, w: 0.32, h: 0.4 } }),
  kitSealant: T({ room: "KIT", title: "Missing sealant at worktop upstand", description: "No silicone bead between the worktop and the tiled splashback for approx. 900 mm behind the sink.", location: "Behind sink, worktop to splashback joint", category: "Sealant/Silicone", severity: "minor", trade: "general", fix: "Clean joint and apply a continuous white sanitary silicone bead.", price: 35, confidence: 0.88, bbox: { x: 0.08, y: 0.42, w: 0.8, h: 0.1 } }),
  kitTrap: T({ room: "KIT", title: "Leaking waste trap under sink", description: "Active drip from the compression joint on the sink waste trap; water staining on the base of the unit.", location: "Sink base unit, waste trap", category: "Plumbing", severity: "major", trade: "plumber", fix: "Reseat and tighten trap joint, replace washer if damaged, dry and check base panel.", price: 70, confidence: 0.93, bbox: { x: 0.36, y: 0.38, w: 0.26, h: 0.3 } }),
  livSocket: T({ room: "LIV", title: "Socket faceplate not level", description: "Double socket faceplate fitted approx. 4° off level and not tight to the wall, leaving a 2 mm gap.", location: "Wall behind TV position, 300 mm above floor", category: "Electrical", severity: "cosmetic", trade: "electrician", fix: "Isolate circuit, level and refix faceplate tight to the wall.", price: 40, confidence: 0.82, bbox: { x: 0.4, y: 0.42, w: 0.2, h: 0.16 } }),
  livPaint: T({ room: "LIV", title: "Paint splashes on window board", description: "Several white emulsion splashes on the UPVC window board, each 2–8 mm across.", location: "Front window board", category: "Paintwork", severity: "cosmetic", trade: "painter", fix: "Remove splashes with a suitable cleaner without scratching the UPVC.", price: 20, confidence: 0.9, bbox: { x: 0.2, y: 0.58, w: 0.55, h: 0.12 } }),
  livCeiling: T({ room: "LIV", title: "Visible nail pops in ceiling", description: "Three nail pops visible in the plasterboard ceiling near the centre light, each approx. 10 mm across.", location: "Ceiling, around central light fitting", category: "Plaster/Drylining", severity: "minor", trade: "plasterer", fix: "Drive in, fix with additional screws, fill, sand and repaint ceiling.", price: 75, confidence: 0.74, bbox: { x: 0.3, y: 0.1, w: 0.4, h: 0.25 } }),
  bed1Door: T({ room: "BED1", title: "Bedroom door catches on frame", description: "Door binds on the head of the frame and needs force to close; latch does not engage.", location: "Bedroom door, top hinge side", category: "Doors", severity: "major", trade: "carpenter", fix: "Adjust hinges or plane the door head, reseal the cut edge and adjust the keep.", price: 60, confidence: 0.8, bbox: { x: 0.3, y: 0.05, w: 0.4, h: 0.3 } }),
  bed1Window: T({ room: "BED1", title: "Window does not lock fully", description: "Window handle will not turn to the locked position; keeps misaligned with the sash.", location: "Main bedroom window, right-hand opener", category: "Windows", severity: "safety", trade: "carpenter", fix: "Adjust sash and keeps so the espagnolette engages; test lock operation.", price: 50, confidence: 0.77, bbox: { x: 0.55, y: 0.3, w: 0.25, h: 0.35 } }),
  bed1Paint: T({ room: "BED1", title: "Patchy paint finish on feature wall", description: "Uneven sheen and visible roller marks across the feature wall, most visible in daylight.", location: "Wall opposite the window", category: "Paintwork", severity: "cosmetic", trade: "painter", fix: "Lightly sand and apply a further full coat of emulsion.", price: 90, confidence: 0.69, bbox: { x: 0.1, y: 0.15, w: 0.8, h: 0.65 } }),
  bed2Wardrobe: T({ room: "BED2", title: "Wardrobe door rubs on carpet", description: "Fitted wardrobe sliding door drags on the carpet and leaves a wear mark when opened.", location: "Fitted wardrobe, left sliding door", category: "Carpentry/Joinery", severity: "minor", trade: "carpenter", fix: "Raise the door on its runners or trim the base; check smooth operation.", price: 45, confidence: 0.72, bbox: { x: 0.15, y: 0.7, w: 0.45, h: 0.2 } }),
  bed2Radiator: T({ room: "BED2", title: "Radiator cold at the top", description: "Radiator is hot at the bottom and cold across the top 150 mm, indicating trapped air.", location: "Radiator under the window", category: "Plumbing", severity: "minor", trade: "plumber", fix: "Bleed the radiator and check system pressure; rebalance if needed.", price: 35, confidence: 0.65, bbox: { x: 0.12, y: 0.45, w: 0.76, h: 0.3 } }),
  bathSilicone: T({ room: "BATH", title: "Mould-prone gap in bath silicone", description: "Silicone bead along the bath edge has pulled away for approx. 400 mm, leaving an open joint.", location: "Bath edge, tap end", category: "Sealant/Silicone", severity: "major", trade: "general", fix: "Remove the failed bead, clean, fill bath with water and reapply silicone.", price: 45, confidence: 0.89, bbox: { x: 0.05, y: 0.5, w: 0.6, h: 0.12 } }),
  bathGrout: T({ room: "BATH", title: "Missing grout in wall tiles", description: "Grout missing from two vertical joints in the tiling beside the shower valve.", location: "Shower wall, right of the valve", category: "Tiling", severity: "minor", trade: "tiler", fix: "Rake out and regrout the joints to match the existing colour.", price: 40, confidence: 0.85, bbox: { x: 0.55, y: 0.3, w: 0.15, h: 0.35 } }),
  bathFan: T({ room: "BATH", title: "Extractor fan not working", description: "Extractor fan does not run when the light is switched on and has no overrun.", location: "Ceiling, above the bath", category: "Electrical", severity: "major", trade: "electrician", fix: "Test supply and switching; repair or replace the fan unit.", price: 95, confidence: 0.6, bbox: { x: 0.4, y: 0.05, w: 0.2, h: 0.18 } }),
  ensShower: T({ room: "ENS", title: "Shower tray not draining fully", description: "Water pools in the corner of the shower tray away from the waste, approx. 3 mm deep.", location: "Shower tray, back-left corner", category: "Sanitaryware", severity: "major", trade: "plumber", fix: "Check tray level and bedding; relevel and reseal as required.", price: 140, confidence: 0.79, bbox: { x: 0.1, y: 0.55, w: 0.35, h: 0.3 } }),
  ensTile: T({ room: "ENS", title: "Chipped edge on wall tile", description: "Chip approx. 6 mm on the exposed edge of a wall tile at the shower screen.", location: "Shower screen junction, 1.1 m above tray", category: "Tiling", severity: "cosmetic", trade: "tiler", fix: "Replace the chipped tile or fit a matching edge trim.", price: 60, confidence: 0.83, bbox: { x: 0.62, y: 0.4, w: 0.12, h: 0.12 } }),
  wcCistern: T({ room: "WC", title: "Cistern runs continuously", description: "Toilet cistern keeps filling after flushing with water trickling into the pan.", location: "WC cistern", category: "Plumbing", severity: "minor", trade: "plumber", fix: "Adjust or replace the fill valve and check the flush valve seal.", price: 55, confidence: 0.71, bbox: { x: 0.3, y: 0.15, w: 0.4, h: 0.35 } }),
  lanBalustrade: T({ room: "LAN", title: "Loose stair balustrade", description: "Newel post at the top of the stairs moves approx. 10 mm when pushed.", location: "Top of stairs, landing newel post", category: "Carpentry/Joinery", severity: "safety", trade: "carpenter", fix: "Refix the newel post securely; check all spindles and handrail fixings.", price: 120, confidence: 0.87, bbox: { x: 0.42, y: 0.15, w: 0.18, h: 0.7 } }),
  lanCarpet: T({ room: "LAN", title: "Carpet not tight at threshold", description: "Carpet edge loose at the bathroom threshold strip, creating a slight trip edge.", location: "Bathroom doorway on landing", category: "Flooring", severity: "safety", trade: "general", fix: "Restretch carpet and refit the threshold strip.", price: 45, confidence: 0.75, bbox: { x: 0.25, y: 0.7, w: 0.5, h: 0.15 } }),
  garDoor: T({ room: "GAR", title: "Garage door hard to open", description: "Up-and-over garage door needs excessive force and catches halfway.", location: "Garage door", category: "Doors", severity: "minor", trade: "carpenter", fix: "Adjust springs and tracks; lubricate mechanism.", price: 80, confidence: 0.68, bbox: { x: 0.1, y: 0.1, w: 0.8, h: 0.75 } }),
  extPointing: T({ room: "EXT", title: "Open perpend joints in brickwork", description: "Three open perpend joints in the brickwork beside the rear door, each approx. 10 mm.", location: "Rear elevation, right of back door", category: "Brickwork/Pointing", severity: "minor", trade: "general", fix: "Point the open joints with matching mortar.", price: 65, confidence: 0.81, bbox: { x: 0.55, y: 0.35, w: 0.25, h: 0.3 } }),
  extDebris: T({ room: "EXT", title: "Building debris left in garden", description: "Rubble, plaster bags and offcuts left along the rear fence line.", location: "Rear garden, along the fence", category: "Cleaning/Debris", severity: "cosmetic", trade: "cleaner", fix: "Clear and dispose of all debris from the garden.", price: 60, confidence: 0.95, bbox: { x: 0.0, y: 0.5, w: 1.0, h: 0.4 } }),
  extGully: T({ room: "EXT", title: "Gully grid missing", description: "Drainage gully by the rear downpipe has no grid fitted, leaving an open hole.", location: "Rear downpipe gully", category: "Drainage/External", severity: "safety", trade: "general", fix: "Fit a correctly sized gully grid.", price: 30, confidence: 0.84, bbox: { x: 0.4, y: 0.6, w: 0.2, h: 0.15 } }),
  loftInsulation: T({ room: "LOFT", title: "Gap in loft insulation", description: "Insulation rolled back from approx. 1 m² near the hatch, exposing the ceiling joists.", location: "Loft, beside the hatch", category: "Insulation/Loft", severity: "minor", trade: "general", fix: "Relay insulation to full depth across the gap.", price: 40, confidence: 0.76, bbox: { x: 0.2, y: 0.4, w: 0.5, h: 0.35 } }),
};

type LibKey = keyof typeof LIB;

/* ---------- Builder ---------- */

export function createSeed(now = Date.now()): DemoState {
  const ago = (ms: number) => new Date(now - ms).toISOString();
  const ahead = (ms: number) => new Date(now + ms).toISOString();

  const settings: CompanySettings = {
    name: "Hartwell Building Services",
    tagline: "New-build aftercare & snagging",
    address: "Unit 4, Riverside Works, Harrogate HG1 4DP",
    phone: "01632 960 418",
    email: "hello@hartwell.example",
    website: "hartwell.example",
    brandColor: "#12695a",
    vatRate: 0.2,
    defaultDepositPercent: 30,
    reminderDays: [14, 28],
    reportFooter:
      "This report records visible defects at the time of inspection. It does not cover concealed areas or items outside the scope of the NHBC 2-year defects period.",
    quoteValidDays: 14,
    invoiceDueDays: 14,
    autoReminders: { quotes: true, quoteAfterDays: 5, invoices: true, invoiceAfterDaysOverdue: 3, overdueJobsToTeam: true },
    notify: { newReport: true, quoteAccepted: true, paymentReceived: true, jobFixed: false, fixReopened: true, weeklySummary: true },
    quoteMessage:
      "Thanks for sending your snag list. Prices below include labour and materials. Tick the items you'd like us to carry out and pay the deposit to book.",
  };

  const properties: Property[] = [];
  const rooms: Room[] = [];
  const reports: Report[] = [];
  const snags: Snag[] = [];
  const updates: SnagUpdate[] = [];
  const quotes: Quote[] = [];
  const invoices: Invoice[] = [];
  const payments: Payment[] = [];
  const emails: DemoEmail[] = [];

  let quoteNo = 1040;
  let invNo = 2038;
  let updNo = 0;

  const addUpdate = (u: Omit<SnagUpdate, "id">) => updates.push({ ...u, id: `upd_${++updNo}` });

  function makeProperty(p: Omit<Property, "id">, id: string) {
    const prop: Property = { ...p, id };
    properties.push(prop);
    ROOM_TEMPLATE.forEach((r, i) =>
      rooms.push({ id: `${id}_${r.code}`, propertyId: id, name: r.name, code: r.code, sortOrder: i }),
    );
    return prop;
  }

  /** Create snags for a property from library keys with a status per item. */
  function makeSnags(
    prop: Property,
    reportId: string,
    items: { key: LibKey; status: SnagStatus }[],
    createdAt: string,
  ) {
    const counters: Record<string, number> = {};
    return items.map(({ key, status }, i) => {
      const t = LIB[key];
      counters[t.room] = (counters[t.room] ?? 0) + 1;
      const assigned = !["ai_draft", "submitted", "quoted", "accepted", "declined"].includes(status);
      const snag: Snag = {
        id: `${prop.id}_s${i + 1}`,
        propertyId: prop.id,
        reportId,
        roomId: `${prop.id}_${t.room}`,
        ref: `${t.room}-${String(counters[t.room]).padStart(2, "0")}`,
        title: t.title,
        description: t.description,
        locationInRoom: t.location,
        category: t.category,
        severity: t.severity,
        trade: t.trade,
        suggestedFix: t.fix,
        confidence: t.confidence,
        bbox: t.bbox,
        source: "ai",
        status,
        assigneeId: assigned ? TRADE_TO_MEMBER[t.trade] ?? "u_emily" : undefined,
        price: ["ai_draft", "submitted"].includes(status) ? undefined : t.price,
        createdAt,
        updatedAt: createdAt,
      };
      snags.push(snag);
      return snag;
    });
  }

  function makeQuote(
    prop: Property,
    reportId: string,
    list: Snag[],
    sentAgo: number,
    respondedAgo: number | null,
    decide: (s: Snag) => "pending" | "accepted" | "declined",
    depositPercent = 30,
  ) {
    const items = list.map((s) => ({ snagId: s.id, price: s.price ?? 0, decision: decide(s) }));
    const anyDeclined = items.some((i) => i.decision === "declined");
    const q: Quote = {
      id: `q_${prop.id}`,
      number: `Q-${++quoteNo}`,
      reportId,
      propertyId: prop.id,
      items,
      depositPercent,
      vatRate: settings.vatRate,
      message: "Thanks for sending your snag list. Prices below include labour and materials. Tick the items you'd like us to carry out.",
      status: respondedAgo === null ? "sent" : anyDeclined ? "partially_accepted" : "accepted",
      sentAt: ago(sentAgo),
      respondedAt: respondedAgo === null ? undefined : ago(respondedAgo),
      createdAt: ago(sentAgo + 2 * HOUR),
    };
    quotes.push(q);
    return q;
  }

  const acceptedTotal = (q: Quote) =>
    q.items.filter((i) => i.decision === "accepted").reduce((a, i) => a + i.price, 0) * (1 + q.vatRate);

  function makeInvoice(prop: Property, q: Quote, kind: "deposit" | "balance", amount: number, issuedAgo: number, paidAgo: number | null) {
    const inv: Invoice = {
      id: `inv_${prop.id}_${kind}`,
      number: `INV-${++invNo}`,
      quoteId: q.id,
      propertyId: prop.id,
      kind,
      amount: Math.round(amount * 100) / 100,
      status: paidAgo === null ? "unpaid" : "paid",
      issuedAt: ago(issuedAgo),
      dueAt: new Date(now - issuedAgo + 7 * DAY).toISOString(),
      paidAt: paidAgo === null ? undefined : ago(paidAgo),
    };
    invoices.push(inv);
    if (paidAgo !== null) {
      payments.push({
        id: `pay_${inv.id}`,
        invoiceId: inv.id,
        propertyId: prop.id,
        amount: inv.amount,
        cardLast4: "4242",
        reference: `pi_test_${prop.id.slice(-3)}${kind[0]}${invNo}`,
        paidAt: ago(paidAgo),
      });
    }
    return inv;
  }

  /* ---- 1. Morgan: work in progress ---- */
  const morgan = makeProperty(
    { ownerId: "u_morgan", plot: "Plot 23", addressLine1: "14 Meadowbrook Rise", town: "Harrogate", postcode: "HG2 7QT", development: "Meadowbrook Rise", completionDate: ago(52 * DAY), invitedAt: ago(30 * DAY), joinedAt: ago(29 * DAY), coverHue: 162 },
    "p_morgan",
  );
  reports.push({ id: "r_morgan", propertyId: morgan.id, version: 1, status: "in_progress", summary: "18 snags recorded across 9 rooms. Two safety items (loose balustrade and a window that does not lock) and four major items need priority attention. The remaining items are minor finishing defects typical of a new build.", submittedAt: ago(24 * DAY), createdAt: ago(25 * DAY) });
  const morganSnags = makeSnags(
    morgan,
    "r_morgan",
    [
      { key: "lanBalustrade", status: "verified" },
      { key: "bed1Window", status: "verified" },
      { key: "kitTrap", status: "verified" },
      { key: "bathSilicone", status: "fixed" },
      { key: "bed1Door", status: "in_progress" },
      { key: "bathFan", status: "in_progress" },
      { key: "kitTile", status: "reopened" },
      { key: "hallCrack", status: "verified" },
      { key: "hallSkirting", status: "assigned" },
      { key: "kitSealant", status: "verified" },
      { key: "livSocket", status: "fixed" },
      { key: "livPaint", status: "verified" },
      { key: "livCeiling", status: "assigned" },
      { key: "bed2Radiator", status: "verified" },
      { key: "bathGrout", status: "in_progress" },
      { key: "garDoor", status: "declined" },
      { key: "extPointing", status: "assigned" },
      { key: "extDebris", status: "verified" },
    ],
    ago(25 * DAY),
  );
  const morganQuote = makeQuote(morgan, "r_morgan", morganSnags, 21 * DAY, 19 * DAY, (s) => (s.status === "declined" ? "declined" : "accepted"));
  const morganTotal = acceptedTotal(morganQuote);
  makeInvoice(morgan, morganQuote, "deposit", morganTotal * 0.3, 19 * DAY, 19 * DAY - 3 * HOUR);

  // Timeline for Morgan snags
  morganSnags.forEach((s, i) => {
    const base = 18 * DAY - i * 3 * HOUR;
    if (s.status === "declined") return;
    addUpdate({ snagId: s.id, propertyId: morgan.id, actorId: "system", kind: "assign", note: `Auto-assigned by trade`, toStatus: "assigned", createdAt: ago(base) });
    if (["in_progress", "fixed", "verified", "reopened"].includes(s.status)) {
      addUpdate({ snagId: s.id, propertyId: morgan.id, actorId: s.assigneeId!, kind: "status", fromStatus: "assigned", toStatus: "in_progress", note: "On site today, starting on this.", createdAt: ago(base - 4 * DAY) });
    }
    if (["fixed", "verified", "reopened"].includes(s.status)) {
      addUpdate({ snagId: s.id, propertyId: morgan.id, actorId: s.assigneeId!, kind: "status", fromStatus: "in_progress", toStatus: "fixed", note: "Completed and checked. Photo attached.", createdAt: ago(base - 7 * DAY) });
    }
    if (s.status === "verified") {
      addUpdate({ snagId: s.id, propertyId: morgan.id, actorId: "u_morgan", kind: "status", fromStatus: "fixed", toStatus: "verified", note: "Looks great, thank you.", createdAt: ago(base - 8 * DAY) });
    }
    if (s.status === "reopened") {
      addUpdate({ snagId: s.id, propertyId: morgan.id, actorId: "u_morgan", kind: "status", fromStatus: "fixed", toStatus: "reopened", note: "The new tile has a visible lip on the left edge, please take another look.", createdAt: ago(2 * DAY) });
    }
  });
  // A couple of fresh progress notes
  addUpdate({ snagId: morganSnags[5].id, propertyId: morgan.id, actorId: "u_oliver", kind: "progress", note: "Fan motor has failed. Replacement unit ordered, fitting Thursday.", createdAt: ago(5 * HOUR) });
  addUpdate({ snagId: morganSnags[4].id, propertyId: morgan.id, actorId: "u_jack", kind: "progress", note: "Hinges adjusted, door head needs planing. Back tomorrow morning.", createdAt: ago(26 * HOUR) });
  morganSnags.forEach((s) => (s.dueDate = ["assigned", "in_progress", "reopened"].includes(s.status) ? ahead(((s.ref.length % 4) + 1) * DAY) : undefined));
  // One overdue item for the dashboard
  morganSnags[8].dueDate = ago(2 * DAY);

  /* ---- 2. Price: quote awaiting decision ---- */
  const price = makeProperty(
    { ownerId: "u_price", plot: "Plot 7", addressLine1: "3 Willow Close", town: "Chester", postcode: "CH3 5LN", development: "The Willows", completionDate: ago(21 * DAY), invitedAt: ago(12 * DAY), joinedAt: ago(11 * DAY), coverHue: 262 },
    "p_price",
  );
  reports.push({ id: "r_price", propertyId: price.id, version: 1, status: "quoted", summary: "12 snags recorded. One safety item (missing gully grid) and two major items in the en-suite and kitchen. Most other items are cosmetic paintwork and sealant defects.", submittedAt: ago(5 * DAY), createdAt: ago(5 * DAY + 3 * HOUR) });
  const priceSnags = makeSnags(
    price,
    "r_price",
    (["extGully", "ensShower", "kitTrap", "ensTile", "kitDoor", "livPaint", "bed1Paint", "bed2Wardrobe", "wcCistern", "hallSkirting", "loftInsulation", "extDebris"] as LibKey[]).map((key) => ({ key, status: "quoted" as SnagStatus })),
    ago(5 * DAY + 3 * HOUR),
  );
  makeQuote(price, "r_price", priceSnags, 2 * DAY, null, () => "pending", 30);

  /* ---- 3. Fletcher: just submitted ---- */
  const fletcher = makeProperty(
    { ownerId: "u_fletcher", plot: "Plot 41", addressLine1: "22 Kingfisher Way", town: "York", postcode: "YO26 4GH", development: "Kingfisher Meadows", completionDate: ago(14 * DAY), invitedAt: ago(6 * DAY), joinedAt: ago(6 * DAY), coverHue: 32 },
    "p_fletcher",
  );
  reports.push({ id: "r_fletcher", propertyId: fletcher.id, version: 1, status: "submitted", summary: "11 snags recorded. One safety item (loose carpet at the landing threshold) and two major items: the bathroom extractor fan and a bedroom door that will not latch.", submittedAt: ago(6 * HOUR), createdAt: ago(7 * HOUR) });
  makeSnags(
    fletcher,
    "r_fletcher",
    (["lanCarpet", "bathFan", "bed1Door", "kitSealant", "kitTile", "livSocket", "livCeiling", "bed2Radiator", "bathGrout", "extPointing", "garDoor"] as LibKey[]).map((key) => ({ key, status: "submitted" as SnagStatus })),
    ago(7 * HOUR),
  );

  /* ---- 4. Blake: completed ---- */
  const blake = makeProperty(
    { ownerId: "u_blake", plot: "Plot 12", addressLine1: "8 Ashdown Lane", town: "Cheltenham", postcode: "GL52 3RW", development: "Ashdown Park", completionDate: ago(110 * DAY), invitedAt: ago(95 * DAY), joinedAt: ago(94 * DAY), coverHue: 205 },
    "p_blake",
  );
  reports.push({ id: "r_blake", propertyId: blake.id, version: 1, status: "completed", summary: "10 snags recorded, all now verified as fixed. One item was declined by the owner.", submittedAt: ago(90 * DAY), createdAt: ago(91 * DAY) });
  const blakeSnags = makeSnags(
    blake,
    "r_blake",
    [
      { key: "lanBalustrade", status: "verified" },
      { key: "ensShower", status: "verified" },
      { key: "wcCistern", status: "verified" },
      { key: "hallCrack", status: "verified" },
      { key: "kitDoor", status: "verified" },
      { key: "livPaint", status: "verified" },
      { key: "bed1Paint", status: "declined" },
      { key: "bathSilicone", status: "verified" },
      { key: "extDebris", status: "verified" },
      { key: "loftInsulation", status: "verified" },
    ],
    ago(91 * DAY),
  );
  const blakeQuote = makeQuote(blake, "r_blake", blakeSnags, 86 * DAY, 85 * DAY, (s) => (s.status === "declined" ? "declined" : "accepted"), 30);
  const blakeTotal = acceptedTotal(blakeQuote);
  makeInvoice(blake, blakeQuote, "deposit", blakeTotal * 0.3, 85 * DAY, 85 * DAY - 2 * HOUR);
  makeInvoice(blake, blakeQuote, "balance", blakeTotal * 0.7, 10 * DAY, null); // unpaid, 3 days overdue
  blakeSnags.forEach((s, i) => {
    if (s.status === "declined") return;
    addUpdate({ snagId: s.id, propertyId: blake.id, actorId: s.assigneeId!, kind: "status", fromStatus: "in_progress", toStatus: "fixed", note: "Completed.", createdAt: ago(50 * DAY - i * HOUR) });
    addUpdate({ snagId: s.id, propertyId: blake.id, actorId: "u_blake", kind: "status", fromStatus: "fixed", toStatus: "verified", createdAt: ago(45 * DAY - i * HOUR) });
  });

  /* ---- 5. Waiting for snags: invited, hasn't joined yet (joins on first sign-in) ---- */
  makeProperty(
    { ownerId: "u_dawson", plot: "Plot 31", addressLine1: "6 Heron Court", town: "Harrogate", postcode: "HG3 2LS", development: "Meadowbrook Rise", completionDate: ago(3 * DAY), invitedAt: ago(1 * DAY), coverHue: 190 },
    "p_dawson",
  );

  /* ---- 7. Completed and fully paid ---- */
  const PAST: { owner: string; id: string; plot: string; addr: string; town: string; pc: string; dev: string; hue: number; months: number; keys: LibKey[] }[] = [
    { owner: "u_lawson", id: "p_lawson", plot: "Plot 11", addr: "21 Orchard Gardens", town: "Ludlow", pc: "SY8 1FD", dev: "Orchard Gardens", hue: 30, months: 5.5, keys: ["ensTile", "kitSealant", "bed1Paint", "bed2Radiator", "extGully"] },
  ];
  for (const job of PAST) {
    const start = job.months * 30 * DAY;
    const prop = makeProperty(
      { ownerId: job.owner, plot: job.plot, addressLine1: job.addr, town: job.town, postcode: job.pc, development: job.dev, completionDate: ago(start + 25 * DAY), invitedAt: ago(start + 6 * DAY), joinedAt: ago(start + 5 * DAY), coverHue: job.hue },
      job.id,
    );
    const reportId = "r_" + job.id.slice(2);
    reports.push({ id: reportId, propertyId: prop.id, version: 1, status: "completed", summary: job.keys.length + " snags recorded, all fixed and verified by the owner.", submittedAt: ago(start), createdAt: ago(start + HOUR) });
    const list = makeSnags(prop, reportId, job.keys.map((key) => ({ key, status: "verified" as SnagStatus })), ago(start + HOUR));
    const q = makeQuote(prop, reportId, list, start - 2 * DAY, start - 3 * DAY, () => "accepted", 30);
    const total = acceptedTotal(q);
    makeInvoice(prop, q, "deposit", total * 0.3, start - 3 * DAY, start - 3 * DAY - 4 * HOUR);
    makeInvoice(prop, q, "balance", total * 0.7, start - 32 * DAY, start - 36 * DAY);
  }

  /* ---- Number quotes and invoices in date order, like a real ledger ---- */
  [...quotes]
    .sort((a, b) => (a.sentAt ?? a.createdAt).localeCompare(b.sentAt ?? b.createdAt))
    .forEach((q, i) => (q.number = "Q-" + (1001 + i)));
  [...invoices]
    .sort((a, b) => a.issuedAt.localeCompare(b.issuedAt))
    .forEach((inv, i) => (inv.number = "INV-" + (2001 + i)));
  const blakeBalanceNo = invoices.find((i) => i.id === "inv_p_blake_balance")!.number;
  const priceQuoteNo = quotes.find((q) => q.propertyId === "p_price")!.number;

  /* ---- Demo inbox ---- */
  const teamMail = (id: string, to: string, name: string, subject: string, preview: string, body: string, sentAgo: number, read: boolean) =>
    emails.push({ id, to, subject, preview, body: "Hi " + name + ",\n\n" + body + "\n\nHartwell Building Services", link: "/login?as=" + to.split("@")[0].replace(/^/, "u_"), sentAt: ago(sentAgo), read });
  teamMail("em_t1", "oliver@hartwell.example", "Oliver", "New job: BATH-02 Extractor fan not working", "BATH-02 · 14 Meadowbrook Rise", "You've been given a new job:\n\n- BATH-02: Extractor fan not working (14 Meadowbrook Rise)\n\nOpen SnagSnap to see the photos and start work.", 18 * DAY, true);
  teamMail("em_t2", "jack@hartwell.example", "Jack", "3 new jobs assigned to you", "BED1-02, HAL-02, BED1-01 · tap to see the details", "You've been given 3 new jobs:\n\n- BED1-02: Bedroom door catches on frame\n- HAL-02: Gap between skirting and floor\n- BED1-01: Window does not lock fully\n\nAll at 14 Meadowbrook Rise. Open SnagSnap to see the photos and start work.", 18 * DAY, true);
  teamMail("em_t3", "george@hartwell.example", "George", "KIT-02 sent back: not fixed yet", "The owner says: The new tile has a visible lip on the left edge, please take another look.", "The owner at 14 Meadowbrook Rise says KIT-02 (Cracked floor tile by kitchen door) isn't fixed yet.\n\nTheir note: The new tile has a visible lip on the left edge, please take another look.\n\nPlease take another look.", 2 * DAY, false);
  teamMail("em_t4", "oliver@hartwell.example", "Oliver", "Overdue jobs this morning", "You have no overdue jobs. Nice work.", "Your morning summary: no overdue jobs today. 1 job in progress (BATH-02).", 6 * HOUR, false);
  emails.push(
    {
      id: "em_blake_rem1",
      to: "edward.blake@example.co.uk",
      subject: "Reminder: invoice " + blakeBalanceNo + " for " + new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(Math.round(blakeTotal * 0.7 * 100) / 100),
      preview: "Your balance invoice for 8 Ashdown Lane is due. Pay securely by card.",
      body:
        "Hi Edward,\n\nA friendly reminder that invoice " + blakeBalanceNo + " for " +
        new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(Math.round(blakeTotal * 0.7 * 100) / 100) +
        " is due. You can pay securely by card from your SnagSnap account.\n\nHartwell Building Services",
      link: "/login?as=u_blake",
      sentAt: ago(2 * DAY),
      read: true,
      kind: "invoice_reminder",
      refId: "inv_p_blake_balance",
      edited: false,
      sentById: CONTRACTOR_ID,
    },
    {
      id: "em_1",
      to: "dawsons@example.co.uk",
      subject: "Your new home at 6 Heron Court: report any snags",
      preview: "Hartwell Building Services has set up your home. Tap the link to start.",
      body: "Hi Matthew,\n\nCongratulations on your new home. We've set up 6 Heron Court on SnagSnap so you can photograph anything that isn't quite right. Our AI will write up each item and send it straight to us.\n\nTap the button below to get started. No password needed.\n\nRichard Hartwell\nHartwell Building Services",
      link: "/login?as=u_dawson",
      sentAt: ago(1 * DAY),
      read: false,
    },
    {
      id: "em_2",
      to: "hannah.price@example.co.uk",
      subject: "Quote " + priceQuoteNo + " for 3 Willow Close is ready",
      preview: "12 items, review and choose which ones you'd like us to carry out.",
      body: "Hi Hannah,\n\nYour quote for the snags at 3 Willow Close is ready. You can accept or decline each item individually, and a 30% deposit secures your booking.\n\nRichard Hartwell",
      link: "/login?as=u_price",
      sentAt: ago(2 * DAY),
      read: true,
    },
    {
      id: "em_3",
      to: "richard@hartwell.example",
      subject: "New snag report: 22 Kingfisher Way (11 items)",
      preview: "Michael & Laura Fletcher submitted a report with 1 safety item.",
      body: "A new snag report has been submitted for Plot 41, 22 Kingfisher Way, York.\n\n11 items, 1 safety, 2 major.",
      link: "/login?as=u_contractor",
      sentAt: ago(6 * HOUR),
      read: false,
    },
  );

  return { settings, users, properties, rooms, reports, snags, updates, quotes, invoices, payments, emails, rateCard: DEFAULT_RATE_CARD };
}
