---
name: ui-ux-pro-max
description: "UI/UX design intelligence for uni-app (Vue 3) WeChat Mini Programs. Includes 50+ styles, color palettes, font pairings, product types with reasoning rules, UX guidelines, and chart types. Searchable BM25-based database with priority-based recommendations."
---

# UI/UX Pro Max — Design Intelligence for OA Mini Program

Comprehensive design guide for uni-app (Vue 3) WeChat Mini Program interfaces. Contains 50+ styles, color palettes, font pairings, product types with reasoning rules, 99+ UX guidelines, and chart types. Powered by a BM25 search engine over structured CSV data.

## Prerequisites

Python 3 is required to run the search tool:

```powershell
python --version
```

If not installed:

```powershell
winget install Python.Python.3.12
```

## Tools

The skill provides a CLI search tool at `.trae/skills/ui-ux-pro-max/scripts/search.py`:

### 1. Design System Generation (Recommended Start)

Generate a complete design system for a product type:

```bash
python .trae/skills/ui-ux-pro-max/scripts/search.py "<product_type> <keywords>" --design-system [-p "Project Name"] [-f markdown]
```

Options:
- `--design-system`, `-ds` — Generate comprehensive design system (searches 5 domains in parallel)
- `--project-name`, `-p` — Project name for output header
- `--format`, `-f` — Output format: `ascii` (default, terminal-friendly) or `markdown` (documentation)
- `--persist` — Save to `design-system/MASTER.md` (Master + Overrides pattern)
- `--page` — Create page-specific override file in `design-system/pages/`

### 2. Domain Search

Search specific UI/UX domains:

```bash
python .trae/skills/ui-ux-pro-max/scripts/search.py "<query>" --domain <domain> [-n <max_results>] [--json]
```

### 3. Stack Search

Search implementation-specific guidelines:

```bash
python .trae/skills/ui-ux-pro-max/scripts/search.py "<query>" --stack <stack> [-n <max_results>]
```

## Available Domains

| Domain | File | Search For | Example Keywords |
|--------|------|------------|-----------------|
| `product` | products.csv | Product type recommendations (161 types) | SaaS, dashboard, ecommerce, fintech, healthcare |
| `style` | styles.csv | UI styles, colors, effects (50+ styles) | glassmorphism, minimalism, dark mode, flat |
| `color` | colors.csv | Color palettes by product type | saas, ecommerce, healthcare, fintech |
| `typography` | typography.csv | Font pairings, mood recommendations | elegant, playful, professional, modern |
| `landing` | landing.csv | Page structure, CTA strategies | hero, testimonial, pricing, social-proof |
| `chart` | charts.csv | Chart types, library recommendations | trend, comparison, timeline, funnel, pie |
| `ux` | ux-guidelines.csv | UX best practices, anti-patterns (99+ rules) | animation, accessibility, z-index, loading |
| `icons` | icons.csv | Icon sets, import guidance | lucide, heroicons, SVG icons |
| `react` | react-performance.csv | React/Vue performance | waterfall, bundle, suspense, memo, rerender |
| `web` | web-interface.csv | Web/app interface a11y guidelines | aria, focus, semantic, virtualize, form |

## Available Stacks

| Stack | File | Focus |
|-------|------|-------|
| `html-tailwind` | stacks/html-tailwind.csv | Tailwind utilities, responsive, a11y (DEFAULT) |
| `vue` | stacks/vue.csv | Composition API, Pinia, Vue Router |
| `nuxtjs` | stacks/nuxtjs.csv | SSR, routing, modules |
| `nuxt-ui` | stacks/nuxt-ui.csv | Nuxt UI components, theming |
| `react` | stacks/react.csv | State, hooks, performance, patterns |
| `nextjs` | stacks/nextjs.csv | SSR, routing, images, API routes |
| `astro` | stacks/astro.csv | Astro islands, content collections |
| `svelte` | stacks/svelte.csv | Runes, stores, SvelteKit |
| `react-native` | stacks/react-native.csv | Components, Navigation, Lists |
| `flutter` | stacks/flutter.csv | Widgets, State, Layout, Theming |
| `swiftui` | stacks/swiftui.csv | Views, State, Navigation, Animation |
| `shadcn` | stacks/shadcn.csv | shadcn/ui components, theming, forms |
| `jetpack-compose` | stacks/jetpack-compose.csv | Composables, Modifiers, State Hoisting |

## How to Use This Skill

### When to Use

This skill should be used when the task involves UI structure, visual design decisions, interaction patterns, or user experience quality control:

- Designing new pages (Home, Approval, Report, Message, Task, Asset, etc.)
- Creating or refactoring UI components (cards, modals, forms, tables)
- Choosing color schemes, typography, spacing, or layout systems
- Reviewing UI code for UX, accessibility, or visual consistency
- Implementing navigation structures, animations, or responsive behavior
- Making design decisions (style, information hierarchy, brand expression)
- Improving perceived quality, clarity, or usability of interfaces

### Workflow

#### Step 1: Analyze Requirements

Extract from user request:
- **Product type**: OA app, approval system, dashboard, mini program
- **Style keywords**: professional, efficient, clean, modern, blue theme
- **Context**: WeChat Mini Program, uni-app (Vue 3), mobile-first
- **Design system**: Already defined — 高效蓝 (#2B6DE8) theme (see project docs)

#### Step 2: Generate Design System

```bash
python .trae/skills/ui-ux-pro-max/scripts/search.py "oa enterprise dashboard professional" --design-system -p "OA Mini Program"
```

#### Step 3: Supplement with Domain Searches

```bash
# Get style guidance for the specific component
python .trae/skills/ui-ux-pro-max/scripts/search.py "card approval status badge" --domain style

# Get UX best practices for mini program interactions
python .trae/skills/ui-ux-pro-max/scripts/search.py "mobile touch loading feedback" --domain ux

# Get color palette recommendations
python .trae/skills/ui-ux-pro-max/scripts/search.py "oa enterprise professional blue" --domain color
```

#### Step 4: Stack Guidelines (Vue)

```bash
# Get Vue-specific best practices for this project
python .trae/skills/ui-ux-pro-max/scripts/search.py "component composition performance" --stack vue
```

## Design System Architecture

The project already has a defined design system (高效蓝 #2B6DE8). Use the search tool to validate or supplement design decisions, not to override the established design tokens.

### Color System (from project design tokens)

| Token | Value | Usage |
|-------|-------|-------|
| `--color-primary` | `#2B6DE8` | Buttons, links, Tab active, selected states |
| `--color-primary-light` | `#5B8DF0` | Hover/press states, background emphasis |
| `--color-primary-dark` | `#1A4FC7` | Button press state, nav bar |
| `--color-primary-bg` | `#EDF2FF` | Tag background, selected row background |
| `--color-success` | `#22C55E` | Approved, completed |
| `--color-warning` | `#F59E0B` | Pending, awaiting review |
| `--color-danger` | `#EF4444` | Rejected, deleted, error |
| `--color-info` | `#6366F1` | Auxiliary info, link color |

### Typography (from project design tokens)

| Level | Size | Line Height | Weight | Usage |
|-------|------|-------------|--------|-------|
| XXL | 56rpx | 40px | 700 Bold | Page title, Logo |
| XL | 40rpx | 28px | 600 SemiBold | Module title |
| LG | 34rpx | 24px | 500 Medium | Card title |
| Base | 28rpx | 20px | 400 Regular | Body text |
| SM | 24rpx | 17px | 400 Regular | Auxiliary text |
| XS | 20rpx | 15px | 400 Regular | Small labels |

## Common Rules for Professional Mini Program UI

### Mobile-Specific Rules (WeChat Mini Program)

| Rule | Do | Don't |
|------|----|-------|
| **Touch targets** | Minimum 44x44pt for all interactive elements | Tiny icons without expanded hit area |
| **Safe areas** | Respect notch, status bar, home indicator | Content hidden behind system chrome |
| **Loading feedback** | Show skeleton/spinner for >300ms operations | Blank screen while loading |
| **Empty states** | Friendly illustration + guidance text | Blank list or "No data" only |
| **Error handling** | Clear error message + retry action | Generic error without recovery path |
| **Form feedback** | Inline validation on blur, errors near fields | Errors only at top, no field highlighting |
| **Navigation depth** | Max 4 levels deep (L1→L2→L3→L4) | Deep nesting without breadcrumb or back |
| **Page scroll** | Single scroll per page, no nested scroll | Multiple scroll areas in one view |
| **Fixed elements** | Reserve padding for fixed nav/bars | Content hidden behind fixed elements |

### Icons & Visual Elements

| Rule | Do | Don't |
|------|----|-------|
| **No emoji icons** | Use uni-ui icons or SVG icons | Use emojis like 🎨 ⚙️ as UI icons |
| **Consistent icon set** | Use uni-ui built-in icons | Mix different icon systems |
| **Icon sizing** | Consistent size via design tokens | Arbitrary sizes per screen |
| **Hover feedback** | Use opacity/color transitions | Scale transforms that shift layout |
| **Disabled states** | Reduced opacity + visual indication | Controls that look tappable but do nothing |

### Light Mode Contrast (Mini Program uses light mode)

| Rule | Do | Don't |
|------|----|-------|
| **Primary text** | `#1A1A2E` (opacity 0.9) on white | Gray text that blends into bg |
| **Secondary text** | `#4A4A6A` (opacity 0.5) minimum | Using tertiary colors for body text |
| **Muted text** | `#8E8EA0` (opacity 0.3) minimum | Gray-300 or lighter for readable text |
| **Card hierarchy** | Clear separation via shadow/border | Overly transparent cards |
| **Status colors** | Semantic + icon/text, not color alone | Red/green only for status indicators |

### Layout & Spacing

| Rule | Do | Don't |
|------|----|-------|
| **Safe-area padding** | `padding-bottom: env(safe-area-inset-bottom)` | Content under home indicator |
| **Page padding** | Consistent `--spacing-lg` (32rpx) gutters | Random left/right padding per page |
| **Card spacing** | `--spacing-md` (24rpx) internal padding | Crowded content without breathing room |
| **Section spacing** | `--spacing-xl` (48rpx) between sections | No vertical rhythm |
| **List density** | Comfortable row height for touch | Cramped list items |

### Accessibility

| Rule | Do | Don't |
|------|----|-------|
| **Color contrast** | Minimum 4.5:1 for normal text | Low contrast text on colored backgrounds |
| **Color meaning** | Add icon/text to color indicators | Color-only status (red/green) |
| **Button labels** | Descriptive aria-label or text | Icon-only buttons without labels |
| **Focus states** | Visible focus rings for keyboard nav | Removing all focus indicators |
| **Touch area** | Minimum 44x44px for all interactions | Small targets that require precision taps |

## Pre-Delivery Checklist

Before delivering any UI/UX work, verify:

### Visual Quality
- [ ] No emojis used as icons (use uni-ui/SVG icons)
- [ ] All icons from a consistent icon family
- [ ] Pressed/tap states don't shift layout
- [ ] Semantic theme tokens used consistently (no hardcoded hex)
- [ ] Status colors paired with icons/text (not color-only)

### Interaction
- [ ] All tappable elements provide visual feedback (opacity/color)
- [ ] Touch targets meet minimum 44x44pt size
- [ ] Loading states shown for operations >300ms
- [ ] Disabled states visually clear and non-interactive
- [ ] Toast/dialog auto-dismiss in appropriate time

### Layout
- [ ] Safe areas respected for headers, tab bars, bottom bars
- [ ] Scroll content not hidden behind fixed bars
- [ ] Verified on iPhone SE (375px) and iPhone 12 Pro (390px)
- [ ] Consistent horizontal gutters across pages
- [ ] No content clipped or overflowing

### Content & Empty States
- [ ] Empty lists show friendly illustration + guidance
- [ ] Error states show message + retry action
- [ ] Form fields have visible labels (not placeholder-only)
- [ ] Error messages appear below the relevant field
- [ ] Long text truncates with ellipsis where needed

### Performance
- [ ] Images use WebP format with lazy loading
- [ ] Lists paginated or virtualized (20+ items)
- [ ] Debounced search/input handlers
- [ ] No unnecessary re-renders
- [ ] `prefers-reduced-motion` respected for animations

## Example Workflow

**Scenario:** "Design the approval detail page approval card component"

### Step 1: Search for approval/status style patterns

```bash
python .trae/skills/ui-ux-pro-max/scripts/search.py "status badge approval review" --domain style -n 3
```

### Step 2: Get UX guidelines for mobile review flows

```bash
python .trae/skills/ui-ux-pro-max/scripts/search.py "mobile form review approval feedback" --domain ux -n 5
```

### Step 3: Check color palette for status indicators

```bash
python .trae/skills/ui-ux-pro-max/scripts/search.py "status pending approved rejected" --domain color -n 2
```

### Step 4: Get Vue component best practices

```bash
python .trae/skills/ui-ux-pro-max/scripts/search.py "component props event composition" --stack vue -n 3
```

### Step 5: Synthesize findings with project design system

Use the project's existing design tokens (`--color-primary`, `--color-success`, etc.) combined with search results to create the component.

## Tips for Better Results

1. **Be specific with keywords** — `"oa approval card status badge"` > `"card"`
2. **Combine with existing design system** — Search results supplement, not replace, project tokens
3. **Use --design-system first** for comprehensive recommendations, then deep-dive with --domain
4. **Always check UX domain** — Search `"mobile touch loading empty"` for mini program common issues
5. **Iterate** — If first search doesn't match, try different keywords
6. **Use --json for programmatic consumption** — Parse results in scripts or tools
