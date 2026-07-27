# Taqdeer Animation Improvement Plans

This directory contains self-contained, prioritized execution plans for improving animation, performance, physical feel, and accessibility across the **Taqdeer (توقّع)** codebase.

## Plan Summary

| Plan | Title | Severity | Category | Status |
| --- | --- | --- | --- | --- |
| [001](001-match-row-transition-perf.md) | Match Row Transition Performance & Press Feedback | HIGH | Performance | DONE |
| [002](002-subtle-hover-press-scale.md) | Refine Oversized Hover Transforms & Add Active Press Feedback | HIGH | Physicality | DONE |
| [003](003-match-filter-transitions.md) | Optimize Match Filter Search & Pill Button Transitions | MEDIUM | Performance & Easing | DONE |
| [004](004-reduced-motion-accessibility.md) | Wrap Continuous Keyframe Animations in Reduced-Motion Queries | MEDIUM | Accessibility | DONE |
| [005](005-unified-motion-tokens.md) | Introduce High-Craft Easing & Motion Tokens | LOW | Cohesion & Tokens | DONE |

## Recommended Execution Order

1. **005-unified-motion-tokens.md**: Establish foundational motion tokens in `src/app/globals.css`.
2. **001-match-row-transition-perf.md**: Fix high-traffic `.match-row` transition performance and add press feedback using the new tokens.
3. **002-subtle-hover-press-scale.md**: Refine hover scales and press feedback on `.chip-filter` and `PlayerCascadeStack`.
4. **003-match-filter-transitions.md**: Optimize match filter input and tab transitions.
5. **004-reduced-motion-accessibility.md**: Add reduced-motion accessibility overrides for floating animations.

## Dependencies

- Plan 001, 002, 003 consume tokens introduced in Plan 005.
