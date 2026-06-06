# 🔗 Make.com Router — Nomad Budgeter Social Publishing Setup

> This document is your complete configuration guide for the Make.com automation that watches Airtable and publishes content to all social channels automatically.

---

## Overview: How the Pipeline Works

```
Airtable (Content Pipeline)
       │
       │  Trigger: Status = "Done"
       ▼
Make.com Router
       ├── Twitter/X    (text → Tweet thread)
       ├── LinkedIn     (text → Post)
       ├── Facebook     (text → Page post)
       ├── Reddit       (text → r/digitalnomad post)  [manual subreddit check first]
       ├── Instagram    (MANUAL: attach MP4, then auto-publish caption)
       ├── TikTok       (MANUAL: attach MP4, then auto-publish caption)
       └── YouTube      (MANUAL: attach MP4, then auto-publish description)
```

---

## Step 1: Create the Airtable Watch Module

**Module:** `Airtable → Watch Records`

| Field | Value |
|---|---|
| Connection | Your Airtable account |
| Base | Your Nomad Budgeter base |
| Table | `Content Pipeline` |
| Filter by Formula | `{Status} = "Done"` |
| Max Records | 1 (process one at a time) |
| Watch new records | Yes |

> **Important:** After each successful run, Make.com will mark the trigger offset. You should also add an **Update Record** step at the end to set `Status = "Published"` to prevent double-publishing.

---

## Step 2: Add a Router

After the Airtable trigger, add a **Router** module. Each route handles one platform. Routes are parallel — they all receive the same record.

---

## Route 1: Twitter/X

**Module:** `Twitter → Create a Tweet`

| Field | Airtable Mapping |
|---|---|
| Status | `{{1.Twitter}}` (the Twitter field from Airtable) |

> Note: Twitter's API limits tweets to 280 characters. If you're posting threads, use the **Twitter → Create a Thread** module (Tweets array) and split the content by newlines or numbered sections.

**Alternative (Recommended):** Use **Typefully** or **Publer** as a buffer — they handle threads natively and have Make.com integrations.

---

## Route 2: LinkedIn

**Module:** `LinkedIn → Create a Post`

| Field | Airtable Mapping |
|---|---|
| Text | `{{1.LinkedIn}}` |
| Visibility | `PUBLIC` |
| Post Type | `UGC` (User Generated Content) |

---

## Route 3: Facebook Page

**Module:** `Facebook Pages → Create a Page Post`

| Field | Airtable Mapping |
|---|---|
| Page | Your Nomad Budgeter Facebook Page |
| Message | `{{1.Facebook}}` |
| Published | `Yes` |

---

## Route 4: Reddit

**Module:** `Reddit → Submit a Link or Text Post`

| Field | Value |
|---|---|
| Subreddit | `digitalnomad` (primary) |
| Title | Extract first line of `{{1.Reddit}}` |
| Text | `{{1.Reddit}}` |
| Kind | `self` (text post) |

> ⚠️ **Reddit Rule:** r/digitalnomad has strict self-promotion rules. Posts must be educational, not purely promotional. The CMO Gem formats Reddit posts with this in mind (no brand name in title, value-first body). Always review before enabling full automation. Start with **Make.com → Email me for approval** as an intermediate step.

---

## Route 5: Instagram (Semi-Automated)

**Workflow:**
1. Make.com sends the caption (`{{1.Instagram}}`) to you via **Email** or **Telegram** notification (optional).
2. You record or render the MP4 (using HeyGen with the `{{1.HeyGen Script}}`).
3. You manually attach the MP4 to the `Video File` column in Airtable.
4. **Crucial Setup:** Set a **Filter** on the route leading to Instagram: `Condition: 1. Video File[]` -> `Exists`. This prevents the scenario from crashing if a record doesn't have a video yet.
5. Add an **HTTP → Download a file** module. Map the URL to `{{1.Video File[].url}}`.
6. Add the **Instagram for Business** module.

**Module (Step 6):** `Instagram for Business → Create a Photo/Video Post`

| Field | Airtable Mapping |
|---|---|
| Caption | `{{1.Instagram}}` |
| Video | Map the file downloaded from the HTTP module |
| Media Type | `REELS` |

---

## Route 6: TikTok (Semi-Automated)

Same workflow as Instagram. Use the **TikTok** module:

| Field | Airtable Mapping |
|---|---|
| Caption | `{{1.TikTok}}` |
| Video | `{{1.Video File[1].url}}` |
| Privacy Level | `PUBLIC_TO_EVERYONE` |

---

## Route 7: YouTube Shorts (Semi-Automated)

Same workflow as Instagram. Ensure the **Filter** (`Video File[]` Exists) and **HTTP → Download a file** module are in place before the YouTube module to prevent `Missing value of required parameter 'url'` errors.

| Field | Airtable Mapping |
|---|---|
| Title | First line of `{{1.YouTube}}` |
| Description | `{{1.YouTube}}` |
| Video File | Map the file downloaded from the HTTP module |
| Category | `22` (People & Blogs) |
| Privacy Status | `public` |
| Made for Kids | `No` |

---

## Step 3: Close the Loop — Mark as Published

At the end of all routes, add one final step:

**Module:** `Airtable → Update a Record`

| Field | Value |
|---|---|
| Record ID | `{{1.ID}}` |
| Status | `Published` |
| Published At | `{{now}}` |

> Add a `Published At` date field to your Airtable `Content Pipeline` table if it doesn't exist yet.

---

## Scheduling

Set the Make.com scenario to run on a schedule:
- **Interval:** Every 1 hour
- **Max bundles per cycle:** 3 (prevents spam if many records are queued)

---

## Required Make.com App Connections

| App | Auth Type | Notes |
|---|---|---|
| Airtable | API Key | Use your `AIRTABLE_API_KEY` |
| Twitter/X | OAuth 2.0 | Needs Twitter Developer App with Write permissions |
| LinkedIn | OAuth 2.0 | Needs LinkedIn Page Admin access |
| Facebook Pages | OAuth 2.0 | Needs Page Admin access |
| Reddit | OAuth 2.0 | Use your personal account or create a brand account |
| Instagram for Business | OAuth 2.0 | Must be a Business/Creator account connected to a Facebook Page |
| TikTok | OAuth 2.0 | TikTok for Business account required |
| YouTube | OAuth 2.0 | Google account with YouTube channel |

---

## Airtable Column Reference

Ensure your `Content Pipeline` table has these exact column names (case-sensitive):

| Column | Type | Notes |
|---|---|---|
| `Topic` | Single line text | The content topic — filled by you |
| `Status` | Single select | Options: `Needs Draft`, `Done`, `Published` |
| `Twitter` | Long text | Auto-filled by CMO |
| `LinkedIn` | Long text | Auto-filled by CMO |
| `Reddit` | Long text | Auto-filled by CMO |
| `Facebook` | Long text | Auto-filled by CMO |
| `Instagram` | Long text | Auto-filled by CMO |
| `TikTok` | Long text | Auto-filled by CMO |
| `YouTube` | Long text | Auto-filled by CMO |
| `HeyGen Script` | Long text | Auto-filled by CMO |
| `Newsletter` | Long text | Auto-filled by CMO |
| `Video File` | Attachment | You attach the MP4 here manually |
| `Published At` | Date | Auto-filled by Make.com when published |
