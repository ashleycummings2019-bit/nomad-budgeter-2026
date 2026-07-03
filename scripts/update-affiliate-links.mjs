import fs from 'fs';
import path from 'path';

const blogDir = path.join(process.cwd(), 'src', 'blog');
const files = fs.readdirSync(blogDir).filter(f => f.endsWith('.md') || f.endsWith('.njk'));

const urlRegex = /\[([^\]]+)\]\((https:\/\/(?:wise\.prf\.hn|wise\.com|safetywing\.com|www\.agoda\.com|lexidy\.com|ektatraveling\.tp\.st)[^\)]*)\)/g;

let count = 0;
for (const file of files) {
    const filePath = path.join(blogDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    
    const newContent = content.replace(urlRegex, (match, text, url) => {
        // Strip out strong/bold inside the text
        const cleanText = text.replace(/\*\*/g, '');
        count++;
        return `{% affiliateButton "${cleanText}", "${url}" %}`;
    });

    if (content !== newContent) {
        fs.writeFileSync(filePath, newContent);
    }
}
console.log(`Replaced ${count} affiliate links.`);
