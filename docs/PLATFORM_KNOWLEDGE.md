# Nomad Budgeter — Platform Knowledge Base (CMO Brain)
## Last Updated: June 2026

> This document is auto-ingested by `scripts/cmo-content-generator.mjs` as RAG context.
> Every fact here is available to Gemini when writing blog posts, social copy, and email sequences.

---

## 1. Product & Pricing Architecture

### Two Pricing Plans (A/B Tested)
| Plan | Price | Stripe Link | Target Audience |
|------|-------|-------------|-----------------|
| **Professional** | $19 | `https://buy.stripe.com/00wdR3aQeg521HXgzleAg0b` | Solo nomads, freelancers, first-timers |
| **Business Hub** | $99 | `https://buy.stripe.com/eVq28lbUi7ywfyN2IveAg0c` | Agencies, couples, high-earners, families |

**A/B Test Live:** The city page upsell widget randomly shows either the $19 or $99 plan to 50% of visitors. When writing content, default to pitching the $19 Professional plan (higher conversion rate) but occasionally reference the $99 Business Hub for authority positioning.

### What's Inside the Pro Report ($19)
- Step-by-step visa roadmaps for top 12 zero-tax destinations
- Vetted local lawyer contacts in Dubai, Bali, Panama, Lisbon
- Custom Cost of Living spreadsheets (solo, couples, families)
- Banking setup guide (Wise + local brick-and-mortar)
- 2026 tax treaty notes for UK, US, German, Australian, Canadian citizens

### What's Inside Business Hub ($99)
- Everything in Professional
- Enterprise tax optimization strategies
- Multi-entity structuring guides
- Priority support & quarterly tax law updates
- Family relocation planning toolkit

---

## 2. Live Analytics (May 7 – June 3, 2026)

### Traffic Overview
| Metric | Value | Change |
|--------|-------|--------|
| Active Users | 162 | +224% |
| New Users | 147 | +194% |
| Avg Engagement Time | 15m 47s | -55% |
| Events | 1,000 | +76% |

### Top Pages by Views
| Page | Views | Active Users | Bounce Rate |
|------|-------|-------------|-------------|
| Homepage (Calculator) | 191 | 105 | 69.7% |
| Professional Plans (Pricing) | 34 | 7 | 38.1% |
| **Page Not Found (404)** | **26** | **15** | **50%** |
| Tbilisi vs Yerevan Comparison | 13 | 12 | 83.3% |
| Lisbon City Calculator | 12 | 4 | 30% |
| Time Machine Calculator | 10 | 3 | 16.7% |
| Tax & Visa Guides Hub | 9 | 4 | 22.2% |

### Key Analytics Insights for Content Strategy
1. **Calculator is king:** Homepage drives 62% of all traffic. All content should funnel back to the calculator with specific city URLs (e.g., `/cities/lisbon/`).
2. **Pricing page converts:** 38.1% bounce rate on pricing is excellent. Visitors who reach `/pricing/` are high-intent.
3. **404 spike = deployment issue:** 26 views on the 404 page was caused by a failed Vercel deployment (3 cities missing from Airtable cache). This has been fixed. Monitor for recurrence.
4. **Comparison pages have high bounce:** 83% bounce on Tbilisi vs Yerevan suggests users want more actionable content (CTAs, affiliate links, pro report pitch) inside comparison pages.
5. **Low engagement time on return visits:** The -55% engagement drop suggests returning users already know what they need. Push them to conversion faster with email sequences.

---

## 3. Affiliate Partners (Use EXACT Tracked URLs)

| Partner | What They Sell | Tracked URL | Best Content Angle |
|---------|---------------|-------------|-------------------|
| **SafetyWing** | Nomad health insurance | `https://safetywing.com/?referenceID=26514835&utm_source=nomadbudgeter&utm_medium=ambassador&utm_campaign=NB_2026_Insurance` | "Every 2026 nomad visa requires health insurance proof" |
| **Saily eSIM** | Digital roaming SIM | `https://saily.tp.st/XPRLV5qw` | "Stay connected from minute one — activate before your flight" |
| **Wise** | Multi-currency transfers | `https://wise.prf.hn/click/camref:1101l5JGeT` | "The banking backbone of every nomad's tax setup" |
| **Ekta Insurance** | Budget travel medical | `https://ektatraveling.tp.st/OC777BtT` | "Budget insurance from $0.99/day, Schengen compliant" |
| **Blueground** | Furnished apartments | `https://www.theblueground.com/?utm_source=nomadbudgeter&utm_medium=toolkit&utm_campaign=All_2026_BuildMngrAuto` | Use promo code **NOMADBUDGETER** for 5% off |
| **Interactive Brokers** | International brokerage | `https://www.interactivebrokers.com/mkt/?src=nomadbudgeter&url=%2Fen%2Fhome.php` | "The only broker that works seamlessly across 30+ jurisdictions" |
| **Lexidy Legal** | Visa lawyers (ES/PT/GR) | `https://lexidy.com/?utm_source=nomadbudgeter&utm_medium=affiliate&utm_campaign=NB_2026_Visa` | "Vetted legal experts for Beckham Law, NHR, and Golden Visa" |
| **Agoda** | Asia hotel/rental bookings | `https://www.agoda.com/?utm_source=nomadbudgeter&utm_medium=calculator&utm_campaign=NB_2026_Asia` | "Best monthly rental rates in Southeast Asia" |
| **Nomad List** | Community & city data | `https://nomadlist.com?utm_source=nomadbudgeter&utm_medium=community&utm_campaign=NB_2026_Silo` | "The #1 nomad community — use alongside our calculator" |

**Content Rules:**
- Always use the EXACT tracked URLs above. Never link to bare domains.
- Maximum 2-3 affiliate mentions per blog post. Keep it natural.
- SafetyWing and Saily are the highest-converting partners. Prioritize them.
- When mentioning Lexidy, link to the country-specific URL if the content is about Spain, Portugal, or Greece.

---

## 4. ConvertKit Email Funnel (Active & Automated)

The 5-day welcome drip is LIVE and fully automated:

| Day | Subject | Goal |
|-----|---------|------|
| Day 0 | "Your 2026 Geo-Arbitrage Blueprint is ready" | Deliver the free Blueprint at `/book/` |
| Day 2 | "The 183-Day Myth is costing nomads thousands" | Educate on tax residency traps |
| Day 3 | "The $19 decision that saves nomads $10,000+" | Hard pitch the Pro Report |
| Day 4 | "Don't move without health cover" | Pitch SafetyWing affiliate |
| Day 5 | "One last thing before you land" | Pitch Saily eSIM affiliate |

**Content Implication:** Blog posts should drive email signups, NOT direct sales. The email sequence handles conversion. Blog CTAs should say: *"Get the free 2026 Blueprint →"* pointing to the calculator or `/book/`.

---

## 5. Autonomous Pipeline Architecture

### Content Flow
```
Airtable (Content Pipeline) → Make.com (Trigger) → GitHub Actions (Webhook) → CMO Script → Vercel (Deploys Blog Posts)
```

### Make.com Integration
- **Trigger:** Make.com decides when the website needs updating.
- **Action:** Make.com hits a GitHub Webhook (`repository_dispatch` to `https://api.github.com/repos/ashleycummings2019-bit/nomad-budgeter-2026/dispatches`).
- **Result:** GitHub runs the AI generation script (which processes up to 5 "Needs Draft" records in Airtable), commits the new blog posts, and tells Vercel to update the live site.
- **Social Media:** Is now handled manually. Make.com is strictly focused on triggering website SEO updates.

### Build Pipeline
```
npm run build = pulse.mjs → validate-build.mjs → generate-best-of.mjs → Eleventy
```

**CRITICAL: Vercel Deployment Gotcha**
The `validate-build.mjs` script will FAIL the entire build if ANY city in `cities.json` is missing from `airtable_cache.json`. When adding new cities:
1. Add the city to `src/_data/cities.json`
2. Add a corresponding record to `src/_data/airtable_cache.json`
3. Add the record to the live Airtable "Tax Overrides" table
If you skip step 2 or 3, Vercel will reject the deployment and all new content goes dark.

---

## 6. City Database (77 Cities)

The calculator covers **77 cities** across **45+ countries**. Recent additions:
- **Tokyo, Japan** — Engineer/Startup Visa, tax treaties with most Western countries
- **Seoul, South Korea** — D-8 Digital Nomad Visa (launched 2025), 19% flat rate

### Key Tax Regimes for Content
| Destination | Tax Rate | Regime | Best Content Hook |
|-------------|----------|--------|-------------------|
| Dubai | 0% | No income tax | "The obvious choice — but is it worth the heat?" |
| Bali | 0% | E33G Visa | "Paradise + 0% tax = the 2026 nomad dream" |
| Lisbon | 20% flat | NHR (ending 2026) | "Last chance to lock in Portugal's NHR before it closes" |
| Tbilisi | 1% | Micro-Business | "Pay 1% tax on $185k — Georgia's hidden gem" |
| Panama | 0% foreign | Territorial | "The OG tax haven for American nomads" |
| Croatia | 0% (1 year) | DNV permit | "Mediterranean lifestyle, zero tax — but only for 12 months" |
| Malaysia | 0% foreign | DE Rantau | "Asia's most underrated tax play" |
| Costa Rica | 0% foreign | Nomad Law | "Wellness + wealth = the Central American arbitrage" |

---

## 7. SEO Strategy & Lessons

### What's Working
- **Programmatic city pages** drive consistent long-tail traffic
- **Comparison pages** (`/compare/city/X-vs-Y/`) capture high-intent searchers
- **Trends pages** (auto-generated "Best Of" lists) rank for listicle queries

### What Needs Improvement
- **Internal linking:** Every blog post MUST link to 2-3 city calculator pages using `/cities/[slug]/` URLs
- **404 recovery:** The 404 page has a radar animation and links to all major sections — but we need to prevent 404s in the first place by ensuring all new content is deployed before Google is pinged

### Content Calendar Rhythm
- **On-Demand:** Trigger `Make.com → GitHub Webhook` whenever you want the site to generate new blog posts from the Airtable queue
- **Seeding:** Run `npm run seed` locally to load 60 high-value comparison topics into Airtable
- **Image Generation:** Blog cover images are now auto-generated by Gemini Flash Image API (replaced deprecated Imagen 3)
- **Continuous:** ConvertKit drip handles email conversion automatically

---

## 8. Brand Voice & Writing Rules

### Tone
- **Authoritative** — We deal in data, not opinions
- **Contrarian** — Challenge conventional nomad advice ("The 183-day rule is a myth")
- **High-status** — Use language like "Alpha", "Arbitrage", "Savings Moat", "Wealth Architecture"
- **Urgent** — Tax laws change. Visa windows close. Act now.

### Content Don'ts
- ❌ Never hallucinate statistics. Only use data from the Tax Guide context
- ❌ Never link to bare affiliate domains (always use tracked URLs)
- ❌ Never pitch more than 2-3 affiliate products per blog post
- ❌ Never write "in conclusion" or generic AI filler phrases
- ❌ Never forget the CTA. Every piece of content must drive to the calculator, the Blueprint, or the Pro Report

### Content Must-Haves
- ✅ Hook with a counter-intuitive financial truth in the first line
- ✅ Include at least one data table with real tax figures
- ✅ Link to 2-3 internal city pages using `/cities/[slug]/`
- ✅ End with a CTA to `https://www.nomadbudgeter.com/pricing/` (Pro Report) or the calculator
- ✅ Use the phrase "Nomad Budgeter" (not "NomadBudgeter" or "nomadbudgeter") in body copy

### Web Performance & PageSpeed (Mobile 90+)
- ⚡ **No bloat:** Keep HTML structure clean and minimal. Avoid deeply nested `<div>` elements or excessive inline styles in Markdown.
- ⚡ **Image Optimization:** Always rely on the site's default Vercel Image Optimization. Do NOT hotlink unoptimized external images (they block rendering and tank scores).
- ⚡ **No 3rd-Party Scripts:** Never inject external scripts or tracking pixels directly into blog content. GA4 and Clerk are strictly lazy-loaded via `base.njk`.
- ⚡ **Lazy Load Everything Below Fold:** If you must add iframes or rich media, include `loading="lazy"` attributes.

---

## 9. Blog Post Maintenance & SEO Metadata Standards

### Required Frontmatter Fields (Every Post)
Every blog post in `src/blog/*.md` MUST include ALL of these YAML frontmatter fields:

```yaml
---
layout: layouts/blog.njk
title: "City A vs City B for Digital Nomads (2026)"
description: "A 155-character max SEO description for Google SERPs."
meta_description: "Same as description — used by some templates."
date: 2026-01-15
author: "Ashley Cummings"
tags: ["compare", "city-a", "city-b"]
draft: true  # Set to false only when content is fully written
---
```

**Critical rules:**
- `description` and `meta_description` should contain the same text
- `author` must always be `"Ashley Cummings"` (quoted)
- `tags` must include `"compare"` for comparison posts
- `draft: true` must be set on any post that has placeholder/stub content
- Descriptions must be ≤ 160 characters for optimal Google SERP display

### Comparison Post Types
There are two tiers of comparison content:

1. **Full-length posts** (`/blog/` path) — 2000+ word deep-dives with real data tables, tax breakdowns, affiliate links, and CTAs. These have `draft: false`.
2. **Stub/placeholder posts** — Generated by the programmatic pipeline with generic body text. These MUST have `draft: true` until real content is written. They are queued for the CMO content generator.

### Common Data Corruption Patterns (AVOID)
The following issues have caused production outages:

| Issue | Cause | Fix |
|-------|-------|-----|
| **Bloated table cells** | AI-generated markdown tables with cells containing 100K+ characters of repeated content | Truncate to clean table; keep ≤ 200 chars per cell |
| **YAML parse errors** | Unescaped `$`, `:`, or `"` characters inside frontmatter values | Always wrap values in double quotes; escape internal quotes |
| **Missing metadata** | Programmatic posts generated without `description` or `author` fields | Run metadata injection script or add manually |
| **Dead CTA links** | Blog posts linking to `/premium` instead of `/pricing/` | All CTAs must point to `https://www.nomadbudgeter.com/pricing/` |

### Maintenance Scripts
| Script | Purpose | When to Run |
|--------|---------|-------------|
| `scripts/fix-bloated-posts.mjs` | Truncates corrupted markdown table cells back to clean data | When build times spike or file sizes exceed 50KB |
| `scripts/fix-meta-descriptions.mjs` | Injects `description` + `author` from existing `meta_description` | After bulk-generating new comparison posts |
| `scripts/fix-stub-posts.mjs` | Adds proper frontmatter to stub posts with generic titles | After programmatic pipeline creates new stubs |
| `scripts/validate-build.mjs` | Full build health check | Before every deploy |

### Post-Deploy SEO Checklist
After pushing blog changes to GitHub (Vercel auto-deploys):
1. ✅ Verify build succeeds on Vercel dashboard
2. ✅ Spot-check 2-3 blog URLs return 200 (not 404)
3. ✅ Check Google Search Console for new crawl errors within 48 hours
4. ✅ Verify `<meta name="description">` renders correctly in page source
5. ✅ Confirm 301 redirects are working (e.g., `/premium` → `/pricing/`)

