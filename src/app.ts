// src/app.ts
//
// Entry point for the Express application.
// This file wires everything together: middleware, routes, error handling.
// Think of it as the "main hub" — it doesn't do any logic itself,
// it just connects the pieces in the right order.
//
// ORDER MATTERS in Express:
//   1. Body parsers first (so req.body exists for all routes)
//   2. Routes
//   3. 404 handler (catches unmatched routes)
//   4. Global error handler LAST (catches errors from all routes above)

import express, { Application } from "express";
import helmet from "helmet";
import cors from "cors";
import { env } from "./config/env";
import { logger } from "./config/logger";
import healthRouter from "./routes/health";
import eventsRouter from "./routes/events.route";
import dashboardRouter from "./routes/dashboard.route";
import authRouter from "./routes/auth.routes";
import investigationRoutes from './routes/investigation.routes';
import detectionRoutes from './routes/detection.routes';
import actorsRoutes from './routes/actors.routes';
import usersRoutes from './routes/users.routes';
import apiKeysRoutes from './routes/apikeys.routes';
import { notFoundHandler, globalErrorHandler } from "./middlewares/errorHandler";
import cookieParser from "cookie-parser";

const app: Application = express();

// Secure HTTP headers
app.use(helmet());

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use("/", healthRouter);
app.use("/api/v1/events",    eventsRouter);
// Phase 7: Dashboard aggregation APIs
app.use("/api/v1/dashboard", dashboardRouter);
// Phase 8A: User Authentication
app.use("/api/v1/auth",      authRouter);
app.use('/api/v1/ai/investigate', investigationRoutes);
app.use('/api/v1/detections', detectionRoutes);
app.use('/api/v1/actors', actorsRoutes);
app.use('/api/v1/users', usersRoutes);
app.use('/api/v1/api-keys', apiKeysRoutes);

// Catches any route that didn't match above → throws 404 AppError
app.use(notFoundHandler);

// Catches all errors thrown/passed via next(err) anywhere in the app
app.use(globalErrorHandler);

app.listen(env.port, () => {
  logger.info(
    { port: env.port, env: env.nodeEnv },
    'Server running successfully'
  );
});

export default app;