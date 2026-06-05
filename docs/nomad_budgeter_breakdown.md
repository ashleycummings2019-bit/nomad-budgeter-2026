# Nomad Budgeter 2026: Project Breakdown

This document provides a comprehensive overview of the Nomad Budgeter platform, its architecture, data pipelines, and automation. You can provide this to your Gemini for full context on the project.

## 1. Project Overview & Strategy
**Nomad Budgeter** is a premium, mobile-first web application engineered as a high-conversion financial funnel for digital nomads. It calculates the true "Savings Potential" across 45+ global tax havens and nomad hubs.

*   **Core Purpose:** Transition from a simple directory to a dynamic utility by providing granular, real-time cost-of-living and tax calculations.
*   **The Moat:** Focuses on the "Leftover" savings logic (how much you actually save every month) rather than just listing static prices.
*   **pSEO (Programmatic SEO) Strategy:** Automatically generates thousands of high-intent "Showdown" landing pages (e.g., Lisbon vs. Bali, Spain vs. Portugal) to capture long-tail, transactional search traffic.

## 2. Tech Stack & Architecture
The platform is built for extreme speed (500ms global load times) and SEO dominance.

*   **Static Site Generator:** Eleventy (11ty) v3
*   **Templating Engine:** Nunjucks (`.njk`)
*   **Frontend Design:** Vanilla HTML5, CSS3 (Glassmorphism design system), and Vanilla JavaScript. No heavy frontend frameworks to maximize performance.
*   **Hosting & Edge Network:** Vercel (Configured via `vercel.json` with strict cache headers, security policies, and 301 redirects).
*   **Serverless Backend:** Vercel Serverless Functions (`/api/` directory).
*   **Auth:** Clerk (JWT-based auth for dashboard, API, and Stripe webhook)
*   **Payments:** Stripe (Pro Report $19 and Business Hub $99)
*   **CMS:** Airtable (Content Pipeline + Tax Overrides tables)

## 3. Data Pipelines & Automation
The platform relies on a sophisticated, automated data pipeline to ensure 2026 freshness and accuracy, which is critical for Google's "Live Data" algorithmic preference.

*   **Airtable Integration:**
    *   Acts as the primary source of truth for base data (Monthly Rent, Visa Ranks, Country/City metadata).
    *   Data is synced and cached locally into `src/_data/cities.json` and `src/_data/countries.json`.
    *   **Content Pipeline table:** Stores blog topics with `Status` field (`Needs Draft` → `Done`). Seeded via `npm run seed`, consumed by `npm run cmo`.
    *   **Tax Overrides table:** Manual overrides for city-level tax data, loaded at build time via `src/_data/airtableOverrides.js`.
*   **"Pulse" Automation (`scripts/pulse.mjs`):**
    *   **Trigger:** Runs automatically via Vercel before *every single build* (`npm run build`).
    *   **Action:** Hits the free Frankfurter API for live USD → Local currency exchange rates.
    *   **Enrichment:** Calculates granular, localized food and lifestyle prices (e.g., cappuccino, coworking day pass) based on dynamic cost-of-living tiers (veryLow to veryHigh).
    *   **Output:** Injects fresh exchange rates and prices into the dataset, stamping everything with a `pulse_updated` ISO timestamp so the frontend can prove data freshness to users and search engines.
*   **CMO Content Generator (`scripts/cmo-content-generator.mjs`):**
    *   **Trigger:** Manual via `npm run cmo`
    *   **Action:** Pulls "Needs Draft" topics from Airtable, generates multi-platform content (blog, Twitter, LinkedIn, Reddit, newsletter, etc.) using Gemini AI with RAG context from `docs/PLATFORM_KNOWLEDGE.md`.
    *   **Output:** Writes blog posts to `src/blog/`, updates Airtable records with social copy, sets Status to `Done`.
*   **Serverless Automations (`/api/`):**
    *   `capture-lead.js`: Handles lead generation (e.g., email captures for newsletter or gated tools).
    *   `stripe-webhook.js`: Integrates with Stripe for premium report purchases.
    *   `v1/cities.js`: B2B API endpoint for partner integrations.
    *   `travel-logs.js`: Travel day tracking for the dashboard's 183-day tracker.

## 4. Content Distribution Pipeline
Automated content flows from creation to distribution:

```
Airtable (Needs Draft) → CMO Script (Gemini AI) → Blog + Social Copy
    ↓                                                    ↓
 npm run seed                                    Make.com Router
    ↓                                                    ↓
 9 stub topics queued                     Facebook, Instagram, LinkedIn, YouTube
                                                         ↓
                                              ConvertKit Email Drip Sequence
```

### Content Calendar Rhythm
- **Monday:** Seed 5-10 new topics to Airtable via `npm run seed`
- **Tuesday:** Run `npm run cmo` to generate all content
- **Wednesday-Friday:** Make.com auto-distributes to social channels (1 post/day)
- **Continuous:** ConvertKit drip handles email conversion automatically

## 5. Blog Post System & SEO Metadata

### Required Frontmatter (Every Post)
```yaml
---
layout: layouts/blog.njk
title: "City A vs City B for Digital Nomads (2026)"
description: "A 155-character max SEO description."
meta_description: "Same as description."
date: 2026-01-15
author: "Ashley Cummings"
tags: ["compare", "city-a", "city-b"]
draft: true  # false only when content is fully written
---
```

### Maintenance Scripts
| Script | Purpose |
|--------|---------|
| `scripts/fix-bloated-posts.mjs` | Truncates corrupted markdown table cells |
| `scripts/fix-meta-descriptions.mjs` | Injects `description` + `author` from `meta_description` |
| `scripts/fix-stub-posts.mjs` | Adds complete frontmatter to stub posts |
| `scripts/seed-airtable-topics.mjs` | Seeds Airtable with topics needing content |
| `scripts/cmo-content-generator.mjs` | AI-generates blog + social content from Airtable queue |

### URL & Redirect Rules
- All blog CTAs → `https://www.nomadbudgeter.com/pricing/` (never `/premium`)
- `/premium` → `/pricing/` (301 redirect in `vercel.json`)
- City links → `/cities/[slug]/`
- Comparison links → `/compare/city/X-vs-Y/`

## 6. Monetization & Affiliates
The platform is architected as a sales funnel with integrated affiliate triggers deeply embedded into the UI (e.g., within the "Relocation Toolkit" component).

*   **Global Configuration:** All affiliate data (URLs, descriptions, UTMs) is centralized in `src/_data/site.json`.
*   **Key Partners:**
    *   **Blueground & Agoda:** Accommodations (Currently utilizing the 2026 campaign and promo code strategy).
    *   **Lexidy:** Visa & Legal Services.
    *   **SafetyWing:** Digital Nomad Health Insurance.
    *   **Wise:** Global Banking and Currency Exchange.

## 7. SEO & Design Rules
*   **Design:** Premium aesthetics with glassmorphism (`--glass-bg`, `--glass-border`, `--aura-primary`), tailored color palettes, and mobile-first responsiveness (CSS Grid/Flexbox).
*   **Accessibility:** Strict adherence to WCAG 2.4, maintaining minimum touch targets (44x44px) for mobile.
*   **Technical SEO:**
    *   JSON-LD `ProductComparison` schemas hardcoded into templates.
    *   Strict heading hierarchy (one H1 per page).
    *   Dynamic meta descriptions under 160 characters.
    *   Programmatic generation of highly specific comparison pages.

## 8. Core Project Directory Structure
*   `src/`: The core application code.
    *   `_data/`: Contains `.json` and `.js` files for 11ty's data cascade (e.g., `cities.json`, `site.json`, comparison generation scripts).
    *   `_includes/`: Nunjucks partials (`footer.njk`, `relocation-toolkit.njk`) and layouts (`base.njk`, `dashboard.njk`).
    *   `css/`: Vanilla CSS files including `index.css` (design system & grids).
    *   `blog/`: Markdown blog posts (comparison articles, tax guides, affiliate content).
    *   `cities/`, `compare/`, `visas/`: Dynamic page templates for pSEO generation.
    *   `dashboard/`: Pro user dashboard (Days Tracker, Reports, Settings).
*   `scripts/`: Automation scripts (pulse, CMO, seeder, maintenance).
*   `api/`: Vercel serverless functions (lead capture, Stripe, B2B API, travel logs).
*   `docs/`: Platform knowledge base, API guide, traffic workflow, content strategy.
*   `_site/`: The generated static site deployed to Vercel.
