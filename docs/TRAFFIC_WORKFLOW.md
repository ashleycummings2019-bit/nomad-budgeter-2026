# Nomad Budgeter — Traffic & SEO Growth Workflow

> [!IMPORTANT]
> **Directive:** This is the operational playbook for scaling Nomad Budgeter's visibility through pSEO, content distribution, and conversion optimization.

---

## Phase 1: Content Pipeline Execution
1.  **Seed Topics:** Run `npm run seed` to queue comparison and tax arbitrage topics into Airtable's "Content Pipeline" table.
2.  **Generate Content:** Run `npm run cmo` to AI-generate blog posts + multi-platform social copy from the queue.
3.  **Review & Publish:** Check generated blog posts in `src/blog/`. Set `draft: false` on posts with complete, data-driven content.
4.  **Deploy:** Push to GitHub → Vercel auto-deploys.

## Phase 2: Semantic SEO & Content Gap Analysis
1.  **Page Audit:** Inventory all files in `src/compare/city/` and `src/visas/`.
2.  **Keyword Injection:** Scan `docs/2026-global-tax-arbitrage-guide.md` for "Money Keywords" (e.g., "Beckham Law 2026", "E33G Bali Tax").
3.  **Internal Linking:** Ensure every blog post links to 2-3 city calculator pages using `/cities/[slug]/` URLs.
4.  **Meta Verification:** Confirm all posts have `description` (≤160 chars), `author`, and proper `tags` in frontmatter.

## Phase 3: Programmatic Expansion (The "Pulse" Loop)
1.  **Data Enrichment:** Monitor `scripts/pulse.mjs`. When a currency shifts by >2% or a tax law is updated, generate a new comparison page.
2.  **Top-of-Funnel (ToFu):** Create "Best Of" lists (e.g., "Top 5 Countries for 0% Tax in 2026") using the data in `src/_data/`.
3.  **Stub Conversion:** 9 stub comparison posts exist with `draft: true`. These need full content via the CMO pipeline before they can rank.

## Phase 4: Social Arbitrage & Content Distribution
1.  **Automated Distribution:** Make.com Router pushes content to Facebook, Instagram, LinkedIn, YouTube (1 post/day schedule).
2.  **X/Twitter Threads:** Extract the "Triad" framework from the guide and format it into a 10-post thread.
3.  **LinkedIn Carousels:** Use the "90-Day Roadmap" to create a "Visual Guide to Escaping the 40% Tax Trap."
4.  **Reddit Monitoring:** Identify r/digitalnomad threads about tax and offer a link to the *specific* calculator result (e.g., "Check the actual savings for Bali vs Lisbon here: [URL]").

## Phase 5: Conversion Optimization (CRO)
1.  **Heatmap Analysis:** Review `src/index.njk`. Ensure the Lead Magnet is positioned above the fold or immediately after calculation results.
2.  **A/B Testing:** Test different CTAs for the $19 report (e.g., "Buy the Guide" vs "Unlock the Alpha"). Widget randomly shows $19 or $99 plan.
3.  **CTA Audit:** All CTAs must point to `/pricing/` (never `/premium`). The 301 redirect in `vercel.json` catches stragglers.

## Phase 6: Email Funnel & Lead Magnet
1.  **Lead Magnet Delivery:** The "2026 Geo-Arbitrage Blueprint" is located at `/book/`. It is an interactive HTML page, not a static PDF file.
2.  **Email Copy Strategy:** Do NOT attach a PDF in welcome emails. Instead, send them to the live URL: `https://www.nomadbudgeter.com/book/` and advise them to use the "Save as PDF" button if they want offline access. This ensures they always see the latest tax data.
3.  **Upsell Sequence:** Day 1 (Blueprint delivery), Day 2 (183-Day trap education), Day 3 (Pitch $19 Pro Report), Day 4 (Pitch SafetyWing), Day 5 (Pitch Saily).

---

## Weekly Operator Checklist
- [ ] Run `npm run seed` to refresh the Airtable content queue
- [ ] Run `npm run cmo` to generate content for "Needs Draft" topics
- [ ] Check Vercel dashboard for build health after deploy
- [ ] Review Google Search Console for new crawl errors or 404s
- [ ] Spot-check 2-3 blog posts for correct meta descriptions and CTA links
- [ ] Draft 3 social hooks based on the latest cost-of-living data
- [ ] Monitor ConvertKit drip sequence open/click rates

---

## Post-Deploy SEO Checklist
After pushing blog changes to GitHub (Vercel auto-deploys):
1. ✅ Verify build succeeds on Vercel dashboard
2. ✅ Spot-check 2-3 blog URLs return 200 (not 404)
3. ✅ Check Google Search Console for new crawl errors within 48 hours
4. ✅ Verify `<meta name="description">` renders correctly in page source
5. ✅ Confirm 301 redirects are working (e.g., `/premium` → `/pricing/`)
