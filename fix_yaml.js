const fs = require('fs');
const path = require('path');
const blogDir = './src/blog';
const files = fs.readdirSync(blogDir).filter(f => f.endsWith('.md'));

files.forEach(f => {
  const filePath = path.join(blogDir, f);
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  // Replace leading 'yaml' with '---'
  if (content.startsWith('yaml\n')) {
    content = '---\n' + content.slice(5);
    changed = true;
  } else if (content.startsWith('yaml\r\n')) {
    content = '---\r\n' + content.slice(6);
    changed = true;
  }

  // Replace '```' on a line by itself with '---' but ONLY if it's the end of frontmatter
  if (changed || content.startsWith('---\n') || content.startsWith('---\r\n')) {
     const lines = content.split(/\r?\n/);
     for (let i = 1; i < lines.length; i++) {
        if (lines[i] === '```') {
           lines[i] = '---';
           changed = true;
           content = lines.join('\n');
           break;
        } else if (lines[i] === '---') {
           // Already properly closed frontmatter
           break;
        }
     }
  }

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Fixed:', f);
  }
});
