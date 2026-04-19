# Aura Tax & Living Calculator Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a premium, dashboard-style Tax and Cost of Living Calculator that provides a "Aura" score for financial health.

**Architecture:** A React SPA using a modular component architecture. State managed via React Hooks. Design follows a "Glassmorphism" aesthetic with vibrant gradients and smooth transitions.

**Tech Stack:** Vite, React, TypeScript, Tailwind CSS, Shadcn UI, Lucide React, Recharts.

---

### Task 1: Initialize Project
**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`
- Create: `src/main.tsx`, `src/App.tsx`, `src/index.css`

**Step 1: Run Vite initialization**
Run: `npm create vite@latest ./ -- --template react-ts`
Expected: Project files generated in the current directory.

**Step 2: Install core dependencies**
Run: `npm install -D tailwindcss postcss autoprefixer && npx tailwindcss init -p`
Expected: `tailwind.config.js` and `postcss.config.js` created.

**Step 3: Setup Tailwind Config**
Modify `tailwind.config.js` to include the standard paths.

**Step 4: Commit**
```bash
git add .
git commit -m "chore: initial vite + tailwind setup"
```

### Task 2: Setup Shadcn UI & Design System
**Files:**
- Modify: `tailwind.config.js`
- Modify: `src/index.css`
- Create: `components.json`

**Step 1: Initialize Shadcn**
Run: `npx shadcn@latest init` (Select "Slate", "Default" style, and CSS variables)
Expected: `components.json` created and `src/lib/utils.ts` generated.

**Step 2: Add essential components**
Run: `npx shadcn@latest add card button input label slider tabs switch`
Expected: Components added to `src/components/ui/`.

**Step 3: Define "Aura" Design Tokens**
Modify `src/index.css` to include custom gradients and glassmorphism utilities.

**Step 4: Commit**
```bash
git add .
git commit -m "feat: setup shadcn ui and aura design tokens"
```

### Task 3: App Shell & Layout
**Files:**
- Modify: `src/App.tsx`
- Create: `src/components/layout/Navbar.tsx`
- Create: `src/components/layout/Footer.tsx`

**Step 1: Build the Main Layout**
Create a responsive container with a dynamic gradient background.

**Step 2: Implement Navbar**
Add the "Aura" branding and a dark mode toggle.

**Step 3: Commit**
```bash
git add src/App.tsx src/components/layout/
git commit -m "feat: build app shell and navigation"
```

### Task 4: Core Calculator Logic & Hooks
**Files:**
- Create: `src/lib/calculator.ts`
- Create: `src/hooks/use-aura-calculation.ts`

**Step 1: Implement Calculation Logic**
Write functions for tax brackets, NI, and cost-of-living adjustments.

**Step 2: Create Custom Hook**
Create `useAuraCalculation` to handle all form state and derived calculations.

**Step 3: Commit**
```bash
git add src/lib/ src/hooks/
git commit -m "feat: implement tax and aura logic"
```

### Task 5: Dashboard Components
**Files:**
- Create: `src/components/dashboard/InputPanel.tsx`
- Create: `src/components/dashboard/ResultPanel.tsx`
- Create: `src/components/dashboard/AuraScore.tsx`

**Step 1: Build Input Form**
Use Shadcn components for salary, location, and expense inputs.

**Step 2: Build Result Visualization**
Use Recharts or nice CSS bars to show the breakdown.

**Step 3: Implement Aura Score Display**
Create a central "Aura" ring/score component with animations.

**Step 4: Commit**
```bash
git add src/components/dashboard/
git commit -m "feat: build dashboard input and result panels"
```

### Task 6: Final Polish & Animations
**Files:**
- Modify: `src/index.css`
- Modify: `src/App.tsx`

**Step 1: Add Framer Motion**
Install `framer-motion` and add entry animations for cards.

**Step 2: Final Styling Review**
Ensure consistent spacing, premium shadows, and typography.

**Step 3: Commit**
```bash
git add .
git commit -m "feat: add animations and final UI polish"
```
