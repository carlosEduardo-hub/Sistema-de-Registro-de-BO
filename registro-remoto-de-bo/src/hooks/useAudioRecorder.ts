import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  createTranscriptionJob,
  getTranscriptionJob,
  TranscriptionApiError,
  type TranscriptionContext,
  type TranscriptionSource,
} from "@/api/transcriptionAPI";

interface UseAudioRecorderOptions {
  source: TranscriptionSource;
  context: TranscriptionContext;
  pollingIntervalMs?: number;
}

export const useAudioRecorder = (
  onTranscriptionComplete: (text: string) => void,
  onTranscriptionStart?: () => void,
  onTranscriptionEnd?: () => void,
  options?: UseAudioRecorderOptions
) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const pollingAbortControllerRef = useRef<AbortController | null>(null);
  const isUnmountedRef = useRef(false);

  const transcriptionSource = options?.source ?? "bo-form";
  const transcriptionContext = options?.context ?? "relato";
  const pollingIntervalMs = options?.pollingIntervalMs ?? 1200;

  const wait = (ms: number, signal?: AbortSignal) =>
    new Promise<void>((resolve, reject) => {
      const timeoutId = window.setTimeout(() => {
        cleanup();
        resolve();
      }, ms);

      const cleanup = () => {
        window.clearTimeout(timeoutId);
        signal?.removeEventListener("abort", handleAbort);
      };

      const handleAbort = () => {
        cleanup();
        reject(new DOMException("Aborted", "AbortError"));
      };

      if (signal) {
        signal.addEventListener("abort", handleAbort, { once: true });
      }
    });

  useEffect(() => {
    return () => {
      isUnmountedRef.current = true;
      pollingAbortControllerRef.current?.abort();
      stopAudio();
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm",
      });
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const fullBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });
        setAudioBlob(fullBlob);
        transcribeAudio(fullBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      toast.info("Gravação iniciada");
    } catch (error) {
      toast.error("Erro ao acessar microfone", {
        description: "Verifique as permissões do navegador.",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      toast.info("Gravação parada.");
    }
  };

  const transcribeAudio = async (blob: Blob) => {
    pollingAbortControllerRef.current?.abort();
    const abortController = new AbortController();
    pollingAbortControllerRef.current = abortController;

    setIsTranscribing(true);
    onTranscriptionStart?.();

    try {
      const { jobId } = await createTranscriptionJob({
        file: blob,
        fileName: "audio.webm",
        source: transcriptionSource,
        context: transcriptionContext,
        signal: abortController.signal,
      });

      while (!abortController.signal.aborted) {
        const job = await getTranscriptionJob(jobId, abortController.signal);

        if (job.status === "completed") {
          const transcription = job.text ?? "";
          onTranscriptionComplete(transcription);

          if (transcription) {
            toast.success("Audio transcrito com sucesso!");
          } else {
            toast.info("Transcricao concluida", {
              description: "Nenhum texto foi detectado na gravacao.",
            });
          }

          return;
        }

        if (job.status === "failed") {
          throw new TranscriptionApiError(
            job.error?.message || "Falha ao processar a transcricao.",
            500,
            job.error
              ? {
                  message: job.error.message,
                  error: job.error.code ?? undefined,
                }
              : null
          );
        }

        await wait(pollingIntervalMs, abortController.signal);
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      const apiError =
        error instanceof TranscriptionApiError ? error : undefined;
      const isBackendInaccessible =
        error instanceof TypeError ||
        apiError?.status === 404 ||
        apiError?.status === 502 ||
        apiError?.status === 503;

      if (isBackendInaccessible) {
        toast.error("Transcricao indisponivel no momento.", {
          description: "Nao foi possivel iniciar a transcricao. Tente novamente.",
        });
      } else {
        toast.error("Erro ao transcrever", {
          description:
            apiError?.message || "Nao foi possivel transcrever. Tente novamente.",
        });
      }

      onTranscriptionComplete("");
    } finally {
      if (!isUnmountedRef.current) {
        setIsTranscribing(false);
        onTranscriptionEnd?.();
      }

      if (pollingAbortControllerRef.current === abortController) {
        pollingAbortControllerRef.current = null;
      }
    }
  };

  const playAudio = () => {
    if (audioBlob) {
      const audioUrl = URL.createObjectURL(audioBlob);
      audioRef.current = new Audio(audioUrl);
      audioRef.current.play();
      setIsPlaying(true);
      audioRef.current.onended = () => setIsPlaying(false);
    }
  };

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  };

  const clearAudio = () => {
    setAudioBlob(null);
    stopAudio();
  };

  return {
    isRecording,
    audioBlob,
    isPlaying,
    isTranscribing,
    startRecording,
    stopRecording,
    playAudio,
    stopAudio,
    clearAudio,
  };
};
