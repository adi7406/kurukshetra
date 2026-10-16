import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { env } from './config/env.js';
import { requestIdMiddleware } from './middleware/requestId.js';
import { requestLogger } from './middleware/logger.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import healthRoutes from './routes/health.routes.js';
import authRoutes from './routes/auth.routes.js';
import coursesRoutes from './routes/courses.routes.js';
import conceptsRoutes from './routes/concepts.routes.js';
import syllabusRoutes from './routes/syllabus.routes.js';
import resourcesRoutes from './routes/resources.routes.js';
import questionsRoutes from './routes/questions.routes.js';
import assessmentsRoutes from './routes/assessments.routes.js';
import jobsRoutes from './routes/jobs.routes.js';
import attemptsRoutes from './routes/attempts.routes.js';
import masteryRoutes from './routes/mastery.routes.js';
import recommendationsRoutes from './routes/recommendations.routes.js';
import codingRoutes from './routes/coding.routes.js';
import vivaRoutes from './routes/viva.routes.js';
import integrityRoutes from './routes/integrity.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import reportsRoutes from './routes/reports.routes.js';

const app = express();




// Security headers
app.use(helmet());

// CORS configuration supporting credentials
app.use(
  cors({
    origin: env.CORS_ORIGIN.split(',').map((o) => o.trim()),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  })
);

// Body parsing with size limits
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Request tracing and logging
app.use(requestIdMiddleware);
app.use(requestLogger);

// Mount feature routers
app.use(healthRoutes);
app.use(env.API_PREFIX, healthRoutes);
app.use(env.API_PREFIX, authRoutes);
app.use(env.API_PREFIX, coursesRoutes);
app.use(env.API_PREFIX, conceptsRoutes);
app.use(env.API_PREFIX, syllabusRoutes);
app.use(env.API_PREFIX, resourcesRoutes);
app.use(env.API_PREFIX, questionsRoutes);
app.use(env.API_PREFIX, assessmentsRoutes);
app.use(env.API_PREFIX, jobsRoutes);
app.use(env.API_PREFIX, attemptsRoutes);
app.use(env.API_PREFIX, masteryRoutes);
app.use(env.API_PREFIX, recommendationsRoutes);
app.use(env.API_PREFIX, codingRoutes);
app.use(env.API_PREFIX, vivaRoutes);
app.use(env.API_PREFIX, integrityRoutes);
app.use(env.API_PREFIX, dashboardRoutes);
app.use(env.API_PREFIX, reportsRoutes);

if (env.API_PREFIX !== '/api') {
  app.use('/api', healthRoutes);
  app.use('/api', authRoutes);
  app.use('/api', coursesRoutes);
  app.use('/api', conceptsRoutes);
  app.use('/api', syllabusRoutes);
  app.use('/api', resourcesRoutes);
  app.use('/api', questionsRoutes);
  app.use('/api', assessmentsRoutes);
  app.use('/api', jobsRoutes);
  app.use('/api', attemptsRoutes);
  app.use('/api', masteryRoutes);
  app.use('/api', recommendationsRoutes);
  app.use('/api', codingRoutes);
  app.use('/api', vivaRoutes);
  app.use('/api', integrityRoutes);
  app.use('/api', dashboardRoutes);
  app.use('/api', reportsRoutes);
}


// 404 Handler for unmatched endpoints
app.use(notFoundHandler);

// Centralized error handling
app.use(errorHandler);

export default app;
