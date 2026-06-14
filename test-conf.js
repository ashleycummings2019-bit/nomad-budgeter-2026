
module.exports = function(eleventyConfig) { const cfg = require('./.eleventy.js')(eleventyConfig); eleventyConfig.ignores.add('src/blog/**'); eleventyConfig.ignores.add('src/compare/**'); eleventyConfig.ignores.add('src/cities/**'); eleventyConfig.ignores.add('src/visas/**'); eleventyConfig.ignores.add('src/trends/**'); return cfg; }
