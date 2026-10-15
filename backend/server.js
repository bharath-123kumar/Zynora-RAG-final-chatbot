const app = require('./src/app');
const config = require('./src/config/env');
const db = require('./src/db/dbClient');
const { runMigrations } = require('./src/db/migrations/migrate');
const { seedDatabase } = require('./src/db/seeds/seed');
const logger = require('./src/utils/logger');

async function startServer() {
  try {
    console.log('Initializing database connection & migrations...');
    await runMigrations();

    // Check if users exist, otherwise run seed
    const usersCountRes = await db.query('SELECT COUNT(*) AS count FROM users');
    const userCount = parseInt(usersCountRes.rows[0]?.count || 0, 10);
    if (userCount === 0) {
      console.log('Initial setup detected: auto-seeding default users and knowledge base...');
      await seedDatabase();
    }

    const PORT = config.PORT;
    const server = app.listen(PORT, () => {
      const publicUrl = process.env.RENDER_EXTERNAL_URL;
      console.log(`=======================================================`);
      console.log(`🚀 Zynora RAG Chatbot Server running on port ${PORT}`);
      if (publicUrl) {
        console.log(`🌐 Public URL:    ${publicUrl}`);
        console.log(`🏥 Health Check:  ${publicUrl}/health`);
        console.log(`📊 API Version:   ${publicUrl}/api/version`);
      } else {
        console.log(`🔗 Local Address: http://localhost:${PORT}`);
        console.log(`🏥 Health Check:  http://localhost:${PORT}/health`);
        console.log(`📊 API Version:   http://localhost:${PORT}/api/version`);
      }
      console.log(`=======================================================`);

      logger.info({
        action: 'SERVER_BOOT',
        module: 'SERVER',
        status: 'SUCCESS',
        details: { port: PORT, env: config.NODE_ENV, version: config.APP_VERSION }
      });
    });

    // Handle port-in-use gracefully so nodemon shows a clear message instead of crashing
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`\n❌ Port ${PORT} is already in use.`);
        console.error(`   Run this to free it:  npx kill-port ${PORT}`);
        console.error(`   Or on Windows:        netstat -ano | findstr :${PORT}  then  taskkill /PID <pid> /F\n`);
        logger.error({
          action: 'SERVER_BOOT',
          module: 'SERVER',
          status: 'EADDRINUSE',
          details: { port: PORT }
        });
        process.exit(1);
      } else {
        throw err;
      }
    });

    // Graceful shutdown handling
    const shutdown = async (signal) => {
      console.log(`Received ${signal}. Shutting down gracefully...`);
      server.close(async () => {
        await db.close();
        console.log('Database connections closed. Process terminating.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    return server;
  } catch (err) {
    console.error('Fatal server boot failure:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = { startServer };
