import { randomUUID } from "node:crypto";
import type { FastifyPluginCallbackZod } from "fastify-type-provider-zod";
import multipart from "@fastify/multipart";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";

type TranscriptionJobStatus =
  | "queued"
  | "processing"
  | "completed"
  | "failed";

interface TranscriptionJob {
  jobId: string;
  status: TranscriptionJobStatus;
  providerRequested: "hybrid" | "gemini" | "whisper";
  providerUsed: "gemini" | "whisper" | null;
  text: string | null;
  error: {
    code: string | null;
    message: string;
  } | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
}

const jobs = new Map<string, TranscriptionJob>();

export const transcriptionRoute: FastifyPluginCallbackZod = (app) => {
  app.register(multipart);

  if (!process.env.GEMINI_API_KEY) {
    throw new Error(
      "GEMINI_API_KEY is not defined in the environment variables.",
    );
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const transcribeAudio = async (buffer: Buffer, mimeType: string) => {
    const base64 = buffer.toString("base64");

    const result = await model.generateContent([
      {
        text: "Transcreva o áudio para português do Brasil. Seja preciso, claro e mantenha a pontuação.Elimine da transcrição qualquer ruído em paralelo,principalmente os que possam ficar no final da fala!Se não detectar nada,não crie texto e nem abstraia.",
      },
      {
        inlineData: {
          mimeType,
          data: base64,
        },
      },
    ]);

    return result.response.text();
  };

  const processJob = async (
    jobId: string,
    buffer: Buffer,
    mimeType: string,
  ) => {
    const job = jobs.get(jobId);
    if (!job) return;

    job.status = "processing";
    job.startedAt = new Date().toISOString();
    jobs.set(jobId, job);

    try {
      const text = await transcribeAudio(buffer, mimeType);
      const completed: TranscriptionJob = {
        ...job,
        status: "completed",
        providerUsed: "gemini",
        text,
        error: null,
        finishedAt: new Date().toISOString(),
      };
      jobs.set(jobId, completed);
    } catch (error) {
      app.log.error({ err: error, jobId }, "Erro ao transcrever job");
      const failed: TranscriptionJob = {
        ...job,
        status: "failed",
        providerUsed: "gemini",
        text: null,
        error: {
          code: "TRANSCRIPTION_FAILED",
          message:
            error instanceof Error
              ? error.message
              : "Erro interno na transcrição.",
        },
        finishedAt: new Date().toISOString(),
      };
      jobs.set(jobId, failed);
    }
  };

  // API esperada pelo frontend (jobs + polling)
  app.post("/transcriptions", async (request, reply) => {
    let fileBuffer: Buffer | null = null;
    let mimeType = "audio/webm";

    const parts = request.parts();
    for await (const part of parts) {
      if (part.type === "file" && part.fieldname === "file") {
        fileBuffer = await part.toBuffer();
        mimeType = part.mimetype || mimeType;
      }
    }

    if (!fileBuffer) {
      return reply.status(400).send({ error: "Arquivo de áudio ausente." });
    }

    const jobId = randomUUID();
    const createdAt = new Date().toISOString();
    const job: TranscriptionJob = {
      jobId,
      status: "queued",
      providerRequested: "gemini",
      providerUsed: null,
      text: null,
      error: null,
      createdAt,
      startedAt: null,
      finishedAt: null,
    };

    jobs.set(jobId, job);
    void processJob(jobId, fileBuffer, mimeType);

    return reply.status(200).send({
      jobId,
      status: "queued" as const,
    });
  });

  app.get(
    "/transcriptions/:jobId",
    {
      schema: {
        params: z.object({
          jobId: z.string().uuid(),
        }),
      },
    },
    async (request, reply) => {
      const { jobId } = request.params;
      const job = jobs.get(jobId);

      if (!job) {
        return reply.status(404).send({
          error: "Job não encontrado.",
          message: "Job de transcrição não encontrado.",
        });
      }

      return reply.status(200).send(job);
    },
  );

  // Endpoint legado / documentação
  app.post(
    "/transcribe",
    {
      schema: {},
    },
    async (request, reply) => {
      const data = await request.file();

      if (!data) {
        return reply.status(400).send({ error: "Arquivo de áudio ausente." });
      }

      const buffer = await data.toBuffer();
      const mimeType = data.mimetype;

      try {
        const text = await transcribeAudio(buffer, mimeType);
        return reply.status(200).send({ text });
      } catch (error) {
        app.log.error({ err: error }, "Erro ao transcrever");
        return reply.status(500).send({ error: "Erro interno na transcrição." });
      }
    },
  );
};
