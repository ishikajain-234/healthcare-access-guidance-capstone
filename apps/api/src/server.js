const app = require('./app');
const config = require('./config');
const db = require('./db');

const server = app.listen(config.port, () => {
  console.log(`[Healthcare Access Guidance API] Server running on port ${config.port} in ${config.nodeEnv} mode.`);
  console.log(`[SAFETY NOTICE] This is an academic demonstration prototype using synthetic data only.`);
});

function gracefulShutdown(signal) {
  console.log(`[Healthcare Access Guidance API] Received ${signal}. Initiating graceful shutdown...`);
  server.close(async () => {
    console.log('[Healthcare Access Guidance API] HTTP server closed.');
    try {
      await db.pool.end();
      console.log('[Healthcare Access Guidance API] Database connection pool drained.');
      process.exit(0);
    } catch (err) {
      console.error('[Healthcare Access Guidance API] Error during pool drain:', err);
      process.exit(1);
    }
  });

  setTimeout(() => {
    console.error('[Healthcare Access Guidance API] Graceful shutdown timeout exceeded. Forcing exit.');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

module.exports = server;
