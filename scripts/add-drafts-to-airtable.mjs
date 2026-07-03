import fs from 'fs';
import path from 'path';

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const TABLE_NAME = 'Content Pipeline';

async function run() {
    function getFiles(dir) {
        let results = [];
        const list = fs.readdirSync(dir);
        list.forEach(file => {
            file = path.join(dir, file);
            const stat = fs.statSync(file);
            if (stat && stat.isDirectory()) {
                results = results.concat(getFiles(file));
            } else if (file.endsWith('.md')) {
                results.push(file);
            }
        });
        return results;
    }
    
    const blogDir = path.join(process.cwd(), 'src', 'blog');
    const files = getFiles(blogDir);

    for (const filePath of files) {
        const content = fs.readFileSync(filePath, 'utf8');
        if (content.includes('draft: true')) {
            const titleMatch = content.match(/title:\s*"([^"]+)"/);
            if (titleMatch) {
                const topic = titleMatch[1];
                console.log(`Adding to Airtable: ${topic}`);
                const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(TABLE_NAME)}`;
                const res = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        records: [{ fields: { 'Topic': topic, 'Status': 'Needs Draft' } }]
                    })
                });
                if (!res.ok) {
                    console.error('Failed to add:', await res.text());
                } else {
                    console.log('Added successfully.');
                    // Delete the old local draft so it gets cleanly replaced by the CMO generator
                    fs.unlinkSync(filePath);
                }
            }
        }
    }
}

run();
