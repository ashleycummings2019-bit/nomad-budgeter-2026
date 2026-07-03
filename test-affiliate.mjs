import fs from 'fs';
import path from 'path';
const blogDir = path.join(process.cwd(), 'src', 'blog');
const files = fs.readdirSync(blogDir).filter(f => f.endsWith('.md') || f.endsWith('.njk'));
const urlRegex = /\[([^\]]+)\]\((https:\/\/(?:wise\.prf\.hn|wise\.com|safetywing\.com|www\.agoda\.com|lexidy\.com|ektatraveling\.tp\.st)[^\)]*)\)/g;
for (const file of files) {
    console.log("Processing", file);
    const filePath = path.join(blogDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    content.replace(urlRegex, () => '');
}
console.log("Done");
