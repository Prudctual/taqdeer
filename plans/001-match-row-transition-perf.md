# 001 — Match Row Transition Performance & Press Feedback

- **Status**: DONE
- **Commit**: 929f5a4
- **Severity**: HIGH
- **Category**: Performance & Purpose & frequency
- **Estimated scope**: 1 file (`src/app/globals.css`)

## Problem

In `src/app/globals.css:257`, `.match-row` specifies `transition: all var(--motion-fast) var(--ease);`.
Because match rows are rendered in high-density lists (100+ items per page), `transition: all` causes unnecessary style recalculations across non-composited CSS properties on hover/focus. Furthermore, match rows lack active press feedback when tapped/clicked.

```css
/* src/app/globals.css:257 — current */
.match-row {
  transition: all var(--motion-fast) var(--ease);
}
```

## Target

Target specific composited properties (`background-color`, `color`, `transform`) and add subtle active press feedback (`transform: scale(0.995)`):

```css
/* src/app/globals.css — target */
.match-row {
  transition: background-color var(--motion-fast) var(--ease-out),
    color var(--motion-fast) var(--ease-out),
    transform var(--motion-fast) var(--ease-out);
}

.match-row:active {
  transform: scale(0.995);
}
```

## Repo conventions to follow

- Global CSS classes and tokens live in `src/app/globals.css`.
- Motion durations use `var(--motion-fast)` (140ms).

## Steps

1. In `src/app/globals.css`, locate `.match-row` at line 257.
2. Replace `transition: all var(--motion-fast) var(--ease);` with explicit property transitions.
3. Add `.match-row:active { transform: scale(0.995); }`.

## Boundaries

- Do NOT change grid layout or padding on `.match-row`.
- Do NOT touch hover color definitions (`background: #1d4ed8 !important`).

## Verification

- **Mechanical**: Run `npm run check` (or `npx tsc --noEmit && npx eslint .`).
- **Feel check**: Hover over match rows on the homepage; confirm smooth color transition without layout recalculations. Click down on a row to confirm subtle `0.995` press feedback.
- **Done when**: `.match-row` uses explicit property transitions and provides active press feedback.
