const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const nodemailer = require('nodemailer');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'Main files', 'agriva');

// SMTP Configuration Placeholder
// Update these with your actual SMTP credentials (e.g., Gmail, Outlook, etc.)
const transporter = nodemailer.createTransport({
    service: 'gmail', // or your SMTP host
    auth: {
        user: 'YOUR_EMAIL@gmail.com', // Replace with your email
        pass: 'YOUR_APP_PASSWORD'     // Replace with your app-specific password
    }
});

const MIME_TYPES = {
    '.html': 'text/html; charset=UTF-8',
    '.css': 'text/css; charset=UTF-8',
    '.js': 'application/javascript; charset=UTF-8',
    '.json': 'application/json; charset=UTF-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.webp': 'image/webp',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.eot': 'application/vnd.ms-fontobject',
    '.otf': 'font/otf'
};

const server = http.createServer((req, res) => {
    // Handle form submission (POST request)
    if (req.method === 'POST' && req.url === '/send-message') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', async () => {
            try {
                const data = JSON.parse(body);
                console.log('Received message request:', data);

                const mailOptions = {
                    from: `FITORA Contact Form <${data.email}>`,
                    to: 'gobikaa08@gmail.com',
                    subject: `New Message from ${data.name} via FITORA`,
                    text: `
                        Name: ${data.name}
                        Email: ${data.email}
                        Phone: ${data.phone || 'N/A'}
                        
                        Message:
                        ${data.message}
                    `
                };

                // In this environment, we simulate the send if credentials aren't set
                if (transporter.transporter.options.auth.user === 'YOUR_EMAIL@gmail.com') {
                    console.log('--- SIMULATED EMAIL SEND ---');
                    console.log('To: gobikaa08@gmail.com');
                    console.log('Subject:', mailOptions.subject);
                    console.log('Body:', mailOptions.text);
                    console.log('----------------------------');
                    
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ 
                        success: true, 
                        message: 'Demo Mode: Message captured and logged! (Configure SMTP in serve.js for real delivery)' 
                    }));
                } else {
                    await transporter.sendMail(mailOptions);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ 
                        success: true, 
                        message: 'Message sent successfully to gobikaa08@gmail.com!' 
                    }));
                }
            } catch (error) {
                console.error('Email error:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, message: 'Failed to send message.' }));
            }
        });
        return;
    }

    // Normalize URL and remove query strings
    const reqUrl = new URL(req.url, `http://localhost:${PORT}`);
    let pathname = decodeURIComponent(reqUrl.pathname);

    if (pathname === '/' || pathname === '') {
        pathname = '/index.html';
    }

    const filePath = path.join(PUBLIC_DIR, pathname);

    // Prevent directory traversal attacks
    if (!filePath.startsWith(PUBLIC_DIR)) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        res.end('Forbidden');
        return;
    }

    fs.stat(filePath, (err, stats) => {
        if (err) {
            // Check if user requested a page without .html extension
            if (fs.existsSync(filePath + '.html')) {
                fs.readFile(filePath + '.html', (readErr, content) => {
                    if (readErr) {
                        res.writeHead(500, { 'Content-Type': 'text/plain' });
                        res.end('Server Error');
                    } else {
                        res.writeHead(200, { 'Content-Type': 'text/html; charset=UTF-8' });
                        res.end(content);
                    }
                });
                return;
            }

            // Return custom 404 page if available
            const errorPage = path.join(PUBLIC_DIR, '404.html');
            if (fs.existsSync(errorPage)) {
                fs.readFile(errorPage, (readErr, content) => {
                    res.writeHead(404, { 'Content-Type': 'text/html; charset=UTF-8' });
                    res.end(content);
                });
            } else {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('404 Not Found');
            }
            return;
        }

        if (stats.isDirectory()) {
            const indexPath = path.join(filePath, 'index.html');
            if (fs.existsSync(indexPath)) {
                fs.readFile(indexPath, (readErr, content) => {
                    if (readErr) {
                        res.writeHead(500, { 'Content-Type': 'text/plain' });
                        res.end('Server Error');
                    } else {
                        res.writeHead(200, { 'Content-Type': 'text/html; charset=UTF-8' });
                        res.end(content);
                    }
                });
            } else {
                res.writeHead(403, { 'Content-Type': 'text/plain' });
                res.end('Directory listing forbidden');
            }
            return;
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        fs.readFile(filePath, (readErr, content) => {
            if (readErr) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Error loading file');
            } else {
                res.writeHead(200, { 'Content-Type': contentType });
                res.end(content);
            }
        });
    });
});

server.listen(PORT, () => {
    const url = `http://localhost:${PORT}`;
    console.log(`====================================================`);
    console.log(`  🌾 Agriva Agriculture & Organic Farm Website 🌾 `);
    console.log(`  Server running at: ${url}`);
    console.log(`  Serving files from: ${PUBLIC_DIR}`);
    console.log(`====================================================`);

    // Auto open in user's default browser
    const startCmd = process.platform === 'win32' ? `start ${url}` : process.platform === 'darwin' ? `open ${url}` : `xdg-open ${url}`;
    exec(startCmd, (error) => {
        if (error) {
            console.log(`Open in your browser: ${url}`);
        } else {
            console.log(`Successfully opened browser to ${url}`);
        }
    });
});
