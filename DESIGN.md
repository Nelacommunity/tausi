# Design System

## Color Palette

Current palette is dark-mode only, driven by Tailwind utility classes. No OKLCH tokens defined yet — colors are raw Tailwind grays and indigo.

| Role | Tailwind value | Approximate hex | Notes |
|---|---|---|---|
| Background | `gray-950` | `#030712` | App shell and landing |
| Surface | `gray-900/40–80` | `#111827` at varying opacity | Cards, modals |
| Border | `gray-800` / `gray-700` | `#1f2937` / `#374151` | Default / active |
| Text primary | `white` | `#ffffff` | Headings, active labels |
| Text secondary | `gray-300` / `gray-400` | `#d1d5db` / `#9ca3af` | Body, nav |
| Text muted | `gray-500` / `gray-600` | `#6b7280` / `#4b5563` | Descriptions, metadata |
| Accent primary | `indigo-600` | `#4f46e5` | Buttons, active states |
| Accent light | `indigo-400` | `#818cf8` | Icon tints, labels on dark |
| Accent secondary | `purple-600` | `#9333ea` | Gradient orbs only |
| Success / check | `emerald-400` | `#34d399` | Feature list checkmarks |
| Warning / upgrade | `amber-400` | `#fbbf24` | Premium CTA in sidebar |
| Error / sign out | `red-400` | `#f87171` | Destructive actions |

**Known issues to resolve:** gradient text in hero (`bg-clip-text`) and decorative orb blurs on the landing page are on-brand anti-patterns per PRODUCT.md. Both should be replaced in a future polish pass.

## Typography

| Role | Family | Weight | Notes |
|---|---|---|---|
| Body / UI | Geist Sans | 400, 500, 600, 700 | Via `next/font/google` in layout |
| Mono / code | Geist Mono | 400 | Editor and code blocks |
| Fallback | Arial, Helvetica, sans-serif | — | Declared in globals.css body rule |

Scale (inferred from usage):

| Label | Size | Weight |
|---|---|---|
| Display (hero) | `text-4xl`–`text-6xl` (2.25–3.75rem) | `font-extrabold` (800) |
| Section heading | `text-3xl`–`text-4xl` | `font-bold` (700) |
| Card heading | `text-base`–`text-lg` | `font-semibold` (600) |
| Body | `text-sm`–`text-base` (0.875–1rem) | `font-normal` (400) |
| Label / meta | `text-xs` (0.75rem) | 400–600 |
| Button | `text-sm` | `font-medium`–`font-semibold` |

## Spacing & Layout

- Max content width: `max-w-7xl` (80rem) for nav/footer, `max-w-4xl`–`max-w-6xl` for sections
- Section vertical padding: `py-20`–`py-24` (5–6rem)
- Section horizontal padding: `px-4` (mobile-first, `sm:px-6`)
- Card padding: `p-6`–`p-7`
- Card radius: `rounded-2xl` (1rem) — primary cards; `rounded-xl` (0.75rem) for buttons/inputs

## Components

### Header / Navigation

- **Top bar**: sticky, `z-30`, `bg-gray-950/90 backdrop-blur-sm`, `border-b border-gray-800`
- **Sidebar**: slide-in overlay from left, `w-72`, dark backdrop (`bg-black/60 backdrop-blur-sm`)
- **Active nav item**: `bg-indigo-950/60 text-indigo-300 border-l-2 border-indigo-500` — note: left-border pattern is a known anti-pattern (see PRODUCT.md anti-references)
- **Language toggle**: pill pair `EN | SW`, active state `bg-indigo-600 text-white`

### Buttons

| Variant | Classes | Usage |
|---|---|---|
| Primary | `bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold` | CTAs |
| Secondary | `border border-gray-700 hover:border-gray-500 text-gray-300 rounded-xl` | Secondary actions |
| Ghost | `hover:bg-gray-800 text-gray-400 hover:text-white rounded-lg` | Navigation actions |
| Destructive | `text-red-400 hover:bg-red-950/40` | Sign out |

### Cards

- Base: `rounded-2xl border border-gray-800 bg-gray-900/40`
- Hover: `hover:bg-gray-900/80 hover:border-gray-600 transition-all duration-300`
- Feature card icon container: `w-11 h-11 rounded-xl bg-{color}-950 border border-{color}-900`

### Form Inputs

Not yet inspected in depth — appear in auth pages and dashboard upload flows. Typically `bg-gray-900 border border-gray-700 rounded-xl text-white`.

### Step Badges

- `w-8 h-8 rounded-full bg-indigo-600/20 border border-indigo-600/40 text-indigo-400 text-sm font-bold`

## Motion

Minimal: `transition-colors`, `transition-all duration-200–300`, `hover:-translate-y-0.5` on primary CTAs. No entrance animations or scroll-triggered reveals yet. No `@media (prefers-reduced-motion)` declarations present.

## Shadows

- `shadow-lg shadow-indigo-600/30` on primary CTA buttons
- `shadow-2xl shadow-black/50` on sidebar panel

## Z-Index Scale

| Layer | Value |
|---|---|
| Sidebar overlay | `z-50` |
| Header | `z-30` |
| Landing nav | `z-20` |

## Known Design Debt

1. **Gradient text in hero** (`bg-clip-text`) — banned per design principles
2. **Uppercase tracked eyebrows on every landing section** — AI scaffold pattern to eliminate
3. **Left-border nav active indicator** (`border-l-2 border-indigo-500`) — side-stripe pattern to replace
4. **No scroll animation / entrance motion** — page feels static; intentional motion needed
5. **No OKLCH tokens** — all colors are raw Tailwind; token migration would improve consistency
6. **Orb blurs on landing hero** — decorative, close to the generic dark AI look in anti-references
7. **No empty states or error states** documented for app flows
