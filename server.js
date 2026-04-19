const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const ROOT = '.';

const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.xml': 'application/xml',
};

http.createServer((req, res) => {
    let url = req.url.split('?')[0];
    let filePath = path.join(ROOT, url === '/' ? 'index.html' : url);
    const ext = path.extname(filePath);
    const contentType = MIME_TYPES[ext] || 'text/plain';

    fs.readFile(filePath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.writeHead(404);
                res.end('File not found');
            } else {
                res.writeHead(500);
                res.end(`Server Error: ${err.code}`);
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
}).listen(PORT, () => {
    console.log(`✅ Nomad Budgeter preview server running at http://localhost:${PORT}`);
});
