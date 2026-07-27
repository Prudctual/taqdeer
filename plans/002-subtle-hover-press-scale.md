# 002 — Refine Oversized Hover Transforms & Add Active Press Feedback

- **Status**: DONE
- **Commit**: 929f5a4
- **Severity**: HIGH
- **Category**: Physicality & origin
- **Estimated scope**: 2 files (`src/app/globals.css`, `src/components/PlayerCascadeStack.tsx`)

## Problem

In `src/app/globals.css:371`, `.chip-filter:hover` uses `transform: scale(1.1);` and `[aria-current="page"]` uses `transform: scale(1.08);`. A 10% scale expansion causes text/icon blurriness on standard displays and feels cartoonish for a clean dark analysis interface.
In `src/components/PlayerCascadeStack.tsx:57`, player avatars use `hover:scale-125 hover:-translate-y-2 hover:rotate-3` (25% scale up), which causes keyframe interruptibility jank and lacks active press states.

```css
/* src/app/globals.css:371 — current */
.chip-filter:hover {
  border-color: #3b82f6 !important;
  transform: scale(1.1);
  box-shadow: 0 8px 24px rgba(59, 130, 246, 0.4), 0 2px 8px rgba(0, 0, 0, 0.2);
}
```

```tsx
/* src/components/PlayerCascadeStack.tsx:57 — current */
className={`group relative h-14 w-14 sm:h-16 sm:w-16 shrink-0 rounded-full border-2 border-panel bg-zinc-900 shadow-xl transition-all duration-300 hover:scale-125 hover:z-30 hover:-translate-y-2 hover:rotate-3 cursor-pointer ring-2 ${p.ringColor}/50 hover:ring-blue-400`}
```

## Target

Refine hover scale to subtle values (`1.04` and `1.10`) and add tactile active press states (`scale(0.96)` and `active:scale-95`):

```css
/* src/app/globals.css — target */
.chip-filter {
  ...
  transition: transform var(--motion-fast) var(--ease-out),
    border-color var(--motion-fast) var(--ease-out),
    box-shadow var(--motion-fast) var(--ease-out);
}

.chip-filter:hover {
  border-color: #3b82f6 !important;
  transform: scale(1.04);
  box-shadow: 0 6px 18px rgba(59, 130, 246, 0.35), 0 2px 6px rgba(0, 0, 0, 0.2);
}

.chip-filter:active {
  transform: scale(0.96);
}

.chip-filter[aria-current="page"] {
  border-color: #2563eb !important;
  box-shadow: 0 0 0 3px #3b82f6, 0 6px 20px rgba(37, 99, 235, 0.45);
  transform: scale(1.03);
}
```

```tsx
/* src/components/PlayerCascadeStack.tsx — target */
className={`group relative h-14 w-14 sm:h-16 sm:w-16 shrink-0 rounded-full border-2 border-panel bg-zinc-900 shadow-xl transition-all duration-200 ease-out hover:scale-110 hover:z-30 hover:-translate-y-1 active:scale-95 cursor-pointer ring-2 ${p.ringColor}/50 hover:ring-blue-400`}
```

## Repo conventions to follow

- Utility classes use Tailwind v4.
- CSS transitions in `globals.css` use tokens like `var(--motion-fast) var(--ease-out)`.

## Steps

1. In `src/app/globals.css`, update `.chip-filter` transition properties to use `--ease-out`.
2. Update `.chip-filter:hover` scale from `1.1` to `1.04`, update `[aria-current="page"]` scale to `1.03`.
3. Add `.chip-filter:active { transform: scale(0.96); }`.
4. In `src/components/PlayerCascadeStack.tsx`, update avatar hover classes to `hover:scale-110 hover:-translate-y-1 active:scale-95`.

## Boundaries

- Do NOT change avatar images or border colors.
- Do NOT alter chip filter roundness (`border-radius: 50%`).

## Verification

- **Mechanical**: Run `npm run check`.
- **Feel check**: Hover over league filter chips and player avatars; verify text/icon crispness. Click down to confirm responsive press feedback (`scale(0.96)` and `scale-95`).
- **Done when**: Chip filters and player avatars scale smoothly without visual distortion or excessive jumpiness.
