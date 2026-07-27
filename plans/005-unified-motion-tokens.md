# 005 — Introduce High-Craft Easing & Motion Tokens

- **Status**: DONE
- **Commit**: 929f5a4
- **Severity**: LOW
- **Category**: Cohesion & Tokens
- **Estimated scope**: 1 file (`src/app/globals.css`)

## Problem

In `src/app/globals.css:44-46`, the design system defines only a single generic easing variable: `--ease: cubic-bezier(0.2, 0, 0, 1);`. High-quality modern UI interfaces require distinct easing curves for entrances (`--ease-out`), movement across screen (`--ease-in-out`), and subtle spring-like feedback (`--ease-spring`).

```css
/* src/app/globals.css:44-46 — current */
--ease: cubic-bezier(0.2, 0, 0, 1);
--motion-fast: 140ms;
--motion-base: 200ms;
```

## Target

Expand `:root` motion tokens in `src/app/globals.css` with industry-standard high-craft cubic-bezier curves from AUDIT.md:

```css
/* src/app/globals.css — target */
--ease: cubic-bezier(0.2, 0, 0, 1);
--ease-out: cubic-bezier(0.23, 1, 0.32, 1);
--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
--motion-fast: 140ms;
--motion-base: 200ms;
--motion-slow: 300ms;
```

## Repo conventions to follow

- All CSS tokens live in `:root` in `src/app/globals.css`.

## Steps

1. Open `src/app/globals.css`.
2. Locate lines 44–46 in `:root`.
3. Add `--ease-out`, `--ease-in-out`, `--ease-spring`, and `--motion-slow`.
4. Expose these tokens if needed in `@theme inline`.

## Boundaries

- Do NOT break existing `--ease` variable usage.

## Verification

- **Mechanical**: Run `npm run check`.
- **Feel check**: Confirm CSS variables compile cleanly and can be consumed by component stylesheets and Tailwind inline classes.
- **Done when**: Unified motion tokens are declared and ready for consumption across the application.
