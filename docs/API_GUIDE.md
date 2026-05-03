# Nomad Budgeter B2B API Guide (2026)

Welcome to the Nomad Budgeter Business API. This high-fidelity data stream provides programmatic access to our curated global tax and cost-of-living dataset, specifically designed for mobility platforms, HR tech, and residency consultants.

## Authentication

All requests to the API must include your Business Tier user email in the `x-user-email` header.

```http
GET /api/v1/cities
x-user-email: business@example.com
```

## Endpoints

### 1. List Cities
`GET /api/v1/cities`

Returns a paginated list of cities with core metrics and premium "Business Tier" fields.

**Query Parameters:**
- `continent` (optional): Filter by continent (e.g., `Europe`, `Asia`)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Records per page (default: 50, max: 100)

**Response Format:**
```json
{
  "status": "success",
  "meta": {
    "total": 3341,
    "page": 1,
    "limit": 50,
    "continent": "all"
  },
  "data": [
    {
      "name": "Lisbon",
      "slug": "lisbon",
      "country": "Portugal",
      "continent": "Europe",
      "taxRate": 0.2,
      "costOfLivingUsd": 2400,
      "rentUsd": 1550,
      "visaRegime": "ITS Regime (Digital Nomad Visa)",
      "visaMinIncome": 3280,
      "lastUpdated": "2026-05-03T03:54:51.720Z",
      "expertTaxNotes": "...", // Premium Field
      "complianceScore": 92    // Premium Field
    }
  ]
}
```

## Rate Limits
Business tier subscribers are limited to 1,000 requests per hour. For higher volume, contact support.

## Data Quality
Our data is updated every 24 hours via our AI-powered enrichment pipeline, combining official government tax regimes with real-time cost-of-living snapshots.
