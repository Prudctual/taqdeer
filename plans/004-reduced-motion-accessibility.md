# 004 — Wrap Continuous Keyframe Animations in Reduced-Motion Queries

- **Status**: DONE
- **Commit**: 929f5a4
- **Severity**: MEDIUM
- **Category**: Accessibility
- **Estimated scope**: 1 file (`src/components/PlayerCascadeStack.tsx`)

## Problem

In `src/components/PlayerCascadeStack.tsx:61,76-84`, the floating player avatars execute continuous keyframe animation (`@keyframes floatSlow 4s ease-in-out infinite`) without wrapping the animation in `@media (prefers-reduced-motion: no-preference)`. Users with vestibular motion sensitivities continue to experience perpetual floating movements.

```tsx
/* src/components/PlayerCascadeStack.tsx:75-84 — current */
<style jsx global>{`
  @keyframes floatSlow {
    0%, 100% {
      transform: translateY(0px);
    }
    50% {
      transform: translateY(-6px);
    }
  }
`}</style>
```

## Target

Wrap the floating animation application in a `@media (prefers-reduced-motion: no-preference)` block:

```tsx
/* src/components/PlayerCascadeStack.tsx — target */
<style jsx global>{`
  @media (prefers-reduced-motion: no-preference) {
    @keyframes floatSlow {
      0%, 100% {
        transform: translateY(0px);
      }
      50% {
        transform: translateY(-6px);
      }
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .player-avatar-float {
      animation: none !important;
    }
  }
`}</style>
```

## Repo conventions to follow

- Accessibility rules follow `globals.css:543-550` (`@media (prefers-reduced-motion: reduce)` disables unnecessary motion).

## Steps

1. Open `src/components/PlayerCascadeStack.tsx`.
2. Locate the style block around lines 75–85.
3. Wrap `@keyframes floatSlow` and its container application in `@media (prefers-reduced-motion: no-preference)`.
4. Ensure `prefers-reduced-motion: reduce` stops perpetual floating while preserving layout positioning.

## Boundaries

- Do NOT alter player avatar photo URLs, ring colors, or stack layout order.

## Verification

- **Mechanical**: Run `npm run check`.
- **Feel check**: Open browser DevTools, switch `prefers-reduced-motion` to `reduce` under Rendering tab; verify player avatars stay stationary without constant vertical floating.
- **Done when**: Continuous keyframe floating honors system reduced motion preferences.
