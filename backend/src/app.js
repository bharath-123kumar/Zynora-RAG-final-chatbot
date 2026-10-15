const express = require('express');
const cors = require('cors');
const config = require('./config/env');
const requestLogger = require('./middleware/structuredLogger');
const { errorHandler, notFoundHandler } = require('./middleware/errorMiddleware');

const healthRoutes = require('./routes/healthRoutes');
const authRoutes = require('./routes/authRoutes');
const chatRoutes = require('./routes/chatRoutes');
const conversationRoutes = require('./routes/conversationRoutes');
const knowledgeRoutes = require('./routes/knowledgeRoutes');
const monitoringRoutes = require('./routes/monitoringRoutes');
const inspectorRoutes = require('./routes/inspectorRoutes');

const app = express();

// Security & CORS configuration
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  config.CORS_ORIGIN
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (Postman, curl, internal tests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || origin.endsWith('.onrender.com') || origin.endsWith('.vercel.app')) {
      return callback(null, true);
    }
    return callback(null, true); // Dev-friendly fallback
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-trace-id']
}));

// Body parsing with strict limits
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Structured HTTP Request Logging
app.use(requestLogger);

// Mount API routes
app.use('/', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/zynora', chatRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/knowledge', knowledgeRoutes);
app.use('/api/monitoring', monitoringRoutes);
app.use('/api/admin', inspectorRoutes);

// Error Handling
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
