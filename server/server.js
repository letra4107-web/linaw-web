require('dotenv').config();
const { assertServerConfig } = require('./config/validateConfig');
assertServerConfig();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const adminRoutes = require('./routes/admin');
const teacherRoutes = require('./routes/teacher');
const parentRoutes = require('./routes/parent');
const studentRoutes = require('./routes/student');
const ttsRoutes = require('./routes/tts');
const notificationsRoutes = require('./routes/notifications');
const { requestObservability } = require('./middleware/observability');

const app = express();
const apiCompatibilityVersion = String(process.env.API_COMPATIBILITY_VERSION || '3');
const appVersion = String(process.env.APP_VERSION || require('./package.json').version);
const commit = String(process.env.GIT_COMMIT_SHA || '').slice(0, 12) || null;
app.disable('x-powered-by');
app.set('trust proxy', 1);

const configuredOrigins = String(process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(helmet({
  // This server returns JSON/audio data rather than rendering the frontend.
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: false,
  strictTransportSecurity: process.env.NODE_ENV === 'production' ? undefined : false,
}));
app.use(cors({
  origin(origin, callback) {
    if (!origin || configuredOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Origin not allowed by CORS.'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Authorization', 'Content-Type'],
  maxAge: 86400,
}));
app.use(express.json({ limit: '1mb', strict: true }));
app.use(requestObservability);
app.use((req, res, next) => {
  res.setHeader('X-API-Compatibility-Version', apiCompatibilityVersion);
  next();
});
app.use((req, res, next) => {
  req.setTimeout(30_000);
  res.setTimeout(30_000);
  next();
});
app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000,
  // A generous shared-IP safety net for classrooms; sensitive operations use
  // stricter authenticated-user limiters inside their route modules.
  limit: 3000,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: (req) => req.path === '/health',
  message: { error: 'Too many requests. Please wait and try again.' },
}));

app.get('/api/health', (_req, res) => res.json({
  ok: true,
  environment: process.env.NODE_ENV || 'development',
  timestamp: new Date().toISOString(),
  version: appVersion,
  commit,
  apiCompatibilityVersion,
}));
app.use('/api/admin', adminRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/parent', parentRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/tts', ttsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use((req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, req, res, _next) => {
  console.error('[unhandled]', err);
  if (err?.type === 'entity.parse.failed') return res.status(400).json({ error: 'Malformed JSON request.' });
  if (err?.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'PDF is too large (maximum 15 MB).' });
  if (err?.message === 'Only PDF files are allowed.') return res.status(400).json({ error: err.message });
  if (err?.message === 'Origin not allowed by CORS.') return res.status(403).json({ error: 'Origin not allowed.' });
  return res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 4000;
let server;
if (require.main === module) {
  server = app.listen(PORT, () => console.log(`LinawLetra web API listening on :${PORT}`));
  server.requestTimeout = 35_000;
  server.headersTimeout = 40_000;
  server.keepAliveTimeout = 5_000;
}

module.exports = { app, server };
