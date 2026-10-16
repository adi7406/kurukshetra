import app from './app.js';
import { env } from './config/env.js';

const server = app.listen(env.PORT, () => {
  console.info(`Server is listening on port ${env.PORT} in ${env.NODE_ENV} mode`);
  console.info(`Health check available at http://localhost:${env.PORT}${env.API_PREFIX}/health`);
});

function gracefulShutdown(signal) {
  console.info(`Received ${signal}. Shutting down gracefully...`);
  server.close(() => {
    console.info('HTTP server closed cleanly.');
    process.exit(0);
  });

  // Force shutdown after timeout
  setTimeout(() => {
    console.error('Forceful shutdown after timeout.');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Promise Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception thrown:', error);
  process.exit(1);
});
