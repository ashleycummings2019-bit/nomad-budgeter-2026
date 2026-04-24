# Nomad Budgeter Scaling & Hardening Design

## 1. Data Architecture Unification
**Objective**: Remove hardcoded JavaScript objects and establish a single source of truth for city data.
**Implementation**:
- **Static JSON API**: Create an Eleventy template (`src/api/cities.json.njk`) that iterates over the master `src/_data/cities.json` and outputs a clean JSON file during the build process.
- **Client-Side Refactoring**: Update `src/js/main.js` to fetch `/api/cities.json` on initialization. The JS will transform the array into a fast dictionary lookup (keyed by city name and slug). 
- **Cleanup**: Remove `NOMAD_DESTINATIONS` and `CITY_DATABASE` from `main.js`.

## 2. Dynamic UI/UX Polish
**Objective**: Elevate the design with premium, context-aware aesthetics that "wow" the user.
**Implementation**:
- **Aura Score Colors**: Introduce dynamic CSS variables in JavaScript based on the calculated budget score.
  - *Excellent (85-100)*: Emerald Green / Teal gradients.
  - *Good (70-84)*: Deep Purple / Violet gradients (current default).
  - *Warning (<70)*: Fiery Orange / Amber gradients.
- **Micro-animations**: Add subtle GSAP-style or CSS transitions for the results panel appearing and the metric cards popping in sequentially to make the interface feel responsive and alive.

## 3. Performance & Security Hardening
**Objective**: Ensure 100/100 Lighthouse scores and protect the platform's endpoints.
**Implementation**:
- **Vercel Configuration**: Add a `vercel.json` file to configure aggressive Edge caching for the static assets (CSS, JS, JSON API).
- **Security Headers**: Implement strict security headers in `vercel.json` including `Strict-Transport-Security`, `X-Content-Type-Options`, `X-Frame-Options`, and `X-XSS-Protection`.
