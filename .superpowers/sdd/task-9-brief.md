### Task 9: Frontend — Create `SummaryHero` component

**Files:**
- Create: `frontend/src/components/ui/SummaryHero.tsx`

**Interfaces:**
- Produces: `<SummaryHero tiles={[{ label, value }]}>` — renders a 3-column grid of compact StatTiles

- [ ] **Step 1: Create the component**

```tsx
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
```

- [ ] **Step 2: Verify compilation**

```bash
cd frontend && npx tsc --noEmit
```

Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/ui/SummaryHero.tsx
git commit -m "feat: add SummaryHero component for 3-tile compact stat bar"
```
