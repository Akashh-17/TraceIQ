import dotenv from "dotenv"; //package to read env variables

// Load variables from .env into process.env
dotenv.config();

// Returns the env variable if present, otherwise stops the app
function requireEnv(key: string): string {
  const value = process.env[key];

  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
}

// Centralized and typed application configuration
export const env = {
  // Server configuration
  port: parseInt(process.env["PORT"] ?? "3000", 10),
  nodeEnv: (process.env["NODE_ENV"] ?? "development") as
    | "development"
    | "production"
    | "test",

  // Required services (app won't start if any are missing)
  databaseUrl: requireEnv("DATABASE_URL"),
  redisUrl:    requireEnv("REDIS_URL"),

  // Authentication
  accessTokenSecret: requireEnv("ACCESS_TOKEN_SECRET"),
  refreshTokenSecret: requireEnv("REFRESH_TOKEN_SECRET"),
  
  // AI — Google Gemini. Optional: without a key the app runs, but AI investigation
  // and semantic search are disabled. "gemini-flash-lite-latest" is an alias that tracks
  // Google's current Flash-Lite model (doesn't break when pinned versions are retired), and
  // on the free tier it was the only model both fast and not overloaded/rate-limited.
  googleApiKey:         process.env["GOOGLE_API_KEY"],
  geminiChatModel:      process.env["GEMINI_CHAT_MODEL"] ?? "gemini-flash-lite-latest",
  geminiEmbeddingModel: process.env["GEMINI_EMBEDDING_MODEL"] ?? "gemini-embedding-001",

  // CORS — the origin the frontend is served from
  corsOrigin: process.env["CORS_ORIGIN"] ?? "http://localhost:5173",
} as const;

// Helper flags for environment-specific logic
export const isDev = env.nodeEnv === "development";
export const isProd = env.nodeEnv === "production";