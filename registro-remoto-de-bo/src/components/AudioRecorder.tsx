import { useState, useRef } from "react"
import { Mic, MicOff, Play, Square, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import {
  createTranscriptionJob,
  getTranscriptionJob,
  TranscriptionApiError,
} from "@/api/transcriptionAPI"

interface AudioRecorderProps {
  onAudioRecorded: (audioBlob: Blob) => void
}

export function AudioRecorder({ onAudioRecorded }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [transcription, setTranscription] = useState<string | null>(null)
  const [isTranscribing, setIsTranscribing] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const { toast } = useToast()

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm",
      })

      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data)
        }
      }

      mediaRecorder.onstop = () => {
        const fullBlob = new Blob(audioChunksRef.current, { type: "audio/webm" })
        setAudioBlob(fullBlob)
        onAudioRecorded(fullBlob)

        // Inicia a transcrição apenas quando gravação parar, enviando o Blob completo
        transcribeAudio(fullBlob)
      }

      mediaRecorder.start() // Grava até o usuário parar
      mediaRecorderRef.current = mediaRecorder
      setIsRecording(true)

      toast({
        title: "Gravação iniciada",
        description: "Fale claramente as informações do B.O.",
      })
    } catch (error) {
      toast({
        title: "Erro ao acessar microfone",
        description: "Verifique as permissões do navegador.",
        variant: "destructive",
      })
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  const transcribeAudio = async (audioBlob: Blob) => {
    setIsTranscribing(true)
    setTranscription(null)

    try {
      const { jobId } = await createTranscriptionJob({
        file: audioBlob,
        fileName: "audio.webm",
        source: "bo-form",
        context: "relato",
      })

      while (true) {
        const job = await getTranscriptionJob(jobId)

        if (job.status === "completed") {
          if (job.text) {
            setTranscription(job.text)
          } else {
            toast({
              title: "Transcrição concluída",
              description: "Nenhum texto foi detectado na gravação.",
            })
          }
          break
        }

        if (job.status === "failed") {
          throw new TranscriptionApiError(
            job.error?.message || "Falha ao transcrever.",
            500,
            job.error
              ? {
                  message: job.error.message,
                  error: job.error.code ?? undefined,
                }
              : null,
          )
        }

        await new Promise((resolve) => window.setTimeout(resolve, 1200))
      }
    } catch (error) {
      const description =
        error instanceof TranscriptionApiError
          ? error.message
          : "Nao foi possivel transcrever. Tente novamente."

      toast({
        title: "Erro ao transcrever",
        description,
        variant: "destructive",
      })
    } finally {
      setIsTranscribing(false)
    }
  }

  const playAudio = () => {
    if (audioBlob) {
      const audioUrl = URL.createObjectURL(audioBlob)
      audioRef.current = new Audio(audioUrl)
      audioRef.current.play()
      setIsPlaying(true)

      audioRef.current.onended = () => {
        setIsPlaying(false)
      }
    }
  }

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      setIsPlaying(false)
    }
  }

  const clearAudio = () => {
    setAudioBlob(null)
    setTranscription(null)
    stopAudio()
  }

  return (
    <Card className="border-2 border-dashed border-piaui-blue/30">
      <CardContent className="p-6">
        <div className="text-center space-y-4">
          <h3 className="text-lg font-semibold text-gray-800">
            Registro por Áudio
          </h3>

          <div className="flex justify-center gap-4">
            {!isRecording ? (
              <Button
                onClick={startRecording}
                className="bg-piaui-red hover:bg-piaui-red/90 text-white"
                size="lg"
              >
                <Mic className="mr-2 h-5 w-5" />
                Iniciar Gravação
              </Button>
            ) : (
              <Button
                onClick={stopRecording}
                className="bg-gray-600 hover:bg-gray-700 text-white animate-pulse"
                size="lg"
              >
                <MicOff className="mr-2 h-5 w-5" />
                Parar Gravação
              </Button>
            )}
          </div>

          {audioBlob && (
            <div className="flex justify-center gap-2 mt-4">
              {!isPlaying ? (
                <Button
                  onClick={playAudio}
                  variant="outline"
                  className="border-piaui-green text-piaui-green hover:bg-piaui-green hover:text-white"
                >
                  <Play className="mr-2 h-4 w-4" />
                  Reproduzir
                </Button>
              ) : (
                <Button
                  onClick={stopAudio}
                  variant="outline"
                  className="border-gray-600 text-gray-600 hover:bg-gray-600 hover:text-white"
                >
                  <Square className="mr-2 h-4 w-4" />
                  Parar
                </Button>
              )}

              <Button
                onClick={clearAudio}
                variant="outline"
                className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Limpar
              </Button>
            </div>
          )}

          <p className="text-sm text-gray-600">
            {isRecording
              ? "Gravando... Descreva o ocorrido com detalhes."
              : "Clique para gravar as informações do Boletim de Ocorrência."}
          </p>

          {isTranscribing && (
            <p className="text-sm text-yellow-600 mt-4">
              Transcrevendo áudio...
            </p>
          )}

          {transcription && (
            <div className="bg-gray-100 p-4 rounded-md mt-4 text-gray-700 whitespace-pre-wrap">
              <strong>Transcrição:</strong> <br />
              {transcription}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
