// ─── PASTE THESE ADDITIONS INTO YOUR EXISTING .eleventy.js ───────────────────
//
// Add the `keys` filter so Nunjucks can iterate showdown slugs:
//
//   eleventyConfig.addFilter("keys", obj => Object.keys(obj));
//
// Add the `length` filter for objects (Nunjucks counts arrays, not objects):
//
//   eleventyConfig.addFilter("length", obj =>
//     Array.isArray(obj) ? obj.length : Object.keys(obj).length
//   );
//
// If you want a dedicated Eleventy collection for showdowns
// (useful for sitemaps, RSS, etc.):
//
//   eleventyConfig.addCollection("showdowns", collectionApi => {
//     return collectionApi
//       .getFilteredByGlob("compare/city/*/index.njk")
//       .sort((a, b) => a.data.slug.localeCompare(b.data.slug));
//   });
//
// ─── FULL MINIMAL EXAMPLE ────────────────────────────────────────────────────

module.exports = function(eleventyConfig) {

  // ── Passthrough ──────────────────────────────────────────────────────────
  eleventyConfig.addPassthroughCopy("src/assets");
  eleventyConfig.addPassthroughCopy("src/img");

  // ── Filters ──────────────────────────────────────────────────────────────

  // Iterate object keys in Nunjucks: {{ showdowns | keys }}
  eleventyConfig.addFilter("keys", obj => Object.keys(obj));

  // Object-aware length: {{ showdowns | length }}
  eleventyConfig.addFilter("length", obj =>
    Array.isArray(obj) ? obj.length : Object.keys(obj).length
  );

  // ISO date format for sitemaps and JSON-LD
  eleventyConfig.addFilter("isoDate", dateStr => {
    const d = dateStr ? new Date(dateStr) : new Date();
    return d.toISOString().split("T")[0];
  });

  // ── Collections ──────────────────────────────────────────────────────────

  // All showdown pages — used by sitemap.njk and RSS
  eleventyConfig.addCollection("showdowns", collectionApi =>
    collectionApi
      .getFilteredByGlob("**/compare/city/*/index.njk")
      .sort((a, b) => a.data.slug.localeCompare(b.data.slug))
  );

  // ── Config ───────────────────────────────────────────────────────────────
  return {
    dir: {
      input:    "src",          // adjust to match your project structure
      output:   "_site",
      includes: "_includes",
      data:     "_data",
    },
    templateFormats: ["njk", "md", "html"],
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk",
  };
};
