module.exports = function config(eleventyConfig) {
  // ─── Passthrough Copy ───
  eleventyConfig.addPassthroughCopy("src/assets");
  eleventyConfig.addPassthroughCopy("src/css");
  eleventyConfig.addPassthroughCopy("src/js");
  eleventyConfig.addPassthroughCopy("src/robots.txt");
  eleventyConfig.addPassthroughCopy({"src/_data/rates.json": "api/rates.json"});

  // ─── Custom Filters ───

  // Format number as USD currency
  eleventyConfig.addFilter("usd", function (value) {
    if (typeof value !== "number") return "$0";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
    }).format(value);
  });

  // Format number as USD currency with decimals
  eleventyConfig.addFilter("usdPrecise", function (value) {
    if (typeof value !== "number") return "$0.00";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  });

  // Format as percentage
  eleventyConfig.addFilter("percent", function (value) {
    if (typeof value !== "number") return "0%";
    return (value * 100).toFixed(1) + "%";
  });

  // Format percentage as integer (no decimal)
  eleventyConfig.addFilter("percentInt", function (value) {
    if (typeof value !== "number") return "0%";
    return Math.round(value * 100) + "%";
  });

  // Capitalize first letter
  eleventyConfig.addFilter("capitalize", function (value) {
    if (!value) return "";
    return value.charAt(0).toUpperCase() + value.slice(1);
  });

  // Format number with locale commas (e.g., 2400 → "2,400")
  eleventyConfig.addFilter("localeString", function (value) {
    if (typeof value !== "number") return "0";
    return value.toLocaleString("en-US");
  });

  // Absolute value
  eleventyConfig.addFilter("abs", function (value) {
    return Math.abs(value);
  });

  // Slice an array (start, end)
  eleventyConfig.addFilter("slice", function (arr, start, end) {
    if (!Array.isArray(arr)) return arr;
    return arr.slice(start, end);
  });

  // Convert country code to emoji flag
  eleventyConfig.addFilter("countryEmoji", function(countryCode) {
    if (!countryCode) return "";
    return countryCode
      .toUpperCase()
      .replaceAll(/./g, (char) => String.fromCodePoint(char.codePointAt(0) + 127397));
  });

  // Format date string
  eleventyConfig.addFilter("formatDate", function(dateString) {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { year: 'numeric', month: 'short', day: 'numeric' });
  });

  // ISO date for structured data
  eleventyConfig.addFilter("isoDate", function(dateString) {
    if (!dateString) return "";
    return new Date(dateString).toISOString();
  });

  // Truncate string to N characters
  eleventyConfig.addFilter("truncate", function(str, len) {
    if (!str) return "";
    if (str.length <= len) return str;
    return str.substring(0, len).replace(/\s+\S*$/, '') + '…';
  });

  // Get current year
  eleventyConfig.addShortcode("year", () => `${new Date().getFullYear()}`);

  // Get current month name
  eleventyConfig.addShortcode("monthYear", () => {
    const d = new Date();
    return d.toLocaleString("en-US", { month: "long", year: "numeric" });
  });

  // Get exact build time for EEAT
  eleventyConfig.addShortcode("buildTime", () => {
    const d = new Date();
    return d.toLocaleString("en-US", { month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "numeric", timeZoneName: "short" });
  });

  // Get current date for sitemap
  eleventyConfig.addShortcode("sitemapDate", () => {
    return new Date().toISOString().split('T')[0];
  });

  // Vercel Image Optimization Filter
  eleventyConfig.addFilter("vimg", function (url, width = 800, quality = 75) {
    if (!url) return "";
    // If it's already an optimized URL or local, return as is
    if (url.startsWith('/_vercel/image')) return url;
    
    // Construct Vercel Image Optimization URL
    const encodedUrl = encodeURIComponent(url);
    return `/_vercel/image?url=${encodedUrl}&w=${width}&q=${quality}`;
  });

  // Affiliate URL with page-context UTM tracking
  // Usage: {{ site.affiliates.wise.url | affUrl("showdown") }}
  eleventyConfig.addFilter("affUrl", function (baseUrl, placement) {
    if (!baseUrl) return "";
    const sep = baseUrl.includes("?") ? "&" : "?";
    return `${baseUrl}${sep}utm_content=${placement || "general"}`;
  });

  // Object keys filter for iterating showdown slugs in Nunjucks
  eleventyConfig.addFilter("keys", obj => obj ? Object.keys(obj) : []);

  // Object-aware length (Nunjucks only counts arrays natively)
  eleventyConfig.addFilter("objLength", obj =>
    Array.isArray(obj) ? obj.length : Object.keys(obj || {}).length
  );

  // ─── Collections ───

  // Collection of all showdown pages (rich city-vs-city deep dives)
  eleventyConfig.addCollection("showdownPages", function (collectionApi) {
    return collectionApi.getFilteredByGlob("src/compare/showdown.njk");
  });

  // Collection of all city pages
  eleventyConfig.addCollection("cityPages", function (collectionApi) {
    return collectionApi.getFilteredByGlob("src/cities/**/*.njk");
  });

  // Collection of all comparison pages
  eleventyConfig.addCollection("comparisonPages", function (collectionApi) {
    return collectionApi.getFilteredByGlob("src/compare/**/*.njk");
  });

  // Collection of all visa guide pages
  eleventyConfig.addCollection("visaPages", function (collectionApi) {
    return collectionApi.getFilteredByGlob("src/visas/**/*.njk");
  });

  // Collection of all blog posts (sorted by date)
  eleventyConfig.addCollection("blogPosts", function (collectionApi) {
    return collectionApi.getFilteredByGlob(["src/blog/*.njk", "src/blog/*.md"])
      .filter(item => !item.data.eleventyExcludeFromCollections && item.data.date)
      .sort((a, b) => new Date(a.data.date) - new Date(b.data.date));
  });

  // ─── Config ───
  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      data: "_data",
    },
    templateFormats: ["njk", "md", "html"],
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk",
  };
};
