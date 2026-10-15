import { createApp } from './app.js';
import { ENV } from './config/env.js';
import prisma from './config/prisma.js';

const app = createApp();

const server = app.listen(ENV.PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 SE104 Finance Backend & Integration Service`);
  console.log(`📡 Server running on http://localhost:${ENV.PORT}`);
  console.log(`🛠️  Environment: ${ENV.NODE_ENV}`);
  console.log(`====================================================`);
});

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  console.log(`\nReceived ${signal}. Shutting down gracefully...`);
  server.close(async () => {
    console.log('HTTP server closed.');
    await prisma.$disconnect();
    console.log('Database disconnected.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

