const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const FILE_PATH = path.join(__dirname, 'standalone_ui.html');

const server = http.createServer((req, res) => {
    fs.readFile(FILE_PATH, (err, content) => {
        if (err) {
            res.writeHead(500);
            res.end('Error loading standalone_ui.html');
            return;
        }
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(content);
    });
});

server.listen(PORT, () => {
    console.log(`\x1b[35m🚀 FRONTEND RUNNING AT: http://localhost:${PORT}\x1b[0m`);
    console.log(`Open this URL in your browser to interact with the SecureTx System.`);
});
