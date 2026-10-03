const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const config = require('./config');
const routes = require('./routes');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();

app.use(helmet());
app.use(cors({ origin: config.corsOrigin, credentials: true }));

// Enforce payload limit to prevent unbounded inputs (no file uploads supported)
app.use(express.json({ limit: '10kb' }));

// Safe logging: HTTP method, URL, status, response time. No raw request bodies are ever logged.
app.use(morgan(config.nodeEnv === 'development' ? 'dev' : 'combined'));

// Mount API routes (per-endpoint strict Zod schemas enforce unknown-key rejection)
app.use('/api', routes);

// Central error handler
app.use(errorHandler);

module.exports = app;
