module.exports = function (eleventyConfig) {
  // ─── Passthrough Copy ───
  eleventyConfig.addPassthroughCopy("src/assets");
  eleventyConfig.addPassthroughCopy("src/css");
  eleventyConfig.addPassthroughCopy("src/js");
  eleventyConfig.addPassthroughCopy("src/robots.txt");

  // ─── Custom Filters ───

  // Format number as USD currency
  eleventyConfig.addFilter("usd", function (value) {
    if (typeof value !== "number") return "$0";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
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
      .replace(/./g, (char) => String.fromCodePoint(char.charCodeAt(0) + 127397));
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

  // ─── Collections ───

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
