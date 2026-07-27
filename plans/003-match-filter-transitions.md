# 003 — Optimize Match Filter Search & Pill Button Transitions

- **Status**: DONE
- **Commit**: 929f5a4
- **Severity**: MEDIUM
- **Category**: Performance & Easing
- **Estimated scope**: 1 file (`src/components/InteractiveMatchFilter.tsx`)

## Problem

In `src/components/InteractiveMatchFilter.tsx:34, 50, 61, 72, 83`, search inputs and filter buttons use `transition-all` without explicit timing durations or easing functions.

```tsx
/* src/components/InteractiveMatchFilter.tsx:50 — current */
className={`rounded-full px-3 py-1 text-xs font-bold transition-all ${
  selectedSort === "all"
    ? "bg-blue-600 text-white shadow-sm ring-1 ring-blue-400"
    : "bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white"
}`}
```

## Target

Replace `transition-all` with targeted transitions (`transition-colors duration-150 ease-out` and `active:scale-95 transition-all duration-150 ease-out`):

```tsx
/* src/components/InteractiveMatchFilter.tsx — target */
// Input:
className="w-full rounded-lg border border-line bg-zinc-950 px-3 py-1.5 pr-8 text-xs text-ink placeholder-muted transition-colors duration-150 ease-out focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"

// Buttons:
className={`rounded-full px-3 py-1 text-xs font-bold transition-all duration-150 ease-out active:scale-95 ${...}`}
```

## Repo conventions to follow

- Utility classes follow Tailwind v4 conventions (`transition-colors`, `duration-150`, `ease-out`, `active:scale-95`).

## Steps

1. Open `src/components/InteractiveMatchFilter.tsx`.
2. On line 34, change `transition-all` on the input element to `transition-colors duration-150 ease-out`.
3. On lines 50, 61, 72, 83, change `transition-all` on filter pill buttons to `transition-all duration-150 ease-out active:scale-95`.

## Boundaries

- Do NOT change state management logic (`handleSortSelect` or `handleSearchChange`).
- Do NOT change pill colors or text content.

## Verification

- **Mechanical**: Run `npm run check`.
- **Feel check**: Click between filter tabs ("جميع المواعيد", "أعلى نسبة ثقة", etc.); observe crisp color transitions and immediate press feedback.
- **Done when**: Filter input and pill buttons animate state changes cleanly with explicit duration and press feedback.
