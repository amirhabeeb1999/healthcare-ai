require('dotenv').config();
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const path = require('path');
const { initDatabase } = require('./db/schema');
const { seedDatabase } = require('./db/seed');

// Validate JWT_SECRET strength on startup
const WEAK_SECRETS = ['dev-secret', 'secret', 'password', 'changeme', 'CHANGE_ME_TO_A_RANDOM_64_CHAR_STRING', ''];
if (!process.env.JWT_SECRET || WEAK_SECRETS.includes(process.env.JWT_SECRET)) {
    if (process.env.NODE_ENV === 'production') {
        console.error('[FATAL] JWT_SECRET is missing or too weak for production. Set a strong random secret in .env');
        process.exit(1);
    } else {
        // Auto-generate a session-only secret for dev
        process.env.JWT_SECRET = crypto.randomBytes(48).toString('hex');
        console.warn('[WARN] No strong JWT_SECRET in .env — generated a temporary one for this session.');
    }
}

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: function (origin, callback) {
        const allowedOrigins = [
            'http://localhost:3000',
            'http://127.0.0.1:3000'
        ];
        // Allow App Runner domains and no-origin requests (like health checks)
        if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.awsapprunner.com')) {
            callback(null, true);
        } else {
            callback(null, true); // Allow all origins in production for now
        }
    },
    credentials: true
}));
app.use(express.json({ limit: '1mb' }));

// Catch malformed JSON body
app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({ error: 'Invalid JSON in request body' });
    }
    next(err);
});

// Audit logging middleware
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        if (req.path !== '/api/health') {
            console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
        }
    });
    next();
});

async function start() {
    try {
        // Initialize database
        const db = await initDatabase(process.env.DB_PATH);
        seedDatabase(db);

        // Make db available to routes
        app.use((req, res, next) => {
            req.db = db;
            next();
        });

        // Routes
        app.use('/api/auth', require('./routes/auth'));
        app.use('/api/patients', require('./routes/patients'));
        app.use('/api/ai', require('./routes/ai'));

        // Health check
        app.get('/api/health', (req, res) => {
            res.json({ status: 'ok', timestamp: new Date().toISOString(), service: 'healthcare-ai-backend' });
        });

        // Serve frontend static files (Next.js export)
        const frontendPath = path.join(__dirname, '..', 'frontend', 'out');
        const fs = require('fs');
        if (fs.existsSync(frontendPath)) {
            console.log(`[INFO] Serving frontend from: ${frontendPath}`);
            app.use(express.static(frontendPath));

            // SPA fallback: serve index.html for all non-API routes
            app.get('*', (req, res, next) => {
                if (req.path.startsWith('/api')) return next();
                // Try to serve the exact file first (e.g. /patients.html)
                const filePath = path.join(frontendPath, req.path + '.html');
                if (fs.existsSync(filePath)) {
                    return res.sendFile(filePath);
                }
                // Try index.html in directory (e.g. /patients/index.html)
                const dirIndex = path.join(frontendPath, req.path, 'index.html');
                if (fs.existsSync(dirIndex)) {
                    return res.sendFile(dirIndex);
                }
                // Fallback to root index.html for client-side routing
                res.sendFile(path.join(frontendPath, 'index.html'));
            });
        } else {
            console.log('[INFO] No frontend build found. API-only mode.');
            app.get('/', (req, res) => {
                res.json({ message: 'Healthcare AI API', health: '/api/health' });
            });
        }

        // Error handler
        app.use((err, req, res, next) => {
            console.error(`[ERROR] ${err.message}`);
            res.status(err.status || 500).json({
                error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
            });
        });

        app.listen(PORT, () => {
            console.log(`\n🏥 Healthcare AI running on http://localhost:${PORT}`);
            console.log(`📋 Health check: http://localhost:${PORT}/api/health`);
            console.log(`🔑 Demo login: dr.smith / password123\n`);
        });
    } catch (err) {
        console.error('[FATAL] Failed to start server:', err);
        process.exit(1);
    }
}

start();
