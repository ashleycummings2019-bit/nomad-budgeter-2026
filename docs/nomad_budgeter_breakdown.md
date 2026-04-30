# Nomad Budgeter 2026: Project Breakdown

This document provides a comprehensive overview of the Nomad Budgeter platform, its architecture, data pipelines, and automation. You can provide this to your Gemini for full context on the project.

## 1. Project Overview & Strategy
**Nomad Budgeter** is a premium, mobile-first web application engineered as a high-conversion financial funnel for digital nomads. It calculates the true "Savings Potential" across 45+ global tax havens and nomad hubs.

*   **Core Purpose:** Transition from a simple directory to a dynamic utility by providing granular, real-time cost-of-living and tax calculations.
*   **The Moat:** Focuses on the "Leftover" savings logic (how much you actually save every month) rather than just listing static prices.
*   **pSEO (Programmatic SEO) Strategy:** Automatically generates thousands of high-intent "Showdown" landing pages (e.g., Lisbon vs. Bali, Spain vs. Portugal) to capture long-tail, transactional search traffic.

## 2. Tech Stack & Architecture
The platform is built for extreme speed (500ms global load times) and SEO dominance.

*   **Static Site Generator:** Eleventy (11ty)
*   **Templating Engine:** Nunjucks (`.njk`)
*   **Frontend Design:** Vanilla HTML5, CSS3 (Glassmorphism design system), and Vanilla JavaScript. No heavy frontend frameworks to maximize performance.
*   **Hosting & Edge Network:** Vercel (Configured via `vercel.json` with strict cache headers and security policies).
*   **Serverless Backend:** Vercel Serverless Functions (`/api/` directory).

## 3. Data Pipelines & Automation
The platform relies on a sophisticated, automated data pipeline to ensure 2026 freshness and accuracy, which is critical for Google's "Live Data" algorithmic preference.

*   **Airtable Integration:** 
    *   Acts as the primary source of truth for base data (Monthly Rent, Visa Ranks, Country/City metadata).
    *   Data is synced and cached locally into `src/_data/cities.json` and `src/_data/countries.json`.
*   **"Pulse" Automation (`scripts/pulse.mjs`):**
    *   **Trigger:** Runs automatically via Vercel before *every single build* (`npm run build`).
    *   **Action:** Hits the free Frankfurter API for live USD → Local currency exchange rates.
    *   **Enrichment:** Calculates granular, localized food and lifestyle prices (e.g., cappuccino, coworking day pass) based on dynamic cost-of-living tiers (veryLow to veryHigh).
    *   **Output:** Injects fresh exchange rates and prices into the dataset, stamping everything with a `pulse_updated` ISO timestamp so the frontend can prove data freshness to users and search engines.
*   **Serverless Automations (`/api/`):**
    *   `capture-lead.js`: Handles lead generation (e.g., email captures for a newsletter or gated tools).
    *   `stripe-webhook.js`: Integrates with Stripe for potential premium features or monetization events.

## 4. Monetization & Affiliates
The platform is architected as a sales funnel with integrated affiliate triggers deeply embedded into the UI (e.g., within the "Relocation Toolkit" component). 

*   **Global Configuration:** All affiliate data (URLs, descriptions, UTMs) is centralized in `src/_data/site.json`.
*   **Key Partners:**
    *   **Blueground & Agoda:** Accommodations (Currently utilizing the 2026 campaign and promo code strategy).
    *   **Lexidy:** Visa & Legal Services.
    *   **SafetyWing:** Digital Nomad Health Insurance.
    *   **Wise:** Global Banking and Currency Exchange.

## 5. SEO & Design Rules
*   **Design:** Premium aesthetics with glassmorphism (`--glass-bg`, `--glass-border`, `--aura-primary`), tailored color palettes, and mobile-first responsiveness (CSS Grid/Flexbox).
*   **Accessibility:** Strict adherence to WCAG 2.4, maintaining minimum touch targets (44x44px) for mobile.
*   **Technical SEO:** 
    *   JSON-LD `ProductComparison` schemas hardcoded into templates.
    *   Strict heading hierarchy (one H1 per page).
    *   Dynamic meta descriptions under 160 characters.
    *   Programmatic generation of highly specific comparison pages.

## 6. Core Project Directory Structure
*   `src/`: The core application code.
    *   `_data/`: Contains `.json` and `.js` files for 11ty's data cascade (e.g., `cities.json`, `site.json`, comparison generation scripts).
    *   `_includes/`: Nunjucks partials (`footer.njk`, `relocation-toolkit.njk`) and layouts (`base.njk`).
    *   `css/`: Vanilla CSS files including `index.css` (design system & grids).
    *   `cities/`, `compare/`, `visas/`: Dynamic page templates for pSEO generation.
*   `scripts/`: Automation scripts (e.g., `pulse.mjs`).
*   `api/`: Vercel serverless functions (`capture-lead.js`, `stripe-webhook.js`).
*   `_site/`: The generated static site deployed to Vercel.
