export type TranscriptionSource = "bo-form" | "quick-action" | "edit-modal";
export type TranscriptionContext = "relato" | "autofill-prompt";
export type TranscriptionJobStatus =
  | "queued"
  | "processing"
  | "completed"
  | "failed";

interface ApiErrorPayload {
  error?: string;
  message?: string;
}

export class TranscriptionApiError extends Error {
  status: number;
  data: ApiErrorPayload | null;

  constructor(message: string, status: number, data: ApiErrorPayload | null) {
    super(message);
    this.name = "TranscriptionApiError";
    this.status = status;
    this.data = data;
  }
}

export interface CreateTranscriptionJobParams {
  file: Blob;
  fileName?: string;
  source: TranscriptionSource;
  context: TranscriptionContext;
  signal?: AbortSignal;
}

export interface CreateTranscriptionJobResponse {
  jobId: string;
  status: "queued";
}

export interface TranscriptionJobResponse {
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

const parseErrorResponse = async (
  response: Response
): Promise<ApiErrorPayload | null> => {
  try {
    return (await response.json()) as ApiErrorPayload;
  } catch {
    return null;
  }
};

export async function createTranscriptionJob({
  file,
  fileName = "audio.webm",
  source,
  context,
  signal,
}: CreateTranscriptionJobParams): Promise<CreateTranscriptionJobResponse> {
  const formData = new FormData();
  formData.append("file", file, fileName);
  formData.append("source", source);
  formData.append("context", context);

  const response = await fetch("/api/transcriptions", {
    method: "POST",
    body: formData,
    signal,
  });

  if (!response.ok) {
    const errorData = await parseErrorResponse(response);
    throw new TranscriptionApiError(
      errorData?.message ||
        errorData?.error ||
        "Falha ao criar job de transcricao.",
      response.status,
      errorData
    );
  }

  return (await response.json()) as CreateTranscriptionJobResponse;
}

export async function getTranscriptionJob(
  jobId: string,
  signal?: AbortSignal
): Promise<TranscriptionJobResponse> {
  const response = await fetch(`/api/transcriptions/${jobId}`, {
    method: "GET",
    signal,
  });

  if (!response.ok) {
    const errorData = await parseErrorResponse(response);
    throw new TranscriptionApiError(
      errorData?.message ||
        errorData?.error ||
        "Falha ao consultar job de transcricao.",
      response.status,
      errorData
    );
  }

  return (await response.json()) as TranscriptionJobResponse;
}
