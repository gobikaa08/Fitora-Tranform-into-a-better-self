const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const nodemailer = require('nodemailer');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'Main files', 'fitora');

// SMTP Configuration Placeholder
// Update these with your actual SMTP credentials (e.g., Gmail, Outlook, etc.)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'YOUR_EMAIL@gmail.com',
        pass: 'YOUR_APP_PASSWORD'
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
    // Helper to send JSON responses
    const sendJson = (status, payload) => {
        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(payload));
    };

    // Helper to parse JSON body
    const parseBody = (cb) => {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                const data = JSON.parse(body || '{}');
                cb(null, data);
            } catch (err) {
                cb(err);
            }
        });
    };

    // API: Contact Form Submission
    if (req.method === 'POST' && req.url === '/send-message') {
        parseBody(async (err, data) => {
            if (err) return sendJson(400, { success: false, message: 'Invalid JSON request.' });
            try {
                console.log('Received FITORA contact form:', data);

                const mailOptions = {
                    from: `FITORA Contact Form <${data.email}>`,
                    to: 'gobikaa08@gmail.com',
                    subject: `New FITORA Inquiry from ${data.name || 'Visitor'}`,
                    text: `
                        Name: ${data.name}
                        Email: ${data.email}
                        Phone: ${data.phone || 'N/A'}
                        Subject / Goal: ${data.subject || 'General Inquiry'}
                        
                        Message:
                        ${data.message || 'No message provided.'}
                    `
                };

                // Demo mode fallback
                if (!transporter.transporter.options.auth.user || transporter.transporter.options.auth.user === 'YOUR_EMAIL@gmail.com') {
                    console.log('--- SIMULATED FITORA EMAIL SEND ---');
                    console.log('To: gobikaa08@gmail.com');
                    console.log('Subject:', mailOptions.subject);
                    console.log('Body:', mailOptions.text);
                    console.log('-----------------------------------');
                    
                    return sendJson(200, { 
                        success: true, 
                        message: `Thank you ${data.name || ''}! Your message has been received. Our team will contact you shortly!` 
                    });
                }

                await transporter.sendMail(mailOptions);
                return sendJson(200, { 
                    success: true, 
                    message: 'Your message has been sent successfully! We will get back to you within 24 hours.' 
                });
            } catch (error) {
                console.error('Email error:', error);
                return sendJson(500, { success: false, message: 'Failed to process inquiry. Please try again.' });
            }
        });
        return;
    }

    // API: Free Trial Pass / Trainer Consultation
    if (req.method === 'POST' && req.url === '/api/book-trial') {
        parseBody((err, data) => {
            if (err) return sendJson(400, { success: false, message: 'Invalid data.' });
            console.log('🎉 Free Trial Booking Received:', data);
            return sendJson(200, {
                success: true,
                message: `Congratulations ${data.name || 'Champion'}! Your Free 1-Day VIP Pass for ${data.preferredDate || 'your selected date'} is confirmed. Check your email (${data.email}) for access details!`
            });
        });
        return;
    }

    // API: Newsletter Subscription
    if (req.method === 'POST' && req.url === '/api/newsletter') {
        parseBody((err, data) => {
            if (err || !data.email) return sendJson(400, { success: false, message: 'Email required.' });
            console.log('📬 Newsletter Subscription:', data.email);
            return sendJson(200, {
                success: true,
                message: 'Welcome to the FITORA Inner Circle! You will receive our latest workout routines and nutrition guides.'
            });
        });
        return;
    }

    // API: Simulated Checkout
    if (req.method === 'POST' && req.url === '/api/checkout') {
        parseBody((err, data) => {
            if (err) return sendJson(400, { success: false, message: 'Invalid checkout request.' });
            const orderId = 'FIT-' + Math.floor(100000 + Math.random() * 900000);
            console.log(`🛍️ FITORA Order Placed [${orderId}]:`, data);
            return sendJson(200, {
                success: true,
                orderId: orderId,
                message: `Order #${orderId} confirmed! Thank you for choosing FITORA. A confirmation has been sent to ${data.email || 'your email'}.`
            });
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
    console.log(`  ⚡ FITORA Premium Fitness & Wellness Platform ⚡ `);
    console.log(`  Server running at: ${url}`);
    console.log(`  Serving files from: ${PUBLIC_DIR}`);
    console.log(`====================================================`);

    // Auto open in user's default browser if not headless
    if (process.env.AUTO_OPEN !== 'false') {
        const startCmd = process.platform === 'win32' ? `start ${url}` : process.platform === 'darwin' ? `open ${url}` : `xdg-open ${url}`;
        exec(startCmd, (error) => {
            if (error) {
                console.log(`Open in your browser: ${url}`);
            } else {
                console.log(`Successfully opened browser to ${url}`);
            }
        });
    }
});
