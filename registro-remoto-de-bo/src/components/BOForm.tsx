import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Save,
  FileText,
  Loader,
  Mic,
  MicOff,
  Play,
  Square,
  Trash2,
  Wand2,
  HelpCircle,
} from "lucide-react";
import { useCreateBo } from "@/hooks/useRegisterBo";
import { toast } from "sonner";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { useState } from "react";
import { autofillBo } from "@/api/registerBoAPI";
import { savePendingBo, BoSyncBody } from "@/lib/offlineStore";

const boFormSchema = z.object({
  tipoOcorrencia: z.string().nonempty("O tipo de ocorrência é obrigatório."),
  dataOcorrencia: z
    .string()
    .nonempty("A data da ocorrência é obrigatória.")
    .refine((date) => new Date(date + "T00:00:00") <= new Date(), {
      message: "A data da ocorrência não pode ser uma data futura.",
    }),
  horaOcorrencia: z.string().nonempty("A hora da ocorrência é obrigatória."),
  localOcorrencia: z.string().nonempty("O local da ocorrência é obrigatório."),
  relato: z.string().nonempty("O relato dos fatos é obrigatório."),
  nomeRequerente: z.string().nonempty("O nome do requerente é obrigatório."),
  cpfRequerente: z.string().optional(),
  dataNascimento: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val || val.trim() === "") return true;
        return new Date(val + "T00:00:00") <= new Date();
      },
      {
        message: "A data de nascimento não pode ser uma data futura.",
      },
    ),
  genero: z.string().optional(),
  nacionalidade: z.string().optional(),
  estadoCivil: z.string().optional(),
  profissao: z.string().optional(),
  enderecoRequerente: z.string().optional(),
  telefoneRequerente: z.string().optional(),
  email: z
    .string()
    .email("Formato de email inválido.")
    .optional()
    .or(z.literal("")),
  relacaoComFato: z.string().nonempty("A relação com o fato é obrigatória."),
});

type BOFormData = z.infer<typeof boFormSchema>;

export function BOForm() {
  const [aiPrompt, setAiPrompt] = useState("");
  const [isAutofilling, setIsAutofilling] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
    setValue,
    getValues,
  } = useForm<BOFormData>({
    resolver: zodResolver(boFormSchema),
    defaultValues: {
      tipoOcorrencia: "",
      relacaoComFato: "",
      genero: "",
      estadoCivil: "",
    },
  });

  const handleAutofill = async () => {
    if (!aiPrompt.trim()) {
      toast.error(
        "Digite ou grave um relato para que a IA possa preencher o formulário.",
      );
      return;
    }

    setIsAutofilling(true);
    try {
      const data = await autofillBo(aiPrompt);

      // 🔹 Mapeadores para alinhar valores da IA com os do Select
      const mapTipoOcorrencia = (value: string) => {
        if (!value) return "";
        const map: Record<string, string> = {
          roubo: "Roubo",
          furto: "Furto",
          "lesão corporal": "Lesão Corporal",
          dano: "Dano ao Patrimônio",
          ameaça: "Ameaça",
          perturbação: "Perturbação do Sossego",
          "violência doméstica": "Violência Doméstica",
          "acidente de trânsito": "Acidente de Trânsito",
          outros: "Outros",
        };
        const key = value.toLowerCase();
        return map[key] || "";
      };

      const mapGenero = (value: string) => {
        if (!value) return "";
        const map: Record<string, string> = {
          masculino: "Masculino",
          homem: "Masculino",
          feminino: "Feminino",
          mulher: "Feminino",
          outro: "Outro",
        };
        const key = value.toLowerCase();
        return map[key] || "";
      };

      const mapEstadoCivil = (value: string) => {
        if (!value) return "";
        const map: Record<string, string> = {
          solteiro: "Solteiro(a)",
          solteira: "Solteiro(a)",
          casado: "Casado(a)",
          casada: "Casado(a)",
          divorciado: "Divorciado(a)",
          divorciada: "Divorciado(a)",
          viuvo: "Viúvo(a)",
          viuva: "Viúvo(a)",
          "união estável": "União Estável",
        };
        const key = value.toLowerCase();
        return map[key] || "";
      };

      const mapRelacaoComFato = (value: string) => {
        if (!value) return "";
        const map: Record<string, string> = {
          vítima: "Vítima",
          vitima: "Vítima",
          testemunha: "Testemunha",
          comunicante: "Comunicante",
          outro: "Outro",
        };
        const key = value.toLowerCase();
        return map[key] || "";
      };

      const mappedData: Partial<BOFormData> = {
        tipoOcorrencia: mapTipoOcorrencia(data.type_of_occurrence || ""),
        dataOcorrencia: data.date_and_time_of_event?.split("T")[0] || "",
        horaOcorrencia:
          data.date_and_time_of_event?.split("T")[1]?.substring(0, 5) || "",
        localOcorrencia: data.place_of_the_fact || "",
        relato: data.transcription || "",
        nomeRequerente: data.full_name || "",
        cpfRequerente: data.cpf_or_rg || "",
        dataNascimento: data.date_of_birth?.split("T")[0] || "",
        genero: mapGenero(data.gender || ""),
        nacionalidade: data.nationality || "",
        estadoCivil: mapEstadoCivil(data.marital_status || ""),
        profissao: data.profession || "",
        enderecoRequerente: data.full_address || "",
        telefoneRequerente: data.phone_or_cell_phone || "",
        email: data.email || "",
        relacaoComFato: mapRelacaoComFato(
          data.relationship_with_the_fact || "",
        ),
      };

      // Atualiza todos os campos
      Object.entries(mappedData).forEach(([key, value]) => {
        if (value !== undefined) {
          setValue(key as keyof BOFormData, value, { shouldValidate: true });
        }
      });

      toast.success("Formulário preenchido automaticamente pela IA!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao preencher o formulário com IA.");
    } finally {
      setIsAutofilling(false);
    }
  };

  const registerBoMutation = useCreateBo();

  // --- Audio Recorder for Relato dos Fatos ---
  const handleRelatoTranscriptionComplete = (transcription: string) => {
    const currentRelato = getValues("relato") || "";
    const newRelato = currentRelato.replace(
      "Transcrevendo áudio...",
      transcription,
    );
    setValue("relato", newRelato, { shouldValidate: true });
    if (newRelato.trim() === "") {
      clearAudioRelato();
    }
  };

  const {
    isRecording: isRecordingRelato,
    audioBlob: audioBlobRelato,
    isPlaying: isPlayingRelato,
    isTranscribing: isTranscribingRelato,
    startRecording: startRecordingRelato,
    stopRecording: stopRecordingRelato,
    playAudio: playAudioRelato,
    stopAudio: stopAudioRelato,
    clearAudio: clearAudioRelato,
  } = useAudioRecorder(
    handleRelatoTranscriptionComplete,
    () => {
      const currentRelato = getValues("relato") || "";
      const newRelato = currentRelato.trim()
        ? `${currentRelato.trim()} Transcrevendo áudio...`
        : "Transcrevendo áudio...";
      setValue("relato", newRelato, { shouldValidate: false });
    },
    () => {
      const currentRelato = getValues("relato") || "";
      if (currentRelato.endsWith("Transcrevendo áudio...")) {
        setValue(
          "relato",
          currentRelato.replace("Transcrevendo áudio...", "").trim(),
          { shouldValidate: false },
        );
      }
    },
    {
      source: "bo-form",
      context: "relato",
    },
  );

  // --- Audio Recorder for AI Prompt ---
  const handleAiPromptTranscriptionComplete = (transcription: string) => {
    setAiPrompt((currentPrompt) => {
      const newPrompt = (currentPrompt || "").replace(
        "Transcrevendo áudio...",
        transcription,
      );
      if (newPrompt.trim() === "") {
        clearAudioAi();
      }
      return newPrompt;
    });
  };

  const {
    isRecording: isRecordingAi,
    audioBlob: audioBlobAi,
    isPlaying: isPlayingAi,
    isTranscribing: isTranscribingAi,
    startRecording: startRecordingAi,
    stopRecording: stopRecordingAi,
    playAudio: playAudioAi,
    stopAudio: stopAudioAi,
    clearAudio: clearAudioAi,
  } = useAudioRecorder(
    handleAiPromptTranscriptionComplete,
    () => {
      setAiPrompt((currentPrompt) => {
        const prompt = currentPrompt || "";
        return prompt.trim()
          ? `${prompt.trim()} Transcrevendo áudio...`
          : "Transcrevendo áudio...";
      });
    },
    () => {
      setAiPrompt((currentPrompt) => {
        const prompt = currentPrompt || "";
        if (prompt.endsWith("Transcrevendo áudio...")) {
          return prompt.replace("Transcrevendo áudio...", "").trim();
        }
        return prompt;
      });
    },
    {
      source: "bo-form",
      context: "autofill-prompt",
    },
  );

  const tiposOcorrencia = [
    "Furto",
    "Roubo",
    "Lesão Corporal",
    "Dano ao Patrimônio",
    "Ameaça",
    "Perturbação do Sossego",
    "Violência Doméstica",
    "Acidente de Trânsito",
    "Outros",
  ];

  const onSubmit = async (data: BOFormData) => {
    const date_and_time_of_event = new Date(
      `${data.dataOcorrencia}T${data.horaOcorrencia}`,
    ).toISOString();

    const date_of_birth = data.dataNascimento
      ? new Date(data.dataNascimento + "T00:00:00").toISOString()
      : undefined;

    const boBody: BoSyncBody = {
      type_of_occurrence: data.tipoOcorrencia,
      date_and_time_of_event,
      place_of_the_fact: data.localOcorrencia,
      transcription: data.relato,
      full_name: data.nomeRequerente,
      cpf_or_rg: data.cpfRequerente,
      date_of_birth,
      gender: data.genero,
      nationality: data.nacionalidade,
      marital_status: data.estadoCivil,
      profession: data.profissao,
      full_address: data.enderecoRequerente,
      phone_or_cell_phone: data.telefoneRequerente,
      email: data.email,
      relationship_with_the_fact: data.relacaoComFato,
    };

    if (navigator.onLine) {
      registerBoMutation.mutate(boBody, {
        onSuccess: () => {
          toast.success("B.O registrado com sucesso!", { duration: 3000 });
          reset();
          setAiPrompt("");
          clearAudioAi();
          clearAudioRelato();
        },
        onError: () => {
          toast.error("Erro ao registrar o B.O!", { duration: 3000 });
        },
      });
    } else {
      const localId = crypto.randomUUID();
      const collected_at = new Date().toISOString();
      try {
        await savePendingBo(
          localId,
          collected_at,
          boBody /*, audioBlobRelato */,
        );
        toast.warning(
          "Offline — B.O. salvo localmente e será sincronizado ao reconectar.",
          { duration: 4000 },
        );
        reset();
        setAiPrompt("");
        clearAudioAi();
        clearAudioRelato();
      } catch (err) {
        console.error(err);
        toast.error("Falha ao salvar localmente. Tente novamente.");
      }
    }
  };

  return (
    <Card>
      <CardHeader className="bg-gradient-to-r from-piaui-blue to-piaui-blue-light text-white">
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-6 w-6" />
          Registro Manual de Boletim de Ocorrência
        </CardTitle>
      </CardHeader>

      <CardContent className="p-6">
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Label htmlFor="ai-prompt" className="text-gray-700">
              Preenchimento por IA
            </Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 cursor-help rounded-full"
                >
                  <HelpCircle className="h-4 w-4 text-muted-foreground" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs" side="top">
                <p className="font-semibold text-center mb-2">Como usar a IA</p>
                <p className="text-sm text-muted-foreground">
                  Descreva ou grave um áudio com os detalhes da ocorrência. A IA
                  tentará preencher os campos do formulário com base no seu
                  relato.
                </p>
                <hr className="my-2" />
                <p className="text-xs font-semibold">
                  Dicas para um bom resultado:
                </p>
                <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1 mt-1">
                  <li>Informe data, hora e local.</li>
                  <li>Descreva o tipo de ocorrência (ex: roubo, furto).</li>
                  <li>Forneça nomes e informações dos envolvidos.</li>
                  <li>Sempre revise os campos preenchidos.</li>
                </ul>
              </TooltipContent>
            </Tooltip>
          </div>
          <Textarea
            id="ai-prompt"
            placeholder={
              isTranscribingAi
                ? "Transcrevendo áudio..."
                : "Descreva o B.O. aqui ou grave um áudio e deixe a IA preencher o formulário para você. Inclua o máximo de detalhes possível."
            }
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            className="border-gray-300 min-h-[120px] focus:outline-none focus:ring-0 focus:ring-offset-0"
            disabled={isTranscribingAi}
          />
          <div className="flex justify-between items-center pt-2">
            <div className="flex items-center gap-2">
              {!isRecordingAi ? (
                <Button
                  type="button"
                  onClick={startRecordingAi}
                  size="sm"
                  variant="outline"
                  className="border-piaui-red text-piaui-red hover:bg-piaui-red hover:text-white"
                  disabled={isTranscribingAi}
                >
                  <Mic className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={stopRecordingAi}
                  size="sm"
                  variant="destructive"
                  className="animate-pulse"
                >
                  <MicOff className="h-4 w-4" />
                </Button>
              )}
              {audioBlobAi && (
                <>
                  {!isPlayingAi ? (
                    <Button
                      type="button"
                      onClick={playAudioAi}
                      size="sm"
                      variant="outline"
                      className="border-piaui-green text-piaui-green hover:bg-piaui-green hover:text-white"
                    >
                      <Play className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      onClick={stopAudioAi}
                      size="sm"
                      variant="outline"
                    >
                      <Square className="h-4 w-4" />
                    </Button>
                  )}
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                onClick={handleAutofill}
                size="sm"
                variant="outline"
                className="border-piaui-blue text-piaui-blue hover:bg-piaui-blue hover:text-white"
                disabled={isAutofilling || !aiPrompt}
              >
                {isAutofilling ? (
                  <Loader className="animate-spin h-4 w-4" />
                ) : (
                  <Wand2 className="h-4 w-4" />
                )}
                <span className="ml-2 hidden sm:inline">Preencher</span>
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setAiPrompt("");
                  clearAudioAi();
                  toast.info("Campo de preenchimento por IA limpo.");
                }}
                size="sm"
                variant="outline"
                className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                disabled={!aiPrompt && !audioBlobAi}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {isRecordingAi && (
            <p className="text-sm text-blue-600 mt-2 animate-pulse">
              Gravando... Fale claramente para a IA.
            </p>
          )}
        </div>
        <Separator className="my-6" />
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-6"
          noValidate
        >
          {/* Dados da Ocorrência */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">
              Dados da Ocorrência
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="tipoOcorrencia" className="text-gray-700">
                  Tipo de Ocorrência <span className="text-red-600">*</span>
                </Label>
                <Controller
                  name="tipoOcorrencia"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger
                        id="tipoOcorrencia"
                        className="border-gray-300 focus:outline-none focus:ring-0 focus:ring-offset-0"
                      >
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        {tiposOcorrencia.map((tipo) => (
                          <SelectItem key={tipo} value={tipo}>
                            {tipo}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.tipoOcorrencia && (
                  <p className="text-red-500 text-sm">
                    {errors.tipoOcorrencia.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="dataOcorrencia" className="text-gray-700">
                  Data da Ocorrência <span className="text-red-600">*</span>
                </Label>
                <Input
                  id="dataOcorrencia"
                  type="date"
                  {...register("dataOcorrencia")}
                  className="border-gray-300 focus:outline-none focus:ring-0 focus:ring-offset-0"
                />
                {errors.dataOcorrencia && (
                  <p className="text-red-500 text-sm">
                    {errors.dataOcorrencia.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="horaOcorrencia" className="text-gray-700">
                  Hora da Ocorrência <span className="text-red-600">*</span>
                </Label>
                <Input
                  id="horaOcorrencia"
                  type="time"
                  {...register("horaOcorrencia")}
                  className="border-gray-300 focus:outline-none focus:ring-0 focus:ring-offset-0"
                />
                {errors.horaOcorrencia && (
                  <p className="text-red-500 text-sm">
                    {errors.horaOcorrencia.message}
                  </p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="localOcorrencia" className="text-gray-700">
                Local da Ocorrência <span className="text-red-600">*</span>
              </Label>
              <Input
                id="localOcorrencia"
                placeholder="Endereço completo onde ocorreu o fato"
                {...register("localOcorrencia")}
                className="border-gray-300 focus:outline-none focus:ring-0 focus:ring-offset-0"
              />
              {errors.localOcorrencia && (
                <p className="text-red-500 text-sm">
                  {errors.localOcorrencia.message}
                </p>
              )}
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <Label htmlFor="relato" className="text-gray-700">
                  Relato dos Fatos <span className="text-red-600">*</span>
                </Label>
                <div className="flex items-center gap-2">
                  {!isRecordingRelato ? (
                    <Button
                      type="button"
                      onClick={startRecordingRelato}
                      size="sm"
                      variant="outline"
                      className="border-piaui-red text-piaui-red hover:bg-piaui-red hover:text-white"
                      disabled={isTranscribingRelato}
                    >
                      <Mic className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      onClick={stopRecordingRelato}
                      size="sm"
                      variant="destructive"
                      className="animate-pulse"
                    >
                      <MicOff className="h-4 w-4" />
                    </Button>
                  )}
                  {audioBlobRelato && (
                    <>
                      {!isPlayingRelato ? (
                        <Button
                          type="button"
                          onClick={playAudioRelato}
                          size="sm"
                          variant="outline"
                          className="border-piaui-green text-piaui-green hover:bg-piaui-green hover:text-white"
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          onClick={stopAudioRelato}
                          size="sm"
                          variant="outline"
                        >
                          <Square className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        type="button"
                        onClick={() => {
                          clearAudioRelato();
                          setValue("relato", "");
                          toast.info("Relato dos fatos limpo.");
                        }}
                        size="sm"
                        variant="outline"
                        className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
              <Textarea
                id="relato"
                placeholder={
                  isTranscribingRelato
                    ? "Transcrevendo áudio..."
                    : "Descreva detalhadamente o que aconteceu ou grave um áudio..."
                }
                {...register("relato")}
                className="border-gray-300 min-h-[120px] focus:outline-none focus:ring-0 focus:ring-offset-0"
                disabled={isTranscribingRelato}
              />
              {errors.relato && (
                <p className="text-red-500 text-sm">{errors.relato.message}</p>
              )}
              {isRecordingRelato && (
                <p className="text-sm text-blue-600 mt-2 animate-pulse">
                  Gravando... Fale claramente o que aconteceu.
                </p>
              )}
            </div>
          </div>

          <Separator />

          {/* Dados do Requerente */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">
              Dados do Requerente
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="nomeRequerente" className="text-gray-700">
                  Nome Completo <span className="text-red-600">*</span>
                </Label>
                <Input
                  id="nomeRequerente"
                  placeholder="Nome completo do requerente"
                  {...register("nomeRequerente")}
                  className="border-gray-300 focus:outline-none focus:ring-0 focus:ring-offset-0"
                />
                {errors.nomeRequerente && (
                  <p className="text-red-500 text-sm">
                    {errors.nomeRequerente.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="cpfRequerente" className="text-gray-700">
                  CPF ou RG
                </Label>
                <Input
                  id="cpfRequerente"
                  placeholder="000.000.000-00 ou RG"
                  {...register("cpfRequerente")}
                  className="border-gray-300 focus:outline-none focus:ring-0 focus:ring-offset-0"
                />
              </div>

              <div>
                <Label htmlFor="dataNascimento" className="text-gray-700">
                  Data de Nascimento
                </Label>
                <Input
                  id="dataNascimento"
                  type="date"
                  {...register("dataNascimento")}
                  className="border-gray-300 focus:outline-none focus:ring-0 focus:ring-offset-0"
                />
                {errors.dataNascimento && (
                  <p className="text-red-500 text-sm">
                    {errors.dataNascimento.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="genero" className="text-gray-700">
                  Gênero
                </Label>
                <Controller
                  name="genero"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger
                        id="genero"
                        className="border-gray-300 focus:outline-none focus:ring-0 focus:ring-offset-0"
                      >
                        <SelectValue placeholder="Selecione o gênero" />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        <SelectItem value="Masculino">Masculino</SelectItem>
                        <SelectItem value="Feminino">Feminino</SelectItem>
                        <SelectItem value="Outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div>
                <Label htmlFor="nacionalidade" className="text-gray-700">
                  Nacionalidade
                </Label>
                <Input
                  id="nacionalidade"
                  placeholder="Ex: Brasileira"
                  {...register("nacionalidade")}
                  className="border-gray-300 focus:outline-none focus:ring-0 focus:ring-offset-0"
                />
              </div>

              <div>
                <Label htmlFor="estadoCivil" className="text-gray-700">
                  Estado Civil
                </Label>
                <Controller
                  name="estadoCivil"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger
                        id="estadoCivil"
                        className="border-gray-300 focus:outline-none focus:ring-0 focus:ring-offset-0"
                      >
                        <SelectValue placeholder="Selecione o estado civil" />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        <SelectItem value="Solteiro(a)">Solteiro(a)</SelectItem>
                        <SelectItem value="Casado(a)">Casado(a)</SelectItem>
                        <SelectItem value="Divorciado(a)">
                          Divorciado(a)
                        </SelectItem>
                        <SelectItem value="Viúvo(a)">Viúvo(a)</SelectItem>
                        <SelectItem value="União Estável">
                          União Estável
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div>
                <Label htmlFor="profissao" className="text-gray-700">
                  Profissão
                </Label>
                <Input
                  id="profissao"
                  placeholder="Ex: Professor(a)"
                  {...register("profissao")}
                  className="border-gray-300 focus:outline-none focus:ring-0 focus:ring-offset-0"
                />
              </div>

              <div>
                <Label htmlFor="enderecoRequerente" className="text-gray-700">
                  Endereço Completo
                </Label>
                <Input
                  id="enderecoRequerente"
                  placeholder="Endereço completo"
                  {...register("enderecoRequerente")}
                  className="border-gray-300 focus:outline-none focus:ring-0 focus:ring-offset-0"
                />
              </div>

              <div>
                <Label htmlFor="telefoneRequerente" className="text-gray-700">
                  Telefone / Celular
                </Label>
                <Input
                  id="telefoneRequerente"
                  placeholder="(00) 00000-0000"
                  {...register("telefoneRequerente")}
                  className="border-gray-300 focus:outline-none focus:ring-0 focus:ring-offset-0"
                />
              </div>

              <div>
                <Label htmlFor="email" className="text-gray-700">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seuemail@exemplo.com"
                  {...register("email")}
                  className="border-gray-300 focus:outline-none focus:ring-0 focus:ring-offset-0"
                />
                {errors.email && (
                  <p className="text-red-500 text-sm">{errors.email.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="relacaoComFato" className="text-gray-700">
                  Relação com o Fato <span className="text-red-600">*</span>
                </Label>
                <Controller
                  name="relacaoComFato"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger
                        id="relacaoComFato"
                        className="border-gray-300 focus:outline-none focus:ring-0 focus:ring-offset-0"
                      >
                        <SelectValue placeholder="Selecione a relação com o fato" />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        <SelectItem value="Vítima">Vítima</SelectItem>
                        <SelectItem value="Testemunha">Testemunha</SelectItem>
                        <SelectItem value="Comunicante">Comunicante</SelectItem>
                        <SelectItem value="Outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.relacaoComFato && (
                  <p className="text-red-500 text-sm">
                    {errors.relacaoComFato.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button
              type="submit"
              className="bg-piaui-green hover:bg-piaui-green/90 text-white px-8"
              size="lg"
              disabled={
                registerBoMutation.isPending ||
                isTranscribingRelato ||
                isTranscribingAi
              }
            >
              <Save className="mr-2 h-5 w-5" />
              {registerBoMutation.isPending ||
              isTranscribingRelato ||
              isTranscribingAi ? (
                <Loader className="animate-spin" />
              ) : (
                "Registrar B.O."
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
