/**
 * ╔══════════════════════════════════════════════╗
 * ║     🌐 SOURCE VERIFIER — Real-Time Checker    ║
 * ╚══════════════════════════════════════════════╝
 *
 * Actually fetches the source URLs that the Researcher claims
 * and extracts readable text from the page. This gives the
 * Auditor REAL page content to verify claims against — not
 * just LLM reasoning about whether a URL "looks legit."
 *
 * This is the difference between:
 *   ❌ "The URL domain seems legitimate" (guessing)
 *   ✅ "The page says X, the finding says Y, they match" (proof)
 */

/**
 * Fetch a URL and extract readable text content.
 * Returns a trimmed snippet (max ~3000 chars to save tokens).
 */
export async function fetchSourceContent(url, maxChars = 3000) {
  if (!url || url === 'null' || url === 'undefined') {
    return { success: false, error: 'No URL provided', content: null };
  }

  // Basic URL validation
  try {
    new URL(url);
  } catch {
    return { success: false, error: 'Invalid URL format', content: null };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000); // 15s timeout

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NomadBudgeterBot/1.0; +https://nomadbudgeter.com)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
    });
    clearTimeout(timeout);

    if (!res.ok) {
      return {
        success: false,
        error: `HTTP ${res.status} ${res.statusText}`,
        content: null,
        finalUrl: res.url,
      };
    }

    const html = await res.text();

    // Strip HTML tags, scripts, styles to get readable text
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[\s\S]*?<\/nav>/gi, '')
      .replace(/<footer[\s\S]*?<\/footer>/gi, '')
      .replace(/<header[\s\S]*?<\/header>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#\d+;/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    // Return a meaningful snippet
    const snippet = text.slice(0, maxChars);

    return {
      success: true,
      content: snippet,
      finalUrl: res.url,
      contentLength: text.length,
    };
  } catch (err) {
    clearTimeout(timeout);
    const errorMsg = err.name === 'AbortError' ? 'Request timed out (15s)' : err.message;
    return { success: false, error: errorMsg, content: null };
  }
}

/**
 * Verify multiple source URLs in parallel.
 * Returns a map of { url: { success, content, error } }
 */
export async function verifySourceUrls(urls) {
  const uniqueUrls = [...new Set(urls.filter(u => u && u !== 'null'))];
  const results = {};

  // Fetch in parallel with concurrency limit of 3
  const chunks = [];
  for (let i = 0; i < uniqueUrls.length; i += 3) {
    chunks.push(uniqueUrls.slice(i, i + 3));
  }

  for (const chunk of chunks) {
    const fetches = chunk.map(async (url) => {
      const result = await fetchSourceContent(url);
      results[url] = result;
      if (result.success) {
        console.log(`   🌐 FETCHED: ${url.slice(0, 70)}... (${result.contentLength} chars)`);
      } else {
        console.log(`   🔴 FAILED:  ${url.slice(0, 70)}... (${result.error})`);
      }
    });
    await Promise.all(fetches);
  }

  return results;
}
