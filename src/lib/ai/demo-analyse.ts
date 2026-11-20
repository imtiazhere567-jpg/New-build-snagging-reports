/**
 * Demo-mode stand-in for the Claude photo analysis.
 * Returns the same JSON shape as the real model. The result is picked from realistic,
 * room-appropriate snags, steered by keywords in the owner's note, so demos feel genuine.
 */
import type { Analysis, AnalysedSnag } from "./schema";

type Tpl = Omit<AnalysedSnag, "confidence">;
const T = (t: Tpl) => t;

const BY_ROOM: Record<string, Tpl[]> = {
  kitchen: [
    T({ title: "Cracked floor tile by kitchen door", description: "Hairline crack running diagonally across one 600x600 floor tile, approx. 300 mm from the kitchen door threshold.", location_in_room: "Floor, near the door threshold", category: "Tiling", severity: "minor", trade: "tiler", suggested_fix: "Remove and replace the cracked tile; match the grout colour.", bbox: { x: 0.38, y: 0.52, w: 0.24, h: 0.18 } }),
    T({ title: "Missing sealant at worktop upstand", description: "No silicone bead between the worktop and the tiled splashback for approx. 900 mm behind the sink.", location_in_room: "Worktop to splashback joint, behind the sink", category: "Sealant/Silicone", severity: "minor", trade: "general", suggested_fix: "Clean the joint and apply a continuous white sanitary silicone bead.", bbox: { x: 0.08, y: 0.4, w: 0.78, h: 0.12 } }),
    T({ title: "Misaligned wall unit door", description: "Wall unit door sits approx. 5 mm lower than the adjacent door and does not close flush.", location_in_room: "Wall units, left of the cooker hood", category: "Kitchen units/Worktops", severity: "cosmetic", trade: "kitchen fitter", suggested_fix: "Adjust the concealed hinges so the doors align and close flush.", bbox: { x: 0.14, y: 0.18, w: 0.34, h: 0.42 } }),
  ],
  bathroom: [
    T({ title: "Gap in bath silicone", description: "Silicone bead along the bath edge has pulled away for approx. 400 mm, leaving an open joint where water can get behind the panel.", location_in_room: "Bath edge, tap end", category: "Sealant/Silicone", severity: "major", trade: "general", suggested_fix: "Remove the failed bead, clean, fill the bath with water and reapply silicone.", bbox: { x: 0.06, y: 0.48, w: 0.62, h: 0.14 } }),
    T({ title: "Missing grout in wall tiles", description: "Grout missing from two vertical joints in the tiling beside the shower valve.", location_in_room: "Shower wall, right of the valve", category: "Tiling", severity: "minor", trade: "tiler", suggested_fix: "Rake out and regrout the joints to match the existing colour.", bbox: { x: 0.56, y: 0.28, w: 0.16, h: 0.36 } }),
  ],
  bedroom: [
    T({ title: "Door catches on frame", description: "Door binds on the head of the frame and needs force to close; the latch does not engage.", location_in_room: "Bedroom door, hinge side at the top", category: "Doors", severity: "major", trade: "carpenter", suggested_fix: "Adjust the hinges or plane the door head, reseal the cut edge and adjust the keep.", bbox: { x: 0.3, y: 0.04, w: 0.42, h: 0.3 } }),
    T({ title: "Patchy paint finish", description: "Uneven sheen and visible roller marks across the wall, most visible in daylight.", location_in_room: "Wall opposite the window", category: "Paintwork", severity: "cosmetic", trade: "painter", suggested_fix: "Lightly sand and apply a further full coat of emulsion.", bbox: { x: 0.12, y: 0.16, w: 0.76, h: 0.62 } }),
    T({ title: "Window does not lock fully", description: "Window handle will not turn to the locked position; the keeps are misaligned with the sash.", location_in_room: "Main window, right-hand opener", category: "Windows", severity: "safety", trade: "carpenter", suggested_fix: "Adjust the sash and keeps so the espagnolette engages; test the lock.", bbox: { x: 0.56, y: 0.3, w: 0.26, h: 0.36 } }),
  ],
  living: [
    T({ title: "Socket faceplate not level", description: "Double socket faceplate fitted approx. 4° off level and not tight to the wall, leaving a 2 mm gap.", location_in_room: "Wall behind the TV position, approx. 300 mm above the floor", category: "Electrical", severity: "cosmetic", trade: "electrician", suggested_fix: "Isolate the circuit, level and refix the faceplate tight to the wall.", bbox: { x: 0.4, y: 0.4, w: 0.2, h: 0.18 } }),
    T({ title: "Nail pops in ceiling", description: "Several nail pops visible in the plasterboard ceiling near the central light, each approx. 10 mm across.", location_in_room: "Ceiling, around the central light", category: "Plaster/Drylining", severity: "minor", trade: "plasterer", suggested_fix: "Drive in, fix with additional screws, fill, sand and repaint the ceiling.", bbox: { x: 0.3, y: 0.08, w: 0.4, h: 0.26 } }),
  ],
  hall: [
    T({ title: "Gap between skirting and floor", description: "Continuous gap of 4–6 mm between the skirting board and the flooring along approx. 1.4 m.", location_in_room: "Skirting along the right-hand wall", category: "Carpentry/Joinery", severity: "minor", trade: "carpenter", suggested_fix: "Refix the skirting tight to the floor or fit a matching scotia bead; caulk and paint.", bbox: { x: 0.04, y: 0.7, w: 0.86, h: 0.14 } }),
    T({ title: "Hairline crack above door frame", description: "Hairline crack approx. 200 mm long running diagonally from the corner of the door lining towards the ceiling.", location_in_room: "Wall above the door, left corner", category: "Cracks", severity: "minor", trade: "plasterer", suggested_fix: "Rake out, fill with flexible filler, sand and repaint to match.", bbox: { x: 0.18, y: 0.1, w: 0.3, h: 0.24 } }),
  ],
  external: [
    T({ title: "Open joints in brickwork", description: "Three open perpend joints in the brickwork, each approx. 10 mm, allowing water into the wall.", location_in_room: "Rear elevation, right of the back door", category: "Brickwork/Pointing", severity: "minor", trade: "bricklayer", suggested_fix: "Point the open joints with matching mortar.", bbox: { x: 0.54, y: 0.34, w: 0.26, h: 0.3 } }),
    T({ title: "Building debris left in garden", description: "Rubble, plaster bags and offcuts left along the fence line.", location_in_room: "Rear garden, along the fence", category: "Cleaning/Debris", severity: "cosmetic", trade: "cleaner", suggested_fix: "Clear and dispose of all debris from the garden.", bbox: { x: 0.02, y: 0.5, w: 0.96, h: 0.4 } }),
  ],
};

type Group = "kitchen" | "bathroom" | "bedroom" | "living" | "hall" | "external";

const LEAK = T({ title: "Leaking waste trap", description: "Active drip from the compression joint on the waste trap, with water staining on the base of the unit.", location_in_room: "Waste trap under the sink", category: "Plumbing", severity: "major", trade: "plumber", suggested_fix: "Reseat and tighten the trap joint, replace the washer if damaged, and dry and check the base.", bbox: { x: 0.44, y: 0.24, w: 0.16, h: 0.38 } });
const INSULATION = T({ title: "Gap in loft insulation", description: "Insulation missing for the full length of one bay between the joists, leaving the ceiling below exposed.", location_in_room: "Loft, one bay beside the hatch", category: "Insulation/Loft", severity: "minor", trade: "general", suggested_fix: "Relay insulation to full depth across the bay.", bbox: { x: 0.56, y: 0.0, w: 0.14, h: 1.0 } });
const SPLASH = T({ title: "Paint splashes on window board", description: "Several emulsion splashes on the UPVC window board, each 2–8 mm across.", location_in_room: "Window board", category: "Paintwork", severity: "cosmetic", trade: "painter", suggested_fix: "Remove the splashes with a suitable cleaner without scratching the UPVC.", bbox: { x: 0.2, y: 0.6, w: 0.56, h: 0.12 } });
const WINDOW = BY_ROOM.bedroom[2];

/** Keyword rules, most specific first. Some depend on the room (sealant in a kitchen vs a bathroom). */
const KEYWORDS: [RegExp, (g: Group) => Tpl][] = [
  [/insulation|loft/i, () => INSULATION],
  [/brick|pointing|mortar/i, () => BY_ROOM.external[0]],
  [/debris|rubble|rubbish|mess/i, () => BY_ROOM.external[1]],
  [/leak|drip|water|tap|pipe/i, () => LEAK],
  [/socket|switch|light|electric/i, () => BY_ROOM.living[0]],
  [/splash/i, () => SPLASH],
  [/grout/i, () => BY_ROOM.bathroom[1]],
  [/silicone|sealant|seal/i, (g) => (g === "kitchen" ? BY_ROOM.kitchen[1] : BY_ROOM.bathroom[0])],
  [/tile/i, (g) => (g === "bathroom" ? BY_ROOM.bathroom[1] : BY_ROOM.kitchen[0])],
  [/patch|roller|paint|scuff/i, () => BY_ROOM.bedroom[1]],
  [/crack/i, (g) => (g === "kitchen" ? BY_ROOM.kitchen[0] : BY_ROOM.hall[1])],
  [/window|lock/i, () => WINDOW],
  [/door|catch|stick/i, () => BY_ROOM.bedroom[0]],
  [/skirting/i, () => BY_ROOM.hall[0]],
  [/gap/i, () => BY_ROOM.hall[0]],
];

function roomGroup(roomName: string): Group {
  const r = roomName.toLowerCase();
  if (r.includes("kitchen")) return "kitchen";
  if (r.includes("bath") || r.includes("en-suite") || r === "wc") return "bathroom";
  if (r.includes("bed")) return "bedroom";
  if (r.includes("living")) return "living";
  if (r.includes("external") || r.includes("garage") || r.includes("loft")) return "external";
  return "hall";
}

/** Small deterministic hash so the same photo gives the same answer. */
function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 97) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return Math.abs(h);
}

export async function demoAnalyse(image: string, roomName: string, note?: string): Promise<Analysis> {
  // Feels like a real model call
  await new Promise((r) => setTimeout(r, 1400 + (hash(image) % 900)));
  const seed = hash(image + roomName + (note ?? ""));

  // Very small images read as "too far" so the retake flow can be seen
  if (image.length < 12_000) return { no_defect_visible: true, image_quality: "too_far", snags: [] };

  const group = roomGroup(roomName);
  const rule = note ? KEYWORDS.find(([re]) => re.test(note)) : undefined;
  const fromNote = rule?.[1](group);
  const pool = BY_ROOM[group];
  const primary = fromNote ?? pool[seed % pool.length];

  // Occasionally spot a second, smaller snag in the same photo (spec: one photo can produce more than one snag)
  const extra = !fromNote && seed % 5 === 0 ? pool.find((t) => t !== primary) : undefined;
  const confidence = (n: number) => Math.round(n * 100) / 100;

  return {
    no_defect_visible: false,
    image_quality: "good",
    snags: [
      { ...primary, confidence: confidence(fromNote ? 0.84 + (seed % 12) / 100 : 0.62 + (seed % 30) / 100) },
      ...(extra ? [{ ...extra, confidence: confidence(0.48 + (seed % 10) / 100) }] : []),
    ],
  };
}
