---
name: hiveref-styling
description: Use when creating or editing UI components, pages, or CSS. Enforces HiveRef dark theme palette, Tailwind v4, Shadcn UI conventions, and typography rules.
---

## Color Palette

| Token | Usage | Hex |
|-------|-------|-----|
| Background (primary) | Page background, sidebar | `#121214` |
| Background (secondary) | Cards, dropdowns, sections | `#1e1e24` |
| Background (header) | Top header bar | `#000000` |
| Accent / Border | Borders, indicators, active states | `#FACC15` (yellow) |
| CTA Primary | Buttons, main actions | `#F97316` (orange) |
| CTA Hover | Button hover, pressed states | `#EA580C` (dark orange) |
| Text Primary | Body text | `#f0f0f0` |
| Text Secondary | Labels, muted text | `#888890` |
| Text Muted | Placeholders, hints | `#444450` |

Apply these using inline `style` objects or Tailwind arbitrary values:

```tsx
// Preferred: inline style for precise palette control
<div style={{ background: "#121214", color: "#f0f0f0" }} />

// Tailwind arbitrary values
<div className="bg-[#121214] text-[#f0f0f0]" />
```

## CSS Architecture

Global styles are in `resources/css/app.css` using Tailwind v4's `@theme inline` directive:

```css
@import "tailwindcss";
@import "tw-animate-css";

@theme inline {
  --color-background: #121214;
  --color-foreground: #f0f0f0;
  --color-accent: #FACC15;
  --color-primary: #F97316;
  --color-primary-hover: #EA580C;
  --color-surface: #1e1e24;
  --color-header: #000000;
  --color-muted: #444450;
  --color-muted-foreground: #888890;
}
```

## Typography

- **UI text**: `Inter`, sans-serif (default, no need to specify)
- **Code/monospace labels**: `'JetBrains Mono', monospace` — use inline style:

```tsx
<span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.7rem" }}>
  status: active
</span>
```

Letter spacing for uppercase labels: `letterSpacing: "0.04em"` or `tracking-wide`.

## Components

### Shadcn UI primitives

Reusable UI components live in `resources/js/Components/ui/`:
- `button.tsx`, `card.tsx`, `badge.tsx`, `input.tsx`, `textarea.tsx`, `separator.tsx`

Use these when appropriate. Import from `@/Components/ui/`:

```tsx
import { Button } from '@/Components/ui/button';
import { Card } from '@/Components/ui/card';
import { Badge } from '@/Components/ui/badge';
```

### Layout components

- `AppLayout.tsx` — Root layout with `<Sidebar>` + `<Header>` + `<main>`
- `Sidebar.tsx` — Navigation (Dashboard, Projects, Review), hex logo, user footer, logout
- `Header.tsx` — Breadcrumbs, "Source Code" button, "Connect GitHub" button

Wrap pages with `AppLayout`:

```tsx
import AppLayout from '@/Components/AppLayout';

export default function Page(props) {
  return (
    <AppLayout>
      {/* page content */}
    </AppLayout>
  );
}
```

### Feature components

- `PromptHub.tsx` — Prompt input + model selector + repo selector + API key
- `SwarmBoard.tsx` — Filter tabs + AgentCard grid
- `AgentCard.tsx` — Status-colored task card with actions

## Visual patterns

- **Borders**: Use `rgba(250, 204, 21, 0.25)` for yellow accent borders
- **Hover**: `rgba(255, 255, 255, 0.04)` backgrounds, `transition-colors`
- **Dropdowns**: `#000000` background, yellow border, `boxShadow: "0 8px 24px rgba(0,0,0,0.6)"`
- **Status indicators**: Colored dots with `SubTaskStatus` mapping:
  - `pending` → `#444450`
  - `provisioning` / `in_progress` → `#FACC15` with pulse animation
  - `awaiting_review` → `#F97316`
  - `merged` → `#22c55e` (green)
  - `failed` / `paused` → `#ef4444` (red)

## Misc

- Icons: `lucide-react` (e.g., `Zap`, `Key`, `Lock`, `ChevronDown`, `Check`, `Github` as inline SVG)
- Use `flex` and `gap-*` for spacing over margin utilities
- No CSS modules — use inline styles or Tailwind arbitrary values
