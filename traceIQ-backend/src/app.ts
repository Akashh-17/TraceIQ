import express, { Application } from "express";
import helmet from "helmet";
import cors from "cors";
import { env } from "./config/env";
import { logger } from "./config/logger";
import { prisma } from "./config/prisma";
import healthRouter from "./routes/health";
import eventsRouter from "./routes/events.route";
import dashboardRouter from "./routes/dashboard.route";
import authRouter from "./routes/auth.routes";
import investigationRoutes from './routes/investigation.routes';
import detectionRoutes from './routes/detection.routes';
import actorsRoutes from './routes/actors.routes';
import usersRoutes from './routes/users.routes';
import apiKeysRoutes from './routes/apikeys.routes';
import webhookRoutes from './routes/webhook.routes';
import { notFoundHandler, globalErrorHandler } from "./middlewares/errorHandler";
import cookieParser from "cookie-parser";

const app: Application = express();

// Secure HTTP headers
app.use(helmet());

app.use(cors({
  origin: env.corsOrigin,
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use("/", healthRouter);
app.use("/api/v1/events",    eventsRouter);
app.use("/api/v1/dashboard", dashboardRouter);
app.use("/api/v1/auth",      authRouter);
app.use('/api/v1/ai/investigate', investigationRoutes);
app.use('/api/v1/detections', detectionRoutes);
app.use('/api/v1/actors', actorsRoutes);
app.use('/api/v1/users', usersRoutes);
app.use('/api/v1/api-keys', apiKeysRoutes);
app.use('/api/v1/webhooks', webhookRoutes);

app.use(notFoundHandler);
app.use(globalErrorHandler);

const server = app.listen(env.port, () => {
  logger.info(
    { port: env.port, env: env.nodeEnv },
    'Server running successfully'
  );
});

// Graceful shutdown — on SIGTERM (Docker/K8s stop) or SIGINT (Ctrl+C):
// 1. Stop accepting new connections
// 2. Wait for in-flight requests to finish
// 3. Disconnect Prisma (closes the PG connection pool)
// 4. Exit cleanly
async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, 'Shutdown signal received, closing server...');
  server.close(async () => {
    try {
      await prisma.$disconnect();
      logger.info('Prisma disconnected. Exiting.');
    } catch (err) {
      logger.error({ err }, 'Error during Prisma disconnect');
    } finally {
      process.exit(0);
    }
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

export default app;
