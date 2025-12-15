# Klevr Design Requirements

> **Reference Document**: Design system and UI patterns for the Klevr application
> **Last Updated**: December 11, 2024
> **Status**: Based on Landing Page, Onboarding Flow, and Dashboard implementations

---

## 1. Color System

### Primary Colors

```css
--color-primary: #eeebd9 /* Cream/Beige - Main backgrounds */ --color-secondary: #282427
  /* Dark Charcoal - Text and UI elements */;
```

**Usage:**

- **Primary**: Used for all page backgrounds, creating the signature warm, professional feel
- **Secondary**: Primary text color, borders, and interactive elements

### Accent Colors

```css
--color-accent-orange: #ee7b30 /* Vibrant Orange - CTAs and highlights */
  --color-accent-teal: #2292a4 /* Professional Teal - Active states and completed items */;
```

**Usage:**

- **Accent Orange**:
  - Current step indicators in onboarding stepper
  - Brand name highlights ("Klevr" in headlines)
  - Hover states on primary CTAs
  - Feature card icon backgrounds and hover borders

- **Accent Teal**:
  - Active navigation items in sidebar
  - Completed step indicators
  - Links and interactive text
  - Avatar backgrounds
  - Badge backgrounds
  - Success states and confirmations

### Supporting Colors

```css
--color-success: #16a34a /* Green - Success states */ --color-warning: #f59e0b
  /* Amber - Warning states */ --color-error: #dc2626 /* Red - Error states */
  --color-muted: #f3f4f6 /* Light gray - Muted backgrounds */ --color-muted-foreground: #6b7280
  /* Medium gray - Muted text */;
```

### Opacity Variations

**Pattern**: Use Tailwind's opacity modifiers for subtle variations

```
/10  - 10% opacity - Very subtle backgrounds
/20  - 20% opacity - Subtle borders and dividers
/30  - 30% opacity - Secondary borders
/40  - 40% opacity - Disabled state backgrounds
/50  - 50% opacity - Hover overlays
/60  - 60% opacity - Muted interactive elements
/70  - 70% opacity - Secondary text
/80  - 80% opacity - Body text (most common)
/90  - 90% opacity - Near-full opacity hover states
```

**Common Combinations:**

- `bg-accent-teal/10 border border-accent-teal/20` - Badge backgrounds
- `text-secondary/80` - Standard body text
- `text-secondary/70` - Secondary/helper text
- `bg-white/95 backdrop-blur-sm` - Frosted glass effect on cards

---

## 2. Typography

### Font Families

```css
font-lora: 'Lora', serif         /* Headings and brand text */
font-sans: 'Open Sans', sans-serif  /* Body text and UI */
```

### Type Scale

```tsx
// Headings (use font-lora)
h1: text-5xl md:text-6xl font-bold     // 48-60px (mobile-desktop)
h2: text-4xl font-bold                  // 36px
h3: text-3xl font-bold                  // 30px
h4: text-2xl font-semibold             // 24px
h5: text-xl font-semibold              // 20px
h6: text-lg font-semibold              // 18px

// Body text (use font-sans)
xl: text-xl md:text-2xl                 // 20-24px
lg: text-lg                             // 18px
base: text-base                         // 16px (default)
sm: text-sm                             // 14px
xs: text-xs                             // 12px
```

### Font Weights

```
font-bold: 700       // Headings
font-semibold: 600   // Subheadings, labels
font-medium: 500     // Buttons, nav items
font-normal: 400     // Body text
```

### Text Colors

```tsx
// Primary text
text - secondary // Default heading color
text - secondary / 80 // Body text (most common)
text - secondary / 70 // Helper text, secondary info

// Accent text
text - accent - orange // Brand highlights
text - accent - teal // Links and active states

// Status text
text - success // Success messages
text - warning // Warning messages
text - error // Error messages

// Special cases
text - white // Text on colored backgrounds
text - primary // Text on dark backgrounds
```

### Line Height

```
leading-tight: 1.25          // Headings
leading-relaxed: 1.625       // Body text with breathing room
leading-normal: 1.5          // Default body text
```

---

## 3. Spacing & Layout

### Container Patterns

```tsx
// Page containers
<div className="min-h-screen bg-primary">                    // Full height pages
<div className="container max-w-2xl mx-auto">               // Narrow forms/content
<div className="max-w-4xl mx-auto">                         // Medium content width
<div className="mx-auto max-w-7xl">                         // Wide content (dashboard)

// Card spacing
p-6         // Small cards
p-8         // Medium cards
p-8 md:p-10 // Large cards with responsive padding
```

### Spacing Scale

```
px-4, py-2    // Tight (badges, small buttons)
px-6, py-3    // Comfortable (buttons, cards)
px-8, py-4    // Spacious (large buttons, sections)
px-4 sm:px-6 lg:px-8  // Responsive page padding

// Gaps
gap-2    // Tight element spacing
gap-4    // Standard button groups
gap-6    // Card grids
gap-8    // Section spacing
```

### Grid Patterns

```tsx
// Feature cards (landing page)
<div className="grid grid-cols-1 md:grid-cols-3 gap-6">

// Dashboard info grid
<div className="grid grid-cols-1 md:grid-cols-2 gap-6">

// Form fields
<div className="space-y-6">  // Vertical form spacing
```

---

## 4. Border Radius

### Standard Radii

```
rounded-full     // Pills (buttons, badges, avatars)
rounded-2xl      // Cards (16px)
rounded-xl       // Medium elements (12px) - buttons, nav items, feature icons
rounded-lg       // Small elements (8px)
rounded-input    // Form inputs (custom value)
```

### Usage Patterns

```tsx
// Cards
className = 'rounded-2xl'

// Buttons
className = 'rounded-full' // Always pill-shaped

// Navigation items
className = 'rounded-xl'

// Icon containers
className = 'rounded-xl'
```

---

## 5. Shadows & Effects

### Shadow Scale

```tsx
shadow - sm // Subtle elevation
shadow - card // Standard card shadow (custom: 0 8px 24px rgba(0,0,0,0.04))
shadow - md // Medium elevation
shadow - lg // High elevation (hover states)
shadow - xl // Maximum elevation
```

### Hover Effects

```tsx
// Card hover (landing page)
className =
  'transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-accent-teal/50'

// Button hover (CTA)
className = 'hover:shadow-lg transition-all duration-300'

// Navigation hover
className = 'hover:bg-primary/60 transition-colors'

// Icon container hover
className = 'transition-colors duration-300 group-hover:bg-accent-teal/20'
```

### Backdrop Blur (Frosted Glass)

```tsx
// Cards on gradient backgrounds
className = 'bg-white/95 backdrop-blur-sm'
```

---

## 6. Components

### 6.1 Buttons

**File**: `components/ui/button.tsx`

#### Variants

```tsx
// Primary CTA
<Button variant="cta" size="lg">
  Get Started Free
</Button>
// Styling: bg-secondary, text-primary, hover:bg-accent-orange

// Secondary CTA
<Button variant="cta-secondary" size="lg">
  Sign In
</Button>
// Styling: border-secondary, bg-transparent, hover:bg-primary

// Default
<Button variant="default">
  Submit
</Button>
// Styling: bg-secondary, text-primary

// Destructive
<Button variant="destructive">
  Delete
</Button>
// Styling: bg-error, text-white

// Outline
<Button variant="outline">
  Cancel
</Button>
// Styling: border-secondary, bg-transparent

// Ghost
<Button variant="ghost">
  Menu
</Button>
// Styling: bg-transparent, hover:bg-primary
```

#### Sizes

```tsx
size = 'sm' // h-9, px-4, text-sm
size = 'default' // h-10, px-6
size = 'lg' // h-12, px-8, text-base
size = 'icon' // h-10, w-10 (square)
```

#### States

```tsx
disabled:bg-secondary/40 disabled:text-primary  // Disabled state
focus-visible:ring-2 focus-visible:ring-accent-teal  // Focus ring
```

---

### 6.2 Cards

#### Standard Card

```tsx
<div className="bg-white rounded-2xl border border-secondary/10 shadow-card p-8">
  {/* Content */}
</div>
```

#### Frosted Glass Card (over gradient)

```tsx
<div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-card border border-secondary/10 p-8 md:p-10">
  {/* Content */}
</div>
```

#### Feature Card (landing page)

```tsx
<div className="bg-white backdrop-blur-sm rounded-2xl p-6 border border-secondary/10 shadow-card transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-accent-teal/50">
  <div className="h-12 w-12 rounded-xl bg-accent-teal/10 flex items-center justify-center mb-4">
    <Icon className="h-6 w-6 text-accent-teal" />
  </div>
  <h3 className="font-lora text-lg font-semibold text-secondary mb-2">Title</h3>
  <p className="text-secondary/80 text-sm leading-relaxed">Description</p>
</div>
```

#### Gradient Background Card (coming soon)

```tsx
<div className="relative overflow-hidden bg-gradient-to-br from-accent-teal/5 via-accent-orange/5 to-primary/20 rounded-2xl border border-secondary/10 shadow-card p-8">
  <div className="relative z-10">{/* Content */}</div>
  <div className="absolute top-0 right-0 w-64 h-64 bg-accent-orange/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
</div>
```

---

### 6.3 Badges

#### Standard Badge

```tsx
<div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent-teal/10 border border-accent-teal/20">
  <Icon className="h-4 w-4 text-accent-teal" />
  <span className="text-sm font-medium text-accent-teal">Label</span>
</div>
```

#### Status Badge (small)

```tsx
<div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent-teal/10 border border-accent-teal/20">
  <span className="text-xs font-semibold text-accent-teal uppercase tracking-wide">
    Coming Soon
  </span>
</div>
```

---

### 6.4 Navigation

#### Sidebar (Desktop)

**File**: `components/layout/sidebar.tsx`

```tsx
// Container
<div className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:border-r lg:border-secondary/10 lg:bg-white">

// Logo section
<div className="flex items-center flex-shrink-0 px-6 py-6 border-b border-secondary/10">
  <span className="font-lora text-2xl font-bold text-secondary">Klevr</span>
</div>

// Nav items
<Link
  href="/dashboard"
  className={cn(
    'flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors',
    isActive
      ? 'bg-accent-teal text-white'
      : 'text-secondary/70 hover:bg-primary/60 hover:text-secondary'
  )}
>
  <Icon className="h-5 w-5" />
  <span>Dashboard</span>
</Link>
```

#### Navbar (Top Bar)

**File**: `components/layout/navbar.tsx`

```tsx
<div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-secondary/10 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
  {/* Mobile menu button */}
  <button className="-m-2.5 p-2.5 text-secondary lg:hidden hover:bg-primary/60 rounded-lg transition-colors">
    <Menu className="h-6 w-6" />
  </button>

  {/* Avatar dropdown */}
  <Avatar className="h-10 w-10">
    <AvatarFallback className="bg-accent-teal text-white font-semibold">{initials}</AvatarFallback>
  </Avatar>
</div>
```

---

### 6.5 Onboarding Stepper

**File**: `components/onboarding/stepper.tsx`

```tsx
<div className="flex items-center justify-center gap-2">
  {/* Current step */}
  <div className="h-10 w-10 rounded-full flex items-center justify-center text-sm font-semibold bg-accent-orange text-white shadow-lg scale-110">
    1
  </div>

  {/* Connector line (completed) */}
  <div className="h-1 w-12 rounded-full bg-accent-teal"></div>

  {/* Completed step */}
  <div className="h-10 w-10 rounded-full flex items-center justify-center text-sm font-semibold bg-accent-teal text-white shadow-md">
    2
  </div>

  {/* Connector line (upcoming) */}
  <div className="h-1 w-12 rounded-full bg-secondary/20"></div>

  {/* Upcoming step */}
  <div className="h-10 w-10 rounded-full flex items-center justify-center text-sm font-semibold bg-white border-2 border-secondary/30 text-secondary">
    3
  </div>
</div>
```

**States:**

- **Current**: `bg-accent-orange text-white shadow-lg scale-110`
- **Completed**: `bg-accent-teal text-white shadow-md`
- **Upcoming**: `bg-white border-2 border-secondary/30 text-secondary`
- **Connector (completed)**: `bg-accent-teal`
- **Connector (upcoming)**: `bg-secondary/20`

---

### 6.6 Forms

#### Form Field Pattern

```tsx
<FormField
  control={form.control}
  name="field_name"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Label Text</FormLabel>
      <FormControl>
        <Input placeholder="Placeholder..." {...field} />
      </FormControl>
      <FormMessage /> {/* Error message */}
    </FormItem>
  )}
/>
```

#### Form Spacing

```tsx
// Form container
<form className="space-y-6">  // 24px between fields

// Button group
<div className="flex justify-end gap-4 pt-4">
  <Button variant="outline">Cancel</Button>
  <Button type="submit">Submit</Button>
</div>
```

#### Input Styling

**File**: `components/ui/input.tsx`

```tsx
<Input className="flex h-11 w-full rounded-xl border border-input bg-background px-4 py-2.5 text-base font-sans placeholder:text-secondary/60 focus-visible:border-accent-teal focus-visible:ring-2 focus-visible:ring-accent-teal/20" />
```

---

### 6.7 Status Indicators

#### Icon + Text Pattern

```tsx
// Success
<div className="flex items-center gap-2">
  <div className="h-2 w-2 rounded-full bg-success"></div>
  <span className="text-sm text-success font-medium">Confirmed and ready</span>
</div>

// Warning
<div className="flex items-center gap-2">
  <div className="h-2 w-2 rounded-full bg-warning"></div>
  <span className="text-sm text-warning font-medium">Not confirmed</span>
</div>

// Error
<div className="flex items-center gap-2">
  <div className="h-2 w-2 rounded-full bg-error"></div>
  <span className="text-sm text-error font-medium">Failed</span>
</div>
```

---

## 7. Layout Patterns

### 7.1 Landing Page Layout

```tsx
<div className="min-h-screen bg-gradient-to-br from-primary via-primary/80 to-primary">
  <main className="flex min-h-screen flex-col items-center justify-center px-6 py-24">
    <div className="max-w-4xl text-center">{/* Centered content */}</div>
  </main>
</div>
```

**Key Features:**

- Full-screen centered layout
- Gradient background (3-stop)
- Responsive padding (`px-6 py-24`)
- Max-width container (`max-w-4xl`)

---

### 7.2 Onboarding Layout

```tsx
<div className="min-h-screen bg-gradient-to-br from-primary via-primary/80 to-primary/90">
  <div className="min-h-screen py-12 px-6">
    <div className="container max-w-2xl mx-auto">
      {/* Logo */}
      <div className="text-center mb-8">
        <h2 className="font-lora text-3xl font-bold text-secondary">Klevr</h2>
      </div>

      {/* Stepper */}
      <OnboardingStepper currentStep={1} totalSteps={4} />

      {/* Form Card */}
      <div className="mt-8 bg-white/95 backdrop-blur-sm rounded-2xl shadow-card border border-secondary/10 p-8 md:p-10">
        {/* Form content */}
      </div>
    </div>
  </div>
</div>
```

**Key Features:**

- Gradient background (3-stop, slightly darker)
- Narrow container (`max-w-2xl`)
- Centered logo above stepper
- Frosted glass card for form

---

### 7.3 Dashboard Layout (Main App)

```tsx
<div className="min-h-screen bg-primary">
  <Sidebar />
  <div className="lg:pl-64">
    <Navbar />
    <main className="py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">{/* Page content */}</div>
    </main>
  </div>
</div>
```

**Key Features:**

- Solid primary background (no gradient)
- Fixed sidebar (desktop only, 256px wide)
- Sticky navbar at top
- Wide content container (`max-w-7xl`)
- Responsive padding

---

### 7.4 Page Header Pattern

```tsx
<div className="mb-8">
  <h1 className="font-lora text-4xl font-bold text-secondary mb-2">Welcome back, {firstName}!</h1>
  <p className="text-secondary/80">Here's your application overview</p>
</div>
```

---

### 7.5 Section with Header & Action

```tsx
<div className="bg-white rounded-2xl border border-secondary/10 shadow-card p-8 mb-6">
  <div className="flex items-start justify-between mb-6">
    <div>
      <h2 className="font-lora text-2xl font-semibold text-secondary mb-1">Your Profile</h2>
      <p className="text-sm text-secondary/70">Keep your information up to date</p>
    </div>
    <a
      href="/profile"
      className="text-sm font-medium text-accent-teal hover:text-accent-teal/80 transition-colors"
    >
      Edit Profile →
    </a>
  </div>

  {/* Section content */}
</div>
```

---

## 8. Animations & Transitions

### Transition Classes

```tsx
// Standard transitions
transition-colors              // Color changes
transition-all duration-300    // Multiple properties
transition-transform           // Scale, translate

// Common durations
duration-200    // Fast (hover feedback)
duration-300    // Standard (most animations)
duration-500    // Slow (smooth emphasis)
```

### Hover Animations

```tsx
// Card hover (lift + shadow)
hover:shadow-xl hover:-translate-y-1

// Scale on hover
hover:scale-[1.02]

// Border color shift
hover:border-accent-teal/50

// Background fade
hover:bg-primary/60
```

### Loading States

```tsx
<Loader2 className="h-8 w-8 animate-spin text-accent-teal" />
```

---

## 9. Icons

**Library**: Lucide React

### Icon Sizing

```tsx
h-4 w-4    // Small icons (badges, inline)
h-5 w-5    // Medium icons (nav items, buttons)
h-6 w-6    // Large icons (feature cards)
h-8 w-8    // Extra large (loading spinners)
h-12 w-12  // Icon containers
```

### Icon Containers (Feature Cards)

```tsx
<div className="h-12 w-12 rounded-xl bg-accent-teal/10 flex items-center justify-center mb-4 transition-colors duration-300">
  <Target className="h-6 w-6 text-accent-teal" />
</div>
```

---

## 10. Responsive Design

### Breakpoints

```
sm: 640px   // Small tablets
md: 768px   // Tablets
lg: 1024px  // Desktops
xl: 1280px  // Large desktops
```

### Common Patterns

```tsx
// Text sizing
text-5xl md:text-6xl

// Grid columns
grid-cols-1 md:grid-cols-3

// Padding
px-4 sm:px-6 lg:px-8
p-8 md:p-10

// Show/hide elements
hidden lg:flex          // Show on desktop only
lg:hidden               // Hide on desktop

// Sidebar offset
lg:pl-64                // Account for fixed sidebar
```

---

## 11. Accessibility

### Focus States

```tsx
// Always include focus-visible for keyboard navigation
focus-visible:outline-none
focus-visible:ring-2
focus-visible:ring-accent-teal
focus-visible:ring-offset-2
```

### Screen Reader Text

```tsx
<span className="sr-only">Open sidebar</span>
```

### ARIA Attributes

```tsx
aria-hidden="true"      // Decorative icons
aria-label="Description" // Button descriptions
```

---

## 12. Best Practices

### Do's ✅

1. **Always use semantic color names** from the theme (never hardcode hex values)
2. **Use opacity modifiers** for subtle variations (`/10`, `/20`, `/80`)
3. **Apply rounded-full to all buttons** (pill shape is signature)
4. **Use font-lora for headings**, font-sans for body text
5. **Include transitions** on interactive elements (`transition-colors`, `transition-all`)
6. **Use frosted glass effect** (`bg-white/95 backdrop-blur-sm`) on cards over gradients
7. **Add hover effects** to interactive elements (shadow, transform, border color)
8. **Maintain consistent spacing** using Tailwind's scale (4, 6, 8, etc.)
9. **Use max-width containers** to prevent content from being too wide
10. **Include loading states** with spinning Loader2 icon in accent-teal

### Don'ts ❌

1. **Never use pure black** (`#000`) or pure white (`#fff`) - use theme colors
2. **Don't use gray-\* Tailwind classes** - use `secondary/*` instead
3. **Don't hardcode hex colors** in className strings
4. **Avoid square buttons** - always use `rounded-full`
5. **Don't skip hover states** on interactive elements
6. **Don't use inconsistent border radii** - stick to standard scale
7. **Don't mix font families** incorrectly (Lora for headings only)
8. **Don't forget responsive variants** for padding, text size, grids
9. **Don't use heavy shadows by default** - reserve for hover states
10. **Don't skip focus-visible styles** for accessibility

---

## 13. Quick Reference Cheat Sheet

### Page Structure

```tsx
// Landing
bg-gradient-to-br from-primary via-primary/80 to-primary

// Onboarding
bg-gradient-to-br from-primary via-primary/80 to-primary/90

// Dashboard
bg-primary
```

### Card Variations

```tsx
// Standard
bg-white rounded-2xl border border-secondary/10 shadow-card p-8

// Frosted glass
bg-white/95 backdrop-blur-sm rounded-2xl shadow-card border border-secondary/10 p-8

// Gradient background
bg-gradient-to-br from-accent-teal/5 via-accent-orange/5 to-primary/20
```

### Button Quick Picks

```tsx
<Button variant="cta" size="lg">       // Primary CTA
<Button variant="cta-secondary" size="lg">  // Secondary CTA
<Button variant="default">              // Standard action
<Button variant="outline">              // Cancel/Back
<Button variant="ghost">                // Subtle action
```

### Text Hierarchy

```tsx
// Page title
<h1 className="font-lora text-4xl font-bold text-secondary mb-2">

// Section title
<h2 className="font-lora text-2xl font-semibold text-secondary mb-1">

// Card title
<h3 className="font-lora text-lg font-semibold text-secondary mb-2">

// Body text
<p className="text-secondary/80">

// Helper text
<p className="text-sm text-secondary/70">
```

---

## 14. Component Checklist

When creating a new component, ensure it includes:

- [ ] Proper color usage (no hardcoded colors)
- [ ] Appropriate border radius from the scale
- [ ] Hover states with transitions
- [ ] Focus-visible styles for keyboard navigation
- [ ] Responsive variants where needed
- [ ] Consistent spacing using the scale
- [ ] Proper typography (Lora for headings, Open Sans for body)
- [ ] Shadow elevation appropriate for context
- [ ] Loading states where applicable
- [ ] Disabled states with proper opacity

---

**End of Design Requirements Document**
