import { z } from 'zod';

export const deepSeekEnvSchema = z.object({
  DEEPSEEK_API_KEY: z.string().trim().min(1),
  DEEPSEEK_MODEL: z.string().trim().min(1).default('deepseek-v4-flash'),
});

export const serverEnvSchema = z.object({
  DATABASE_URL: z.string().trim().min(1),
  HOST: z.string().trim().min(1).default('0.0.0.0'),
  PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
});

export const appEnvSchema = serverEnvSchema.extend(deepSeekEnvSchema.shape);

export type DeepSeekEnv = z.infer<typeof deepSeekEnvSchema>;
export type AppEnv = z.infer<typeof appEnvSchema>;

export function parseDeepSeekEnv(env: NodeJS.ProcessEnv = process.env): DeepSeekEnv {
  return deepSeekEnvSchema.parse(env);
}

export function parseAppEnv(env: NodeJS.ProcessEnv = process.env): AppEnv {
  return appEnvSchema.parse(env);
}
