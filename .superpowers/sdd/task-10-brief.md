### Task 10: Frontend — Add touch support to `SimpleLineChart`

**Files:**
- Modify: `frontend/src/components/charts/SimpleLineChart.tsx`

**Interfaces:**
- Consumes: existing `SimpleLineChart` props unchanged
- Produces: Same visual output, touch interaction mirrors mouse hover

- [ ] **Step 1: Add touch handlers**

In the hover grid div (around line 472), add `touchAction: "none"` to the style to prevent scroll interference.

Add `onTouchMove` handler to the grid div:
```tsx
onTouchMove={(event) => {
  const touch = event.touches[0];
  if (!touch) return;
  const target = document.elementFromPoint(touch.clientX, touch.clientY) as HTMLElement | null;
  const button = target?.closest("button");
  if (!button) return;
  const index = Array.from(button.parentElement?.children ?? []).indexOf(button);
  if (index >= 0 && index < data.length) {
    setHoveredIndex(index);
  }
}}
onTouchEnd={() => setHoveredIndex(null)}
```

Add `onTouchStart` handler to each button:
```tsx
onTouchStart={(event) => {
  event.preventDefault();
  setHoveredIndex(index);
}}
```

- [ ] **Step 2: Verify compilation**

```bash
cd frontend && npx tsc --noEmit
```

Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/charts/SimpleLineChart.tsx
git commit -m "feat: add touch support to SimpleLineChart hover interaction"
```
