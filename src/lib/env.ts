import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  OPS_TRACKER_SESSION_COOKIE: z.string().min(1),
  OPS_TRACKER_SESSION_SECRET: z.string().min(16),
  OPS_TRACKER_DEMO_EMAIL: z.string().email(),
  OPS_TRACKER_DEMO_PASSWORD: z.string().min(8),
  OPS_TRACKER_SECONDARY_EMAIL: z.string().email(),
  OPS_TRACKER_SECONDARY_PASSWORD: z.string().min(8)
});

let cachedEnv: z.infer<typeof envSchema> | null = null;

export function getEnv() {
  if (cachedEnv) {
    return cachedEnv;
  }

  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    throw new Error(
      `Invalid environment configuration: ${result.error.issues
        .map((issue) => issue.path.join("."))
        .join(", ")}`
    );
  }

  cachedEnv = result.data;
  return cachedEnv;
}
