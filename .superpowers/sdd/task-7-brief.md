### Task 7: Frontend — Add `size="sm"` variant to StatTile

**Files:**
- Modify: `frontend/src/components/ui/stat-tile.tsx`

**Interfaces:**
- Produces: `StatTile` accepts optional `size?: "sm" | "default"` prop — defaults to `"default"`, `"sm"` reduces padding/value size/hides icon

- [ ] **Step 1: Add the size prop to the type**

Add `size?: "sm" | "default";` to the `StatTileProps` type. Add `size = "default"` to the function destructuring.

- [ ] **Step 2: Add compact styles**

Use a `compact` boolean: `const compact = size === "sm";`

Apply these CSS changes when compact:
- Container padding: `compact ? "p-3" : "p-4 sm:p-5"`
- Label size: `compact ? "text-[11px]" : "text-xs"`
- Value size: `compact ? "text-lg" : "text-2xl sm:text-3xl"`
- Icon: hide when compact (`{!compact && Icon ? ... : null}`)
- Supporting text: `compact ? "text-[10px]" : "text-xs"`

- [ ] **Step 3: Verify compilation**

```bash
cd frontend && npx tsc --noEmit
```

Expected: No type errors

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/ui/stat-tile.tsx
git commit -m "feat: add size=sm variant to StatTile for compact summary views"
```
