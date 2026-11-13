---
name: SmartCard BUS
colors:
  surface: '#faf8ff'
  surface-dim: '#d2d9f4'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3ff'
  surface-container: '#eaedff'
  surface-container-high: '#e2e7ff'
  surface-container-highest: '#dae2fd'
  on-surface: '#131b2e'
  on-surface-variant: '#434656'
  inverse-surface: '#283044'
  inverse-on-surface: '#eef0ff'
  outline: '#737688'
  outline-variant: '#c3c5d9'
  surface-tint: '#004bee'
  primary: '#003ec8'
  on-primary: '#ffffff'
  primary-container: '#0d53fc'
  on-primary-container: '#e0e3ff'
  inverse-primary: '#b7c4ff'
  secondary: '#006c4a'
  on-secondary: '#ffffff'
  secondary-container: '#82f5c1'
  on-secondary-container: '#00714e'
  tertiary: '#6f4500'
  on-tertiary: '#ffffff'
  tertiary-container: '#905a00'
  on-tertiary-container: '#ffdfbe'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dde1ff'
  primary-fixed-dim: '#b7c4ff'
  on-primary-fixed: '#001452'
  on-primary-fixed-variant: '#0038b7'
  secondary-fixed: '#85f8c4'
  secondary-fixed-dim: '#68dba9'
  on-secondary-fixed: '#002114'
  on-secondary-fixed-variant: '#005137'
  tertiary-fixed: '#ffddb8'
  tertiary-fixed-dim: '#ffb95f'
  on-tertiary-fixed: '#2a1700'
  on-tertiary-fixed-variant: '#653e00'
  background: '#faf8ff'
  on-background: '#131b2e'
  surface-variant: '#dae2fd'
typography:
  display:
    fontFamily: Plus Jakarta Sans
    fontSize: 40px
    fontWeight: '800'
    lineHeight: 48px
    letterSpacing: -0.03em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 34px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  title-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 24px
    letterSpacing: 0em
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0em
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '700'
    lineHeight: 20px
    letterSpacing: 0.02em
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.04em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 10px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.06em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-tablet: 1.5rem
  gutter-desktop: 2rem
  margin: 1rem
  margin-tablet: 2rem
  margin-desktop: 3rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style
The design system embodies modern urban mobility: energetic, radically dependable, and friction-free. Designed for commuters navigating bustling terminals, crowded buses, and quick ticket gates, the visual language merges utilitarian clarity with a vibrant, welcoming civic spirit. 

The aesthetic aligns with **Modern Tactile & Fluid Functionalism**—leveraging expansive rounded corners, clear contrast hierarchies, tactile tap targets, and crisp micro-surfaces. The emotional response is immediate reassurance, velocity, and ease: transactions feel instantaneous, balances are unmistakable at a glance, and navigation requires zero cognitive friction under bright sunlight or during chaotic peak-hour transits.

## Colors
The palette pairs a high-velocity electric cobalt blue with an authoritative emerald mint:

- **Primary (`#0D53FC`)**: Anchors public transit authority, primary interactions, active route states, and virtual card shells. Communicates electric momentum and institutional trust.
- **Secondary (`#059669`)**: Dedicated to financial confidence—wallet balances, successful validation pings, NFC tap-to-pay confirmations, and fare savings.
- **Tertiary (`#F59E0B`)**: Expresses time-critical alerts, route delays, line transfers, and expiring recurring passes.
- **Neutral (`#0F172A`)**: Deep slate for high-legibility typographic hierarchy against ultra-clean, layered neutral surfaces (`#F8FAFC`, `#F1F5F9`, `#FFFFFF`).

Surfaces favor luminous, anti-glare off-whites to ensure outdoor readability on mobile screens. Semantic tokens enforce strict separation: blue handles navigation and movement, while green solely certifies positive status and monetary value.

## Typography
Plus Jakarta Sans provides the core geometric foundation: open apertures, distinct x-height, and a contemporary, humanized technical feel. 

- **Display & Headlines**: Bold, tight-tracked letterforms built for rapid glanceability at bus stops, turnstiles, and quick status views.
- **Numbers & Monetary Values**: Numerals leverage tabular figure alignments (`tnum`) across card balances, platform numbers, and countdown arrivals to eliminate jitter during real-time updates.
- **Micro-labels**: High-contrast uppercase treatments at small scales (`label-sm`, `label-md`) guarantee legal clarity for route codes, terminal gates, and transit pass serial IDs.

## Layout & Spacing
A fluid 4-column layout dictates mobile interfaces, expanding to 8 columns on tablet devices and 12 columns on desktop portals.

- **Mobile Rhythm**: Primary safe margins start at `1rem` (16px) to maximize screen real estate on mobile devices while maintaining an accessible thumb reach zone. Interactive elements sit firmly within bottom sheets or sticky bottom-bar action zones.
- **Density & Component Spacing**: Fast-paced usage demands generous vertical tap targets (minimum 48px height for all actionables), paired with compact horizontal rhythm (`space-sm` for inline badges, `space-md` for standard list card gaps).
- **Responsive Adaptations**: Handheld experiences rely heavily on stacked card streams and swipeable horizontal carousels (pass wallets, nearby stations). On wider viewports, interfaces cleanly divide into an interactive map viewport and a fixed-width contextual management rail.

## Elevation & Depth
Depth is rendered through crisp, tinted ambient shadows and soft layered surfaces rather than aggressive skeuomorphism:

- **Level 0 (Base Canvas)**: Neutral tint (`#F8FAFC`), entirely flat.
- **Level 1 (Cards, Station Rows)**: Pure white (`#FFFFFF`) with a delicate perimeter ring: `0 1px 3px 0 rgba(15, 23, 42, 0.05)`, edged with a subtle `1px solid rgba(226, 232, 240, 0.8)`.
- **Level 2 (Transit Pass Cards, Active Tickets)**: Floating depth using directional ambient cobalt or emerald tinting: `0 8px 24px -4px rgba(13, 83, 252, 0.15)`.
- **Level 3 (Modal Bottom Sheets, QR Gates, Floating Fast-Action Bar)**: `0 20px 32px -8px rgba(15, 23, 42, 0.12)`, framing the active commute tools above maps and route feeds.
- **Glass Overlays**: Semi-transparent navigation bars and map chips use `backdrop-filter: blur(12px)` over a 85% opacity surface to maintain situational context without obscuring transit lines.

## Shapes
The shape system uses dynamic rounded geometry:

- **Base Radius (`0.5rem` / 8px)**: Used for small chips, input fields, and route pill indicators.
- **Large Radius (`rounded-lg` - `1rem` / 16px)**: Applied to secondary cards, quick-action tiles, and alert callouts.
- **Extra-Large & Expressive Surfaces (`rounded-2xl` - `1.5rem` to `rounded-3xl` - `2rem`)**: Signature shapes for physical/digital bus cards, bottom sheets, balance overview modules, and ticket QR containers.
- **Pills (`full-rounded`)**: Standard for operational statuses ("Em Trânsito", "Validado"), line numbers, and primary floating action buttons.

## Components

### 1. Buttons
- **Primary Action (Top-Up / Pay)**: Solid `#0D53FC`, white bold text, 52px height, full-width on mobile with `rounded-2xl` corners. Includes subtle active scale down (`0.98`) for tactile feedback.
- **Success / Validation (Catraca Liberada / QR Pass)**: Solid `#059669` with icon pre-pended, optimized for rapid recognition by turnstile readers and gate agents.
- **Secondary / Ghost**: Pure white background, `border: 1.5px solid #E2E8F0`, slate text (`#0F172A`), providing low-friction alternative flows like "Ver Rotas" or "Extrato".

### 2. Transport Passes & Virtual Cards
- Aspect ratio conforming to ID-1 card standards (approx 1.58:1) featuring deep electric blue gradients, metallic NFC indicators, real-time balance displays in large bold type, and dynamic carrier logos.
- Equipped with a perforated edge visual metaphor when displayed as single-use or integrated QR validation tickets.

### 3. Quick-Access Chips & Route Pills
- Route badges render with high-contrast colored pills (e.g., Line "512 - Circular Centro") using solid background accents paired with bold, condensed typography.
- Filter chips toggle between an outline state (`border-slate-200`) and an active filled state (`#0D53FC` tint with 10% opacity and primary blue borders).

### 4. Lists & Station Sequences
- Station timeline nodes feature a connected vertical transit line (`3px` solid stroke in primary blue or transfer accent colors).
- Real-time arrival rows feature arrival countdowns ("2 min", "Chegando") highlighted in green badge tags alongside live crowdedness iconography (low, medium, high occupancy).

### 5. Input Fields & Quick-Value Keypads
- Top-up inputs feature large denomination quick-select buttons (+R$10, +R$20, +R$50) with active states highlighted in emerald green outlines.
- Input boxes use an enclosed modern structure with `1.5rem` padding, subtle slate borders, clear labels, and auto-clearing touch targets.

### 6. Interactive Ticket Gate (QR Code Presentation)
- High-contrast white modal container that automatically forces device screen brightness to maximum on presentation.
- Features dynamic security animations (pulsing secondary emerald border, rotating micro-timestamp) to prevent static screenshot fraud.