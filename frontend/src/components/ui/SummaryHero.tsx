import type { ReactNode } from "react";
import StatTile from "@/components/ui/stat-tile";

type SummaryHeroTile = {
  label: string;
  value: ReactNode;
};

type SummaryHeroProps = {
  tiles: SummaryHeroTile[];
  className?: string;
};

export default function SummaryHero({ tiles, className }: SummaryHeroProps) {
  if (tiles.length === 0) {
    return null;
  }

  return (
    <div className={className}>
      <div className="grid grid-cols-3 gap-3">
        {tiles.map((tile) => (
          <StatTile
            key={tile.label}
            label={tile.label}
            value={tile.value}
            size="sm"
          />
        ))}
      </div>
    </div>
  );
}
