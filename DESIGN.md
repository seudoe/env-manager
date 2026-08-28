# Design System: Env Manager

## 1. Visual Theme & Atmosphere

A cockpit-dense developer tool with the restraint of a well-engineered CLI and the polish of a production SaaS. The atmosphere is calibrated dark — not dramatic, not moody — just precise. Think the Vercel dashboard at 2am: every pixel is load-bearing, negative space is earned, and color is strictly functional. No decorative flourishes. No gradients for aesthetics. Motion exists only to communicate state change, never to entertain.

- **Density:** 7/10 — high-information layouts with generous internal rhythm, not cramped
- **Variance:** 6/10 — structured asymmetry in marketing; symmetric discipline in the app shell
- **Motion:** 5/10 — instant transitions for nav, smooth reveals for data loading, no choreography

The tone is professional and unsentimental. This is a tool, not a product page.

---

## 2. Color Palette & Roles

### Canvas & Surfaces
- **Off-Black Canvas** (`#0c0c0e`) — Root background. Not pure black. Ink with a hint of warmth.
- **Elevated Surface** (`#131316`) — Sidebar, modals, cards. 1 step above canvas.
- **Raised Surface** (`#1a1a1f`) — Card backgrounds, input fields, code blocks.
- **Hover State** (`#202026`) — Interactive element hover background.
- **Active Surface** (`#26262e`) — Pressed/active state backgrounds.

### Borders
- **Hairline Border** (`rgba(255,255,255,0.06)`) — Subtle structural separators. 1px lines only.
- **Default Border** (`rgba(255,255,255,0.1)`) — Card outlines, input borders at rest.
- **Focus Border** (`rgba(255,255,255,0.2)`) — Input borders on hover.

### Text
- **Primary Text** (`#ededed`) — Headings, labels, primary content. Not pure white.
- **Secondary Text** (`#888891`) — Descriptions, subtitles, helper text.
- **Muted Text** (`#55555f`) — Timestamps, metadata, placeholders.
- **Inverse Text** (`#0c0c0e`) — Text on accent backgrounds.

### Accent — Single color. No gradients on buttons.
- **Cyan Accent** (`#00c2ff`) — Primary CTAs, active nav indicators, focus rings, links. Saturation: 72%.
  - Tint: `rgba(0,194,255,0.08)` — Active nav background, badge fills.
  - Border: `rgba(0,194,255,0.2)` — Active borders, focus rings.

### Semantic Colors
- **Success** (`#22c55e`) — Saved states, positive confirmations.
- **Warning** (`#f59e0b`) — Token expiry warnings, pending states.
- **Danger** (`#ef4444`) — Destructive actions, error states.
- **Info** (`#3b82f6`) — Viewer role badges, informational callouts.

---

## 3. Typography Rules

### Font Stack
- **Display & UI:** `Geist` — Weight-driven hierarchy. Track-tight at display sizes (`letter-spacing: -0.03em`). Regular tracking at body sizes. This is the primary font for all UI text, headings, labels, and navigation.
- **Code & Monospace:** `Geist Mono` — For `.env` file content, project IDs, tokens, timestamps, and all variable-width numeric data. Always monospace for anything that might change width dynamically.
- **Banned Fonts:** `Inter`, `Roboto`, `system-ui` as primary. No serif fonts anywhere in this tool.

### Scale & Hierarchy
- **Display (Landing h1):** 56px / weight 700 / tracking -0.04em / line-height 1.08
- **Page Title (h1 in app):** 24px / weight 600 / tracking -0.02em
- **Section Heading (h2):** 18px / weight 600 / tracking -0.01em
- **Card Title:** 14px / weight 600 / tracking 0
- **Body:** 14px / weight 400 / line-height 1.6 / max 65ch
- **Small / Labels:** 12px / weight 500
- **Micro / Timestamps:** 11px / Geist Mono / color: Muted Text
- **Code blocks:** 13px / Geist Mono / line-height 1.75

### Rules
- Hierarchy through weight and color only — no massive size jumps
- Numbers and IDs always use Geist Mono so they never reflow
- All dashboard text is sans-serif. No exceptions.

---

## 4. Component Stylings

### Buttons
- **Primary:** Solid Cyan Accent fill (`#00c2ff`), inverse text, `border-radius: 6px`, `padding: 8px 14px`, font-weight 500, font-size 13px. On `:active`: translate(-0, -1px), no outer glow. No gradient fills.
- **Secondary / Ghost:** Transparent background, Default Border, Primary Text. On hover: Raised Surface background.
- **Destructive:** Transparent background, Danger-colored border and text at rest. On hover: `rgba(239,68,68,0.1)` background fill.
- **Disabled:** 40% opacity, cursor not-allowed.
- **Loading state:** Replace label with a 14px inline spinner using `stroke-dasharray` animation on an SVG circle — not a generic spinner image.

### Cards / Project Items
- Background: Elevated Surface (`#131316`)
- Border: Default Border, `border-radius: 8px`
- On hover: border transitions to Focus Border, background to Hover State
- No box-shadow on cards. No elevation blur. Border-only differentiation.
- High-density table rows: replace cards with `border-top` dividers and negative space only.

### Inputs & Forms
- Background: Raised Surface
- Border: Default Border at rest → Focus Border on hover → Cyan Accent + `ring: rgba(0,194,255,0.15)` on focus
- `border-radius: 6px`, `padding: 8px 12px`, font-size 14px
- Label always above input, never floating
- Error text rendered below input in Danger color, font-size 12px
- No floating labels. No placeholder-as-label patterns.

### Navigation Sidebar
- Background: Elevated Surface, `border-right: 1px solid hairline border`
- Nav item at rest: transparent background, Secondary Text
- Nav item hover: Hover State background, Primary Text
- Nav item active: Cyan Tint background, Cyan Accent text, left border-left `2px solid cyan accent`
- User avatar: 28px circle, text initial fallback in Elevated Surface background
- Width: 220px fixed

### Project Sub-navigation (Tab Bar)
- Tab links arranged in a horizontal row, `border-bottom: 1px solid hairline border`
- Active tab: Cyan Accent text, `border-bottom: 2px solid cyan accent`, no background
- Inactive tab: Secondary Text, no border, hover → Primary Text

### .env Editor
- Full-width textarea, monospace Geist Mono font, 13px, line-height 1.75
- Background: Off-Black Canvas — same as root, so it recedes
- Border: Default Border, rounded 8px
- Focus: Cyan Accent border + ring
- Line numbers column optional but preferred for production implementation

### Badges / Roles
- `owner`: Cyan Tint background, Cyan Accent text, Cyan border
- `editor`: `rgba(34,197,94,0.08)` background, Success text, success border
- `viewer`: `rgba(59,130,246,0.08)` background, Info text, info border
- All badges: `border-radius: 4px`, `padding: 2px 6px`, font-size 11px, weight 500, uppercase tracking

### Modals
- Backdrop: `rgba(0,0,0,0.65)` with backdrop-blur(4px)
- Modal panel: Elevated Surface, border: Default Border, rounded 12px, max-width 440px
- Title: 16px / weight 600 / Primary Text
- Close button: top-right, Muted Text, hover → Primary Text

### Loading States
- Skeleton blocks matching exact layout dimensions using shimmer animation
- Shimmer gradient: `linear-gradient(90deg, #1a1a1f 25%, #202026 50%, #1a1a1f 75%)`
- No circular spinners outside of button loading states
- Dashboard project grid: 3 skeleton card blocks at full height

### Empty States
- Centered in content area, 80px vertical padding
- Icon in 48px Raised Surface rounded square, stroke-only SVG
- Title: 16px / weight 600
- Description: 14px / Secondary Text
- Primary action button below description

### Toast Notifications
- Fixed top-right, gap 8px between stacked toasts
- Same structure for all types: left-colored-bar (3px) + icon + message
- No gradient backgrounds. Solid Raised Surface background with left border accent.
- Slide in from right: `transform: translateX(calc(100% + 1rem))` → `translateX(0)`, 200ms ease-out
- Auto-dismiss: 4s, with a shrinking progress bar animation

---

## 5. Layout Principles

### App Shell
- Full-height flex layout: sidebar (220px fixed) + main content (flex-1)
- Main content scroll container, sidebar fixed/sticky
- Max content width: `1200px` centered within main — never full-bleed on wide screens
- Content padding: `32px` on desktop, `16px` on mobile

### Landing Page
- Left-aligned hero: headline left, sub-copy left, CTA left — not centered
- Headline max-width 640px, sub-copy max-width 500px
- Code preview block positioned to the right on desktop (2-column split)
- Feature section: 2-column zig-zag with alternating content sides. No 3 equal cards.
- How it works: horizontal numbered steps on desktop, stacked on mobile

### Responsive Collapse
- Below 768px: sidebar collapses behind hamburger overlay
- Below 768px: all multi-column layouts collapse to single column
- Below 768px: landing hero stacks vertically
- Touch targets: all interactive elements minimum 44px
- Horizontal overflow: zero tolerance — catastrophic failure

### Spacing System
- Base unit: 4px
- Common: `4, 8, 12, 16, 20, 24, 32, 48, 64`
- Section gaps use `clamp(3rem, 6vw, 5rem)` on landing
- Card internal padding: 16px–20px

### Grid
- CSS Grid for all multi-column layouts
- Project dashboard: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`, gap 16px
- No `calc()` percentage hacks, no flexbox math

---

## 6. Motion & Interaction

### Transitions
- All color/border transitions: 150ms linear
- Background hover fills: 150ms ease
- Modal entrance: scale(0.97) → scale(1) + opacity 0→1, 180ms ease-out
- Page fade-in: opacity 0→1 + translateY(8px→0), 200ms ease-out

### Loading Skeletons
- Shimmer animation: 1.4s linear infinite
- Stagger skeleton items 60ms apart in lists

### Rules
- Animate only `transform` and `opacity`. Never `width`, `height`, `top`, `left`.
- Spring physics reserved for drag interactions only — not general UI
- No perpetual background animations on dashboard (performance constraint in production tabs)
- No parallax, no scroll-triggered animations

---

## 7. Anti-Patterns (Banned)

- **No `Inter` font** — replace with Geist throughout
- **No AI Purple** — `#6c5ce7`, `#a855f7`, any purple hue is banned
- **No gradient fills on buttons** — flat accent color only
- **No outer glow / box-shadow glow** — `box-shadow: 0 0 20px rgba(108,92,231,0.3)` is banned
- **No pure black (`#000000`)** — use Off-Black Canvas `#0c0c0e`
- **No 3-column equal card layouts** — use 2-column zig-zag or asymmetric grid for features
- **No centered hero sections** — left-aligned only
- **No emojis** — not in UI text, not in error messages, not in empty states
- **No fabricated metrics** — no "99.9% uptime" or "124ms response" placeholder data
- **No AI copywriting clichés** — "Seamless", "Elevate", "Next-Gen", "Powerful" are banned
- **No floating/placeholder-as-label inputs** — label always above
- **No generic circular spinner** (except inside primary buttons at loading state)
- **No neon color accents** — cyan accent must stay below 80% saturation
- **No warm/cool gray mixing** — stick to zinc-family neutrals throughout
- **No broken image links** — use SVG initials or geometric placeholders, not Unsplash URLs
- **No `h-screen`** — use `min-h-[100dvh]` for full-height sections
- **No scroll indicators / bouncing chevrons** — content speaks for itself
