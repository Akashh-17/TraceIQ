// src/types/index.ts
// Shared types used across the application

export interface HealthCheckResponse {
  status: 'ok';
  timestamp: Date;
  uptime: number;        // seconds since server started
  environment: 'development' | 'production' | 'test';
}
