import {
  Bath,
  BrickWall,
  Brush,
  DoorOpen,
  Droplets,
  Grid3x3,
  Hammer,
  Home,
  Layers,
  Paintbrush,
  PlugZap,
  Sparkles,
  Square,
  Trash2,
  Waves,
  Wind,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { Category, Snag } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Photo of a snag with the AI bounding box drawn on top.
 * Until real demo photos are added, a generated placeholder (category-themed surface) is shown.
 */
const CAT: Record<Category, { icon: LucideIcon; from: string; to: string }> = {
  Cracks: { icon: Layers, from: "#e9e4da", to: "#d9d2c4" },
  Paintwork: { icon: Paintbrush, from: "#efeae3", to: "#ddd6cb" },
  "Plaster/Drylining": { icon: Square, from: "#ece8e1", to: "#d8d2c6" },
  Tiling: { icon: Grid3x3, from: "#dfe3e4", to: "#c6cdcf" },
  "Sealant/Silicone": { icon: Droplets, from: "#e3e8ea", to: "#cdd5d8" },
  "Carpentry/Joinery": { icon: Hammer, from: "#e8dccb", to: "#d2bfa3" },
  Doors: { icon: DoorOpen, from: "#e6ddcf", to: "#cfc0a8" },
  Windows: { icon: Wind, from: "#dfe7ec", to: "#c4d2db" },
  Flooring: { icon: Layers, from: "#e2d6c4", to: "#c9b89f" },
  Plumbing: { icon: Waves, from: "#dbe5ea", to: "#bfd0d9" },
  Electrical: { icon: PlugZap, from: "#ebe7dc", to: "#d9d2bf" },
  "Kitchen units/Worktops": { icon: Home, from: "#e4e0d8", to: "#ccc5b8" },
  Sanitaryware: { icon: Bath, from: "#e2e8ea", to: "#cad5d9" },
  "Brickwork/Pointing": { icon: BrickWall, from: "#e3cfc2", to: "#c9a996" },
  Roofing: { icon: Home, from: "#d9dcdf", to: "#bcc1c6" },
  "Drainage/External": { icon: Droplets, from: "#d8ddd5", to: "#b9c2b4" },
  "Insulation/Loft": { icon: Zap, from: "#ece3cf", to: "#d8c9a8" },
  "Cleaning/Debris": { icon: Trash2, from: "#e0ddd5", to: "#c5c0b4" },
  Other: { icon: Sparkles, from: "#e5e3df", to: "#cfccc5" },
};

export function SnagPhoto({
  snag,
  className,
  showBox = true,
  rounded = "rounded-xl",
}: {
  snag: Pick<Snag, "category" | "bbox" | "photoUrl" | "title">;
  className?: string;
  showBox?: boolean;
  rounded?: string;
}) {
  const meta = CAT[snag.category] ?? CAT.Other;
  const Icon = meta.icon ?? Brush;
  return (
    <div className={cn("relative overflow-hidden bg-sunken", rounded, className)}>
      {snag.photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={snag.photoUrl} alt={snag.title} className="absolute inset-0 size-full object-cover" />
      ) : (
        <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${meta.from}, ${meta.to})` }}>
          <div className="absolute inset-0 opacity-60 mix-blend-multiply bg-blueprint" />
          <Icon className="absolute right-3 bottom-3 size-6 text-black/15" strokeWidth={1.5} />
        </div>
      )}
      {showBox && snag.bbox && (
        <div
          className="absolute rounded-[3px] border-2 border-red-500 shadow-[0_0_0_9999px_rgb(0_0_0/0.06)]"
          style={{
            left: `${snag.bbox.x * 100}%`,
            top: `${snag.bbox.y * 100}%`,
            width: `${snag.bbox.w * 100}%`,
            height: `${snag.bbox.h * 100}%`,
          }}
        />
      )}
    </div>
  );
}
