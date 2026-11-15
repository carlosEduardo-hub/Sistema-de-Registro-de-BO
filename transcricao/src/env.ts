import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z
    .string()
    .url()
    .refine(
      (value) =>
        value.startsWith("postgresql://") || value.startsWith("postgres://"),
      { message: "DATABASE_URL must be a PostgreSQL connection string" },
    ),
  GEMINI_API_KEY: z.string(),
  RESEND_API_KEY: z.string(),
  EMAIL_FROM: z.string().email().optional().default("boletim@seusistema.com"),
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_BOT_USERNAME: z.string().optional(),
});

export const env = envSchema.parse(process.env);
