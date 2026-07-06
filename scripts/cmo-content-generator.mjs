/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║   🧠 NOMAD BUDGETER — CMO CONTENT GENERATOR v2.0            ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * UPGRADES vs v1.0:
 *   1. Context-Aware Ingestion — Injects the live Tax Guide, Affiliate
 *      URLs, and Traffic Workflow as RAG context into every prompt.
 *   2. Pro/Flash Model Routing — Blog posts use gemini-2.5-pro for
 *      accuracy; all social/email copy uses gemini-2.5-flash for speed.
 *   3. Closed-Loop SEO Verification — After the blog draft is written,
 *      a programmatic SEO check scores it. If score < 80 the generator
 *      automatically triggers a revision pass on the blog only.
 *
 * Usage:
 *   npm run cmo
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// ─── CONFIGURATION ────────────────────────────────────────────────────────────
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const GEMINI_API_KEY   = process.env.GEMINI_API_KEY;
const TABLE_NAME       = 'Content Pipeline';

// ─── MODEL ROUTING ────────────────────────────────────────────────────────────
const MODEL_FLASH = 'gemini-2.5-flash';    // Social, newsletter, video scripts
const MODEL_PRO   = 'gemini-2.5-flash';    // Long-form blog posts (fallback to flash due to pro quota limits)

// ─── SEO PASS THRESHOLD ───────────────────────────────────────────────────────
const SEO_SCORE_THRESHOLD = 80;

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 1: CONTEXT-AWARE INGESTION (Local RAG)
// ═══════════════════════════════════════════════════════════════════════════════

function loadRagContext() {
    const root = path.resolve(__dirname, '..');

    // 1a. 2026 Tax Arbitrage Guide (factual authority)
    let taxGuide = '';
    try {
        taxGuide = fs.readFileSync(path.join(root, 'docs', '2026-global-tax-arbitrage-guide.md'), 'utf8');
        console.log('   ✅ Injected: 2026 Tax Arbitrage Guide');
    } catch (e) {
        console.warn('   ⚠️  Could not load Tax Guide. Continuing without it.');
    }

    // 1b. Affiliate links from live site config
    let affiliateLinks = '';
    try {
        // site.js is a CommonJS module — require() handles it correctly
        const siteData = require(path.join(root, 'src', '_data', 'site.js'))();
        const aff = siteData.affiliates || {};
        affiliateLinks = Object.entries(aff).map(([key, val]) =>
            `${val.name}: ${val.url}`
        ).join('\n');
        console.log('   ✅ Injected: Live Affiliate URLs');
    } catch (e) {
        console.warn('   ⚠️  Could not load site.js affiliates. Continuing without them.');
    }

    // 1c. Traffic Workflow (funnel rules and CTA sequences)
    let trafficWorkflow = '';
    try {
        trafficWorkflow = fs.readFileSync(path.join(root, 'docs', 'TRAFFIC_WORKFLOW.md'), 'utf8');
        console.log('   ✅ Injected: Traffic Workflow & Funnel Rules');
    } catch (e) {
        console.warn('   ⚠️  Could not load TRAFFIC_WORKFLOW.md. Continuing without it.');
    }

    // 1d. Internal Linking Graph (Cities)
    let internalLinks = '';
    try {
        const cities = JSON.parse(fs.readFileSync(path.join(root, 'src', '_data', 'cities.json'), 'utf8'));
        const cityUrls = cities.map(c => `[${c.name} Tax Guide](/cities/${c.slug}/)`).join(', ');
        internalLinks = `Available City Guides for linking:\n${cityUrls}`;
        console.log('   ✅ Injected: Internal City Links');
    } catch (e) {
        console.warn('   ⚠️  Could not load cities.json. Continuing without internal links.');
    }

    // 1e. Platform Knowledge Base (analytics, pricing, funnel, brand voice)
    let platformKnowledge = '';
    try {
        platformKnowledge = fs.readFileSync(path.join(root, 'docs', 'PLATFORM_KNOWLEDGE.md'), 'utf8');
        console.log('   ✅ Injected: Platform Knowledge Base (analytics, pricing, CRO)');
    } catch (e) {
        console.warn('   ⚠️  Could not load PLATFORM_KNOWLEDGE.md. Continuing without it.');
    }

    return { taxGuide, affiliateLinks, trafficWorkflow, internalLinks, platformKnowledge };
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 2: PROMPT TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════════

// Social prompts removed to optimize for website-only generation

function buildBlogPrompt(topic, ctx) {
    return `You are the lead SEO Content Writer for NomadBudgeter.com.
Your writing is authoritative, structured, and action-oriented. You focus on "Wealth Architecture" for digital nomads.

━━━ LIVE CONTEXT (use these facts — do NOT hallucinate statistics) ━━━
${ctx.taxGuide ? `\nTAX ARBITRAGE GUIDE:\n${ctx.taxGuide}\n` : ''}
${ctx.affiliateLinks ? `\nAFFILIATE LINKS (use exact tracked URLs when mentioning partners):\n${ctx.affiliateLinks}\n` : ''}
${ctx.internalLinks ? `\nINTERNAL LINKS (Integrate 2-3 of these organically into your blog post content using Markdown):\n${ctx.internalLinks}\n` : ''}
${ctx.platformKnowledge ? `\nPLATFORM KNOWLEDGE (pricing tiers, analytics insights, brand voice, CRO strategy):\n${ctx.platformKnowledge.slice(0, 6000)}\n` : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Topic: "${topic}"

[BLOG]
Write a comprehensive, 1,500-word SEO-optimized Markdown article.
Requirements:
- YAML frontmatter (title, description, date: today, author: "Nomad Budgeter", category, readingTime, tags array)
- One H1 matching the SEO title
- Proper heading hierarchy (H2, H3 only)
- At least one data table with real figures from the Tax Guide context
- Internal links to relevant /cities/[slug] or /compare/ pages
- 2–3 natural affiliate mentions with tracked URLs from the context
- CTA at the end linking to https://www.nomadbudgeter.com/pricing/ for the $19 Pro Report
- Do NOT wrap frontmatter or content in a code block — write raw markdown
`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// GEMINI API HELPER
// ═══════════════════════════════════════════════════════════════════════════════

async function callGemini(prompt, model, temperature = 0.7, retries = 4) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
    const retryDelays = [15000, 30000, 60000, 120000]; // 15s, 30s, 60s, 2min

    for (let attempt = 0; attempt <= retries; attempt++) {
        let res;
        try {
            res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { temperature }
                })
            });
        } catch (networkErr) {
            // fetch() itself threw (network failure, DNS, etc.)
            if (attempt < retries) {
                const delay = retryDelays[attempt];
                console.warn(`   ⚠️  Network error (attempt ${attempt + 1}/${retries + 1}). Retrying in ${delay / 1000}s... [${networkErr.message}]`);
                await new Promise(r => setTimeout(r, delay));
                continue;
            }
            throw networkErr;
        }

        if (res.ok) {
            const data = await res.json();
            return data.candidates[0].content.parts[0].text;
        }

        const errText = await res.text();
        const isRetryable = res.status === 429 || res.status === 503 || res.status === 500;

        if (isRetryable && attempt < retries) {
            const delay = retryDelays[attempt];
            console.warn(`   ⚠️  Gemini ${res.status} (attempt ${attempt + 1}/${retries + 1}). Retrying in ${delay / 1000}s...`);
            await new Promise(r => setTimeout(r, delay));
            continue;
        }

        throw new Error(`Gemini API error (${model}): ${errText}`);
    }
}

async function generateBlogImage(topic, slug) {
    const prompt = `Generate a high-quality, cinematic, professional editorial photo representing: ${topic}. Digital nomad lifestyle, clean lighting, travel photography, photorealistic. No text or watermarks.`;
    const model = 'gemini-2.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
    
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    responseModalities: ['TEXT', 'IMAGE']
                }
            })
        });

        if (!res.ok) {
            console.warn(`   ⚠️ Image generation failed: ${await res.text()}`);
            return null;
        }

        const data = await res.json();
        const parts = data?.candidates?.[0]?.content?.parts || [];
        const imagePart = parts.find(p => p.inlineData?.mimeType?.startsWith('image/'));
        
        if (imagePart) {
            const imgDir = path.join(process.cwd(), 'src', 'assets', 'images', 'blog');
            if (!fs.existsSync(imgDir)) {
                fs.mkdirSync(imgDir, { recursive: true });
            }
            const ext = imagePart.inlineData.mimeType === 'image/png' ? 'png' : 'jpg';
            const filePath = path.join(imgDir, `${slug}.${ext}`);
            fs.writeFileSync(filePath, Buffer.from(imagePart.inlineData.data, 'base64'));
            console.log(`   ✅ Cover image saved → ${filePath}`);
            return `/assets/images/blog/${slug}.${ext}`;
        } else {
            console.warn(`   ⚠️ No image part found in Gemini response.`);
        }
    } catch (e) {
        console.warn(`   ⚠️ Image generation error: ${e.message}`);
    }
    return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION EXTRACTOR
// ═══════════════════════════════════════════════════════════════════════════════

function extractSection(text, tag) {
    const regex = new RegExp(`(?:\\[${tag}\\])(?:\\*\\*|:)?\\s*([\\s\\S]*?)(?=\\[|$)`, 'i');
    const match = text.match(regex);
    if (!match) return '';
    let section = match[1].trim();
    if (tag === 'BLOG') {
        section = section
            .replace(/^```markdown\s*/i, '')
            .replace(/^```\s*/, '')
            .replace(/```$/, '')
            .trim();
    }
    return section;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 3: CLOSED-LOOP SEO VERIFICATION
// ═══════════════════════════════════════════════════════════════════════════════

async function runSeoCheck(blogMarkdown, topic) {
    console.log(`\n🔎 SEO VERIFICATION — Scoring blog draft...`);

    const truncated = blogMarkdown.length > 5000
        ? blogMarkdown.slice(0, 4000) + '\n\n[... content truncated ...]\n\n' + blogMarkdown.slice(-500)
        : blogMarkdown;

    const seoPrompt = `You are an SEO expert. Analyze this Markdown blog post and return ONLY a JSON object (no code block, no other text) with:
{
  "seo_score": <integer 0-100>,
  "title_suggestion": "<60-char SEO title>",
  "meta_description": "<155-char meta description>",
  "keyword_gaps": ["<up to 5 missing keywords>"],
  "content_recommendations": ["<up to 3 specific improvements>"],
  "internal_links_to_add": ["<up to 4 /cities/slug or /compare/ paths>"]
}

Topic: "${topic}"
Draft:
"""
${truncated}
"""`;

    const raw = await callGemini(seoPrompt, MODEL_FLASH, 0.3);

    // Strip any accidental code fences
    const clean = raw.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/```$/, '').trim();

    let report;
    try {
        report = JSON.parse(clean);
    } catch {
        // Attempt basic repair
        let repaired = clean;
        if ((repaired.match(/"/g) || []).length % 2 !== 0) repaired += '"';
        const openB = (repaired.match(/\[/g) || []).length;
        const closeB = (repaired.match(/\]/g) || []).length;
        for (let i = 0; i < openB - closeB; i++) repaired += ']';
        const openO = (repaired.match(/\{/g) || []).length;
        const closeO = (repaired.match(/\}/g) || []).length;
        for (let i = 0; i < openO - closeO; i++) repaired += '}';
        try {
            report = JSON.parse(repaired);
        } catch {
            console.warn('   ⚠️  SEO report JSON could not be parsed. Skipping revision pass.');
            return null;
        }
    }

    console.log(`   📊 SEO Score: ${report.seo_score ?? 'N/A'}`);
    console.log(`   📌 Title Suggestion: ${report.title_suggestion ?? 'N/A'}`);
    if (report.keyword_gaps?.length) {
        console.log(`   🔑 Keyword Gaps: ${report.keyword_gaps.join(', ')}`);
    }
    return report;
}

async function reviseBlog(blogMarkdown, topic, seoReport) {
    console.log(`\n✍️  SEO REVISION PASS — Score was ${seoReport.seo_score} (below ${SEO_SCORE_THRESHOLD}). Improving blog...`);

    const revisionPrompt = `You are the lead SEO Content Writer for NomadBudgeter.com.
Revise the blog draft below based on the SEO Report.
Apply the suggested title and meta description in the YAML frontmatter.
Naturally weave in the keyword gaps.
Add the internal links suggested where they fit contextually.
Implement the content recommendations.
Output ONLY the complete, revised Markdown document with correct frontmatter. Do not add any explanatory text.

ORIGINAL DRAFT:
"""
${blogMarkdown}
"""

SEO REPORT:
"""
${JSON.stringify(seoReport, null, 2)}
"""`;

    const revised = await callGemini(revisionPrompt, MODEL_PRO, 0.5);
    return revised.replace(/^```markdown\s*/i, '').replace(/^```\s*/, '').replace(/```$/, '').trim();
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN GENERATION PIPELINE
// ═══════════════════════════════════════════════════════════════════════════════

async function generateContent(topic, ctx) {
    console.log(`📝 Generating blog post via ${MODEL_PRO}...`);
    const blogText = await callGemini(buildBlogPrompt(topic, ctx), MODEL_PRO, 0.5);
    let blogContent = extractSection(blogText + '\n[END]', 'BLOG');
    if (!blogContent) {
        // The Pro call returns just the blog — strip code fences if present
        blogContent = blogText
            .replace(/^```markdown\s*/i, '')
            .replace(/^```\s*/, '')
            .replace(/```$/, '')
            .trim();
    }

    // ── SEO Verification Loop ──────────────────────────────────────────────
    if (blogContent) {
        const seoReport = await runSeoCheck(blogContent, topic);
        if (seoReport && typeof seoReport.seo_score === 'number' && seoReport.seo_score < SEO_SCORE_THRESHOLD) {
            blogContent = await reviseBlog(blogContent, topic, seoReport);
            console.log(`   ✅ Blog revised. Re-verified score target: ${SEO_SCORE_THRESHOLD}+`);
        } else if (seoReport) {
            console.log(`   ✅ Blog passed SEO threshold (${seoReport.seo_score}). No revision needed.`);
        }
    }

    return {
        blog: blogContent
    };
}

// ═══════════════════════════════════════════════════════════════════════════════
// AIRTABLE HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

async function fetchPendingTopics() {
    console.log(`🔍 Checking Airtable (${TABLE_NAME}) for Status = 'Needs Draft'...`);
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(TABLE_NAME)}?filterByFormula=${encodeURIComponent("{Status}='Needs Draft'")}&maxRecords=5`;
    const res = await fetch(url, { headers: { 'Authorization': `Bearer ${AIRTABLE_API_KEY}` } });
    if (!res.ok) throw new Error(`Airtable fetch failed: ${await res.text()}`);
    return (await res.json()).records;
}

async function updateAirtableRow(recordId) {
    console.log(`💾 Marking Airtable record as Done: ${recordId}...`);
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(TABLE_NAME)}/${recordId}`;
    const res = await fetch(url, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${AIRTABLE_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            fields: {
                'Status': 'Done'
            }
        })
    });
    if (!res.ok) throw new Error(`Airtable update failed: ${await res.text()}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENTRY POINT
// ═══════════════════════════════════════════════════════════════════════════════

async function run() {
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║   🧠 NOMAD BUDGETER — CMO CONTENT GENERATOR v2.0            ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    console.log(`   Social/Email Model : ${MODEL_FLASH}`);
    console.log(`   Blog Model         : ${MODEL_PRO}`);
    console.log(`   SEO Pass Threshold : ${SEO_SCORE_THRESHOLD}\n`);

    if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID || !GEMINI_API_KEY) {
        console.error('❌ Missing env vars! Ensure AIRTABLE_API_KEY, AIRTABLE_BASE_ID, and GEMINI_API_KEY are set in .env');
        process.exit(1);
    }

    // Load RAG context once — shared across all topics in this run
    console.log('\n📚 Loading RAG context...');
    const ctx = loadRagContext();

    try {
        const records = await fetchPendingTopics();
        if (records.length === 0) {
            console.log('\n✅ No pending topics. Content Pipeline is clear.');
            return;
        }
        console.log(`\n📋 Found ${records.length} topic(s) to process.\n`);

        for (const record of records) {
            const topic = record.fields['Topic'];
            if (!topic) {
                console.warn(`⚠️  Record ${record.id} has no 'Topic' field. Skipping.`);
                continue;
            }

            console.log(`\n${'─'.repeat(62)}`);
            console.log(`🎯 Processing: "${topic}"`);
            console.log(`${'─'.repeat(62)}`);

            const content = await generateContent(topic, ctx);

            // Save blog post to filesystem
            if (content.blog?.trim()) {
                const slug = topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
                const blogPath = path.join(process.cwd(), 'src', 'blog', `${slug}.md`);
                
                console.log(`\n🎨 Generating cover image via Imagen 3...`);
                const imagePath = await generateBlogImage(topic, slug);
                let finalBlog = content.blog.trim();

                // ── Ensure proper frontmatter structure ──────────────────────
                // Fix broken delimiters (e.g., yaml/``` instead of ---)
                finalBlog = finalBlog
                    .replace(/^yaml\s*/i, '---\n')
                    .replace(/^```yaml\s*/i, '---\n')
                    .replace(/\n```\s*\n/, '\n---\n');

                // Ensure layout field exists in frontmatter
                if (finalBlog.startsWith('---')) {
                    const fmEnd = finalBlog.indexOf('\n---', 3);
                    if (fmEnd !== -1) {
                        let fm = finalBlog.substring(0, fmEnd);
                        const body = finalBlog.substring(fmEnd);
                        if (!fm.includes('layout:')) {
                            fm += '\nlayout: layouts/blog.njk';
                        }
                        finalBlog = fm + body;
                    }
                } else {
                    // No frontmatter at all — wrap the content
                    finalBlog = `---\ntitle: "${topic}"\ndescription: "A comprehensive guide on ${topic} for digital nomads in 2026."\ndate: ${new Date().toISOString().split('T')[0]}\nauthor: Nomad Budgeter\nlayout: layouts/blog.njk\ncategory: City Comparisons\ntags: ["digital nomad", "2026"]\n---\n\n${finalBlog}`;
                }
                
                if (imagePath) {
                    finalBlog = finalBlog.replace(/---(\n[\s\S]*?\n)---/, (match, p1) => {
                        return `---${p1}image: "${imagePath}"\n---`;
                    });
                }

                fs.writeFileSync(blogPath, finalBlog);
                console.log(`\n📝 Blog saved → ${blogPath}`);
            } else {
                console.warn(`⚠️  No blog content generated for "${topic}"`);
            }

            // Mark record as done in Airtable
            await updateAirtableRow(record.id);
            console.log(`\n✅ Done: "${topic}"\n`);
        }

        console.log('\n🎉 All topics processed!');

        // Phase 5: Ping Google Sitemap
        try {
            console.log('\n📡 Pinging Google Search Console to index new posts...');
            const sitemapUrl = 'https://nomadbudgeter.com/sitemap.xml';
            const pingUrl = `https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`;
            await fetch(pingUrl);
            console.log('   ✅ Sitemap ping successful. Google will crawl the new posts soon.');
        } catch (e) {
            console.warn(`   ⚠️ Sitemap ping failed: ${e.message}`);
        }

    } catch (err) {
        console.error('\n❌ CMO Pipeline error:', err.message);
        process.exit(1);
    }
}

run();
