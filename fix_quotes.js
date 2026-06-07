const fs = require('fs');
const path = require('path');
const blogDir = './src/blog';
const files = fs.readdirSync(blogDir).filter(f => f.endsWith('.md'));

files.forEach(f => {
  const filePath = path.join(blogDir, f);
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  const lines = content.split(/\r?\n/);
  let inFrontmatter = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (i === 0 && line === '---') {
      inFrontmatter = true;
      continue;
    }
    
    if (inFrontmatter && line === '---') {
      inFrontmatter = false;
      break; // Done with frontmatter
    }

    if (inFrontmatter) {
      const match = line.match(/^(title|description|meta_description):\s*(?!")(.+)$/);
      if (match) {
        const key = match[1];
        let val = match[2].trim();
        
        // Remove trailing or leading quotes if they exist but were matched incorrectly
        if (val.startsWith("'") && val.endsWith("'")) {
          val = val.slice(1, -1);
        }
        
        // Escape existing double quotes
        val = val.replace(/"/g, '\\"');
        
        lines[i] = `${key}: "${val}"`;
        changed = true;
      }
    }
  }

  if (changed) {
    fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
    console.log('Fixed quotes in:', f);
  }
});
