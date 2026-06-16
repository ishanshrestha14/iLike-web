# iLike — Design System (MASTER)

Single source of truth for Phase 2.5. Page-specific deviations go in
`design-system/pages/<page>.md` and override this file.

## Brand

Rose → Coral → Orange. Warm, romantic, energetic (consumer dating).
Typography: **Bricolage Grotesque** (display/headings) + **Inter** (body/UI).

## Color tokens

Defined as HSL triplets in `src/index.css` (`:root` light, `.dark` dark) and
exposed through Tailwind in `tailwind.config.js`. Always use the semantic
Tailwind classes — never hardcode hex/`pink-500`.

| Token | Tailwind | Light | Role |
|-------|----------|-------|------|
| `--primary` | `bg-primary` `text-primary` | rose `#E11D48` | brand / primary actions |
| `--brand` | `text-brand` | rose `#E11D48` | brand accents |
| `--coral` | `text-coral` | `#FB7185` | gradient mid |
| `--cta` | `text-cta` | orange `#F97316` | gradient end / CTA |
| `--like` | `text-like` | emerald `#10B981` | swipe LIKE |
| `--nope` | `text-nope` | `#F43F5E` | swipe NOPE |
| `--super` | `text-super` | blue `#3B82F6` | SUPER LIKE |
| `--muted-foreground` | `text-muted-foreground` | slate | secondary text |

Gradient: `bg-gradient-brand` / `text-gradient-brand` (rose→coral→orange).

## Typography

- Headings: `font-display` (Bricolage Grotesque, 500/600/700), tight tracking.
- Body/UI: `font-sans` (Inter, 400–700). `.nums-tabular` for ages/counts/timers.
- Min body size 16px on mobile; line-height 1.5–1.75.

## Radius & elevation

- `--radius: 0.75rem`; Tailwind `rounded-{sm,md,lg,xl,2xl,3xl}`.
- Shadows: `shadow-{sm,md,lg,xl}` + `shadow-brand` (rose glow). Use elevation,
  not borders, to signal depth on cards/overlays.

## Motion

- CSS tokens: `--duration-{fast,base,slow}` (150/250/400ms),
  `--ease-{out,in-out,spring}`.
- Framer Motion presets in `src/lib/motion.ts`: `springSnappy`, `springSoft`,
  `easeOut`, `easeFast`; variants `fade`, `fadeInUp`, `scaleIn`, `popIn`,
  `staggerContainer`; `withReducedMotion()` helper.
- Micro-interactions 150–300ms; animate `transform`/`opacity` only.
- Always respect `prefers-reduced-motion` (global CSS fallback + per-component).

## Z-index scale

`z-dropdown(1000) < sticky(1020) < header(1030) < overlay(1040) < modal(1050) < popover(1060) < toast(1070)`.

## Theme

Class-based (`.dark` on `<html>`) via `src/components/theme-provider.tsx`
(`useTheme`) + `theme-toggle.tsx`. Persists to `localStorage["ilike-theme"]`,
follows OS when `system`.

## Primitives

- `components/ui/button.tsx` — variants: `default` (primary), `brand`
  (gradient), `secondary`, `outline`, `ghost`, `destructive`, `link`; sizes
  `default/sm/lg/icon/icon-lg`. Reference for token usage.
- More primitives (Input, Card, Badge, Avatar, Sheet, Toast) added incrementally
  as features are overhauled.

## Rules (enforced)

- No emojis as icons → use `lucide-react`.
- `cursor-pointer` + visible focus ring on all interactive elements.
- Light-mode body text contrast ≥ 4.5:1.
- Responsive at 375 / 768 / 1024 / 1440; no horizontal scroll on mobile.
- Touch targets ≥ 44×44px.
