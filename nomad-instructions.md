# Nomad Architect Instructions

## The Goal
This is a programmatic SEO site built on Eleventy. Our goal is high-intent digital nomad traffic, monetized via affiliate links.

## Design Rules
*   **Accessibility:** Always ensure Tailwind utility classes are accessible (WCAG 2.4).
*   **Mobile First:** Buttons must have a minimum touch target size (at least 44x44px) for mobile devices.
*   **Aesthetics:** Use a premium, modern design with smooth gradients and high-quality typography.

## SEO Rules
*   **Schemas:** Never delete existing JSON-LD schemas.
*   *Meta Descriptions:** Always ensure meta descriptions are under 160 characters and include the target city name.
*   **Headings:** Maintain a strict heading hierarchy (one H1 per page).

## Data Pipeline
*   **Airtable:** The site sources data from Airtable.
*   **Schema:** 
    *   Rent data is in the `Monthly Rent (USD)` column.
    *   Visa scores are rated 1-10 in the `Visa Rank` column.
    *   Cities data is in `src/_data/cities.json` (cached from Airtable).
