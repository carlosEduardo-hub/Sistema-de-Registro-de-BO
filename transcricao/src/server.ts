// server.js
import dotenv from "dotenv";
dotenv.config();
import { fastifyCors } from "@fastify/cors";
import { fastify } from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod";
import { transcriptionRoute } from "./http/routes/transcription.ts";
import { registerBoRoute } from "./http/routes/register_bo.ts";
import { autofillBoRoute } from "./http/routes/autofill-bo.ts";
import { syncBoletinsRoute } from "./http/routes/sync-boletins.ts";
import { auditLogsRoute } from "./http/routes/audit_logs.ts";
import { telegramRoute } from "./http/routes/telegram.ts";
import { startTelegramPolling } from "./services/telegram.ts";

const app = fastify({
  logger: true,
  bodyLimit: 104857600,
}).withTypeProvider<ZodTypeProvider>();

const PORT = Number.parseInt(process.env.PORT ?? "3333", 10);

app.register(fastifyCors);

app.setSerializerCompiler(serializerCompiler);
app.setValidatorCompiler(validatorCompiler);

app.register(transcriptionRoute);
app.register(registerBoRoute);
app.register(autofillBoRoute);
app.register(syncBoletinsRoute);
app.register(auditLogsRoute);
app.register(telegramRoute);

const start = async () => {
  try {
    // Polling contínuo não funciona bem em Functions (scale-to-zero).
    // Na Vercel use o webhook POST /telegram/webhook.
    if (process.env.VERCEL) {
      app.log.info(
        "Telegram polling desabilitado na Vercel; configure o webhook.",
      );
    } else {
      startTelegramPolling();
    }

    await app.listen({ port: PORT, host: "0.0.0.0" });
    app.log.info(`🚀 Servidor rodando em http://localhost:${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

const shutdown = async (signal: string) => {
  app.log.info(`${signal} recebido; encerrando...`);
  try {
    await app.close();
    process.exit(0);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});
process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

start();
