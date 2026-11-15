import { useEffect, useState } from "react";
import { useForm, Controller, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RegisterBo } from "@/types/registerBo";
import { useUpdateBo } from "@/hooks/useRegisterBo";
import { toast } from "sonner";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { Mic, MicOff, Play, Square, Trash2 } from "lucide-react";
import { PoliceIdentifierDialog } from "@/components/PoliceIdentifierDialog";

// Validation schema for the edit form. All fields are optional for an update.
const boEditSchema = z.object({
  type_of_occurrence: z
    .string()
    .nullable()
    .optional()
    .refine((val) => val === undefined || val === null || val.trim() !== "", {
      message: "O tipo de ocorrência não pode estar vazio.",
    }),
  date_and_time_of_event: z
    .string()
    .nullable()
    .optional()
    .refine((val) => val === undefined || val === null || val.trim() !== "", {
      message: "A data e hora do evento não pode estar vazia.",
    })
    .refine(
      (date) => {
        if (!date || date.trim() === "") return true;
        const dateOnly = date.split("T")[0];
        return new Date(dateOnly + "T00:00:00") <= new Date();
      },
      {
        message: "A data da ocorrência não pode ser uma data futura.",
      }
    ),
  place_of_the_fact: z
    .string()
    .nullable()
    .optional()
    .refine((val) => val === undefined || val === null || val.trim() !== "", {
      message: "O local da ocorrência não pode estar vazio.",
    }),
  transcription: z
    .string()
    .nullable()
    .optional()
    .refine((val) => val === undefined || val === null || val.trim() !== "", {
      message: "O relato dos fatos não pode estar vazio.",
    }),
  full_name: z
    .string()
    .nullable()
    .optional()
    .refine((val) => val === undefined || val === null || val.trim() !== "", {
      message: "O nome completo não pode estar vazio.",
    }),
  cpf_or_rg: z.string().nullable().optional(),
  date_of_birth: z
    .string()
    .nullable()
    .optional()
    .refine(
      (val) => {
        if (!val || val.trim() === "") return true;
        const dateOnly = val.split("T")[0];
        return new Date(dateOnly + "T00:00:00") <= new Date();
      },
      {
        message: "A data de nascimento não pode ser uma data futura.",
      }
    ),
  gender: z.string().nullable().optional(),
  nationality: z.string().nullable().optional(),
  marital_status: z.string().nullable().optional(),
  profession: z.string().nullable().optional(),
  full_address: z.string().nullable().optional(),
  phone_or_cell_phone: z.string().nullable().optional(),
  // Email opcional: aceita string válida, vazio "" ou null
  email: z
    .string()
    .email("Formato de email inválido.")
    .optional()
    .or(z.literal(""))
    .or(z.null()),
  relationship_with_the_fact: z
    .string()
    .nullable()
    .optional()
    .refine((val) => val === undefined || val === null || val.trim() !== "", {
      message: "A relação com o fato não pode estar vazia.",
    }),
});

interface BoEditModalProps {
  bo: RegisterBo | null;
  isOpen: boolean;
  onClose: () => void;
}

type FormValues = z.infer<typeof boEditSchema>;

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
const generos = ["Masculino", "Feminino", "Outro"];
const estadosCivis = [
  "Solteiro(a)",
  "Casado(a)",
  "Divorciado(a)",
  "Viúvo(a)",
  "União Estável",
];
const relacoesComFato = ["Vítima", "Testemunha", "Comunicante", "Outro"];

// Campos comparáveis para enviar apenas alterações ao endpoint
const compareKeys: (keyof RegisterBo)[] = [
  "type_of_occurrence",
  "date_and_time_of_event",
  "place_of_the_fact",
  "transcription",
  "full_name",
  "cpf_or_rg",
  "date_of_birth",
  "gender",
  "nationality",
  "marital_status",
  "profession",
  "full_address",
  "phone_or_cell_phone",
  "email",
  "relationship_with_the_fact",
];

export const BoEditModal = ({ bo, isOpen, onClose }: BoEditModalProps) => {
  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(boEditSchema),
    shouldFocusError: false,
    mode: "onChange",
    reValidateMode: "onChange",
  });

  const { mutate: updateBo, isPending } = useUpdateBo();
  const [isPoliceDialogOpen, setIsPoliceDialogOpen] = useState(false);
  const [pendingPayload, setPendingPayload] =
    useState<Partial<FormValues> | null>(null);

  const handleTranscriptionComplete = (transcription: string) => {
    const currentTranscription = getValues("transcription") || "";
    const newTranscription = (
      currentTranscription +
      " " +
      transcription
    ).trim();
    setValue("transcription", newTranscription, { shouldValidate: true });
    if (newTranscription === "") {
      clearAudio();
    }
  };

  const {
    isRecording,
    audioBlob,
    isPlaying,
    isTranscribing,
    startRecording,
    stopRecording,
    playAudio,
    stopAudio,
    clearAudio,
  } = useAudioRecorder(
    handleTranscriptionComplete,
    () =>
      setValue(
        "transcription",
        getValues("transcription") + " Transcrevendo áudio..."
      ),
    () =>
      setValue(
        "transcription",
        getValues("transcription").replace(" Transcrevendo áudio...", "")
      ),
    {
      source: "edit-modal",
      context: "relato",
    }
  );

  useEffect(() => {
    if (bo) {
      const rawEvent = bo.date_and_time_of_event;
      let formattedEventDate: string | undefined = undefined;
      if (rawEvent) {
        const eventDate = new Date(rawEvent);
        if (!isNaN(eventDate.getTime())) {
          const year = eventDate.getFullYear();
          const month = (eventDate.getMonth() + 1).toString().padStart(2, "0");
          const day = eventDate.getDate().toString().padStart(2, "0");
          const hours = eventDate.getHours().toString().padStart(2, "0");
          const minutes = eventDate.getMinutes().toString().padStart(2, "0");
          formattedEventDate = `${year}-${month}-${day}T${hours}:${minutes}`;
        }
      }

      const birthDate = bo.date_of_birth ? new Date(bo.date_of_birth) : null;

      reset({
        ...bo,
        date_and_time_of_event: formattedEventDate,
        date_of_birth:
          birthDate && !isNaN(birthDate.getTime())
            ? birthDate.toISOString().substring(0, 10)
            : undefined,
      });
    } else {
      reset(); // Clear form when modal is closed or no BO is selected
    }
  }, [bo, reset]);

  const onSubmit: SubmitHandler<FormValues> = (data) => {
    if (!bo) return;

    // Helpers de normalização para comparação
    const toIsoOrEmpty = (input?: string | null) => {
      if (input === undefined || input === null) return "";
      const s = String(input).trim();
      if (s === "") return "";
      const d = new Date(s);
      return isNaN(d.getTime()) ? s : d.toISOString();
    };
    const normalizeForCompare = (
      key: keyof RegisterBo,
      val: unknown
    ): string => {
      if (val === null || val === undefined) return "";
      const s = String(val).trim();
      if (key === "date_and_time_of_event" || key === "date_of_birth") {
        return toIsoOrEmpty(s);
      }
      return s;
    };

    // Converte valores do formulário para formato de envio
    const submitValues: Partial<FormValues> = { ...data };
    if (submitValues.date_and_time_of_event !== undefined) {
      const s = String(submitValues.date_and_time_of_event).trim();
      submitValues.date_and_time_of_event =
        s === "" ? "" : new Date(s).toISOString();
    }
    if (submitValues.date_of_birth !== undefined) {
      const s = String(submitValues.date_of_birth).trim();
      submitValues.date_of_birth = s === "" ? "" : new Date(s).toISOString();
    }
    // Remove nulls (não enviar null) e preserva "" para limpeza
    for (const key of Object.keys(submitValues)) {
      const val = (submitValues as Record<string, unknown>)[key];
      if (val === null) {
        delete (submitValues as Record<string, unknown>)[key];
      }
    }

    // Calcula apenas campos alterados comparando com o BO original
    const changedOnly: Partial<FormValues> = {};
    for (const k of compareKeys) {
      // Valor atual preparado para envio
      const currentVal = (
        submitValues as Partial<Record<keyof RegisterBo, unknown>>
      )[k];
      // Valor original do BO
      const originalVal = bo[k as keyof RegisterBo];
      const normCurrent = normalizeForCompare(k, currentVal);
      const normOriginal = normalizeForCompare(k, originalVal);
      if (normCurrent !== normOriginal) {
        // Inclui no payload apenas se houver diferença
        (changedOnly as Record<string, unknown>)[k as string] =
          currentVal as unknown;
      }
    }

    // Se nada mudou, não prossegue com identificação/pedido
    if (Object.keys(changedOnly).length === 0) {
      toast.info("Nenhuma alteração foi detectada.");
      return;
    }

    setPendingPayload(changedOnly);
    setIsPoliceDialogOpen(true);
  };

  const handlePoliceConfirm = (
    policeIdentifier: string,
    clearInput: () => void
  ) => {
    if (!bo || !pendingPayload) return;
    const idToUse = bo.id;
    updateBo(
      { id: idToUse, data: pendingPayload, policeIdentifier },
      {
        onSuccess: () => {
          toast.success("B.O. atualizado com sucesso!");
          setIsPoliceDialogOpen(false);
          setPendingPayload(null);
          onClose();
        },
        onError: (err: unknown) => {
          const status = (err as { status?: number })?.status ?? undefined;
          if (status === 403) {
            toast.error("Identificação inválida", {
              description: "Verifique o número do policial e tente novamente.",
            });
            clearInput(); // limpa o campo e mantém o modal aberto
          } else {
            toast.error("Erro ao atualizar B.O.", {
              description: "Verifique os dados e tente novamente.",
            });
            setIsPoliceDialogOpen(false);
            setPendingPayload(null);
          }
        },
      }
    );
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Editar B.O. - {bo?.id.toString().substring(0, 8)}
            </DialogTitle>
            <DialogDescription>
              Modifique os campos necessários e clique em "Salvar Alterações".
            </DialogDescription>
          </DialogHeader>
          <form
            noValidate
            onSubmit={handleSubmit(onSubmit)}
            className="space-y-6 p-1"
          >
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">
                Dados da Ocorrência
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="type_of_occurrence">Tipo de Ocorrência</Label>
                  <Controller
                    name="type_of_occurrence"
                    control={control}
                    render={({ field }) => (
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <SelectTrigger id="type_of_occurrence">
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          {tiposOcorrencia.map((t) => (
                            <SelectItem key={t} value={t}>
                              {t}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.type_of_occurrence && (
                    <p className="text-sm text-red-600 mt-1">
                      {errors.type_of_occurrence.message}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="date_and_time_of_event">
                    Data e Hora do Evento
                  </Label>
                  <Input
                    id="date_and_time_of_event"
                    type="datetime-local"
                    {...register("date_and_time_of_event")}
                  />
                  {errors.date_and_time_of_event && (
                    <p className="text-sm text-red-600 mt-1">
                      {errors.date_and_time_of_event.message}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="place_of_the_fact">Local da Ocorrência</Label>
                  <Input
                    id="place_of_the_fact"
                    {...register("place_of_the_fact")}
                  />
                  {errors.place_of_the_fact && (
                    <p className="text-sm text-red-600 mt-1">
                      {errors.place_of_the_fact.message}
                    </p>
                  )}
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label htmlFor="transcription">Relato dos Fatos</Label>
                  <div className="flex items-center gap-2">
                    {!isRecording ? (
                      <Button
                        type="button"
                        onClick={startRecording}
                        size="sm"
                        variant="outline"
                        className="border-piaui-red text-piaui-red hover:bg-piaui-red hover:text-white"
                        disabled={isTranscribing}
                      >
                        <Mic className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        onClick={stopRecording}
                        size="sm"
                        variant="destructive"
                        className="animate-pulse"
                      >
                        <MicOff className="h-4 w-4" />
                      </Button>
                    )}
                    {audioBlob && (
                      <>
                        {!isPlaying ? (
                          <Button
                            type="button"
                            onClick={playAudio}
                            size="sm"
                            variant="outline"
                            className="border-piaui-green text-piaui-green hover:bg-piaui-green hover:text-white"
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            onClick={stopAudio}
                            size="sm"
                            variant="outline"
                          >
                            <Square className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          type="button"
                          onClick={() => {
                            clearAudio();
                            setValue("transcription", "");
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
                  id="transcription"
                  {...register("transcription")}
                  rows={4}
                  disabled={isTranscribing}
                />
                {errors.transcription && (
                  <p className="text-sm text-red-600 mt-1">
                    {errors.transcription.message}
                  </p>
                )}
                {isRecording && (
                  <p className="text-sm text-blue-600 mt-2 animate-pulse">
                    Gravando... Fale claramente o que aconteceu.
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">
                Dados do Requerente
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="full_name">Nome Completo</Label>
                  <Input id="full_name" {...register("full_name")} />
                  {errors.full_name && (
                    <p className="text-sm text-red-600 mt-1">
                      {errors.full_name.message}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="cpf_or_rg">CPF ou RG</Label>
                  <Input id="cpf_or_rg" {...register("cpf_or_rg")} />
                  {errors.cpf_or_rg && (
                    <p className="text-sm text-red-600 mt-1">
                      {errors.cpf_or_rg.message}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="date_of_birth">Data de Nascimento</Label>
                  <Input
                    id="date_of_birth"
                    type="date"
                    {...register("date_of_birth")}
                  />
                  {errors.date_of_birth && (
                    <p className="text-sm text-red-600 mt-1">
                      {errors.date_of_birth.message}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="gender">Gênero</Label>
                  <Controller
                    name="gender"
                    control={control}
                    render={({ field }) => (
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <SelectTrigger id="gender">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {generos.map((g) => (
                            <SelectItem key={g} value={g}>
                              {g}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.gender && (
                    <p className="text-sm text-red-600 mt-1">
                      {errors.gender.message}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="nacionalidade">Nacionalidade</Label>
                  <Input id="nacionalidade" {...register("nationality")} />
                  {errors.nationality && (
                    <p className="text-sm text-red-600 mt-1">
                      {errors.nationality.message}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="marital_status">Estado Civil</Label>
                  <Controller
                    name="marital_status"
                    control={control}
                    render={({ field }) => (
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <SelectTrigger id="marital_status">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {estadosCivis.map((e) => (
                            <SelectItem key={e} value={e}>
                              {e}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.marital_status && (
                    <p className="text-sm text-red-600 mt-1">
                      {errors.marital_status.message}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="profession">Profissão</Label>
                  <Input id="profession" {...register("profession")} />
                  {errors.profession && (
                    <p className="text-sm text-red-600 mt-1">
                      {errors.profession.message}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="full_address">Endereço Completo</Label>
                  <Input id="full_address" {...register("full_address")} />
                  {errors.full_address && (
                    <p className="text-sm text-red-600 mt-1">
                      {errors.full_address.message}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="phone_or_cell_phone">
                    Telefone / Celular
                  </Label>
                  <Input
                    id="phone_or_cell_phone"
                    {...register("phone_or_cell_phone")}
                  />
                  {errors.phone_or_cell_phone && (
                    <p className="text-sm text-red-600 mt-1">
                      {errors.phone_or_cell_phone.message}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" {...register("email")} />
                  {errors.email && (
                    <p className="text-sm text-red-600 mt-1">
                      {errors.email.message}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="relationship_with_the_fact">
                    Relação com o Fato
                  </Label>
                  <Controller
                    name="relationship_with_the_fact"
                    control={control}
                    render={({ field }) => (
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <SelectTrigger id="relationship_with_the_fact">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {relacoesComFato.map((r) => (
                            <SelectItem key={r} value={r}>
                              {r}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.relationship_with_the_fact && (
                    <p className="text-sm text-red-600 mt-1">
                      {errors.relationship_with_the_fact.message}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter className="pt-4">
              <DialogClose asChild>
                <Button type="button" variant="secondary">
                  Cancelar
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isPending || isTranscribing}>
                {isPending || isTranscribing
                  ? "Salvando..."
                  : "Salvar Alterações"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <PoliceIdentifierDialog
        open={isPoliceDialogOpen}
        onClose={() => {
          setIsPoliceDialogOpen(false);
          setPendingPayload(null);
        }}
        onConfirm={handlePoliceConfirm}
        title="Confirmar Identificação do Policial"
        description="Informe o número de identificação para confirmar a edição do B.O."
      />
    </>
  );
};
