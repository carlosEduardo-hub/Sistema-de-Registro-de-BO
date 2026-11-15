import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Shield,
  Car,
  Home,
  Smartphone,
  AlertTriangle,
  ShoppingBag,
  Zap,
  FileText,
  Mic,
  MicOff,
  Play,
  Square,
  Trash2,
  Wand2,
  Loader,
  HelpCircle,
  Save,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useCreateBo } from '@/hooks/useRegisterBo';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { toast } from 'sonner';
import { autofillBo } from '@/api/registerBoAPI';
import { savePendingBo, BoSyncBody } from '@/lib/offlineStore';

const quickActions = [
  {
    title: 'Furto/Roubo',
    icon: Shield,
    color: 'bg-piaui-red hover:bg-piaui-red/90',
    description: 'Registro rápido de furto ou roubo',
  },
  {
    title: 'Acidente de Trânsito',
    icon: Car,
    color: 'bg-piaui-yellow hover:bg-piaui-yellow/90',
    description: 'Acidentes de trânsito sem vítimas',
  },
  {
    title: 'Violência Doméstica',
    icon: Home,
    color: 'bg-piaui-blue hover:bg-piaui-blue/90',
    description: 'Casos de violência doméstica',
  },
  {
    title: 'Perda de Documentos',
    icon: Smartphone,
    color: 'bg-piaui-green hover:bg-piaui-green/90',
    description: 'Perda ou roubo de documentos',
  },
  {
    title: 'Ameaça',
    icon: AlertTriangle,
    color: 'bg-orange-500 hover:bg-orange-600',
    description: 'Registro de ameaças',
  },
  {
    title: 'Dano ao Patrimônio',
    icon: ShoppingBag,
    color: 'bg-purple-500 hover:bg-purple-600',
    description: 'Danos a bens patrimoniais',
  },
];

// Schema mínimo para registro rápido
const quickBoSchema = z.object({
  tipoOcorrencia: z.string().nonempty('O tipo de ocorrência é obrigatório.'),
  dataOcorrencia: z
    .string()
    .nonempty('A data da ocorrência é obrigatória.')
    .refine((date) => new Date(date + 'T00:00:00') <= new Date(), {
      message: 'A data da ocorrência não pode ser uma data futura.',
    }),
  horaOcorrencia: z.string().nonempty('A hora da ocorrência é obrigatória.'),
  localOcorrencia: z.string().nonempty('O local da ocorrência é obrigatório.'),
  relato: z.string().nonempty('O relato dos fatos é obrigatório.'),
  nomeRequerente: z.string().nonempty('O nome do requerente é obrigatório.'),
  relacaoComFato: z.string().nonempty('A relação com o fato é obrigatória.'),
});

type QuickBOFormData = z.infer<typeof quickBoSchema>;

interface QuickActionsProps {
  onActionSelect: (action: string) => void;
}

export function QuickActions({ onActionSelect }: QuickActionsProps) {
  const [selectedAction, setSelectedAction] = useState<string>('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAutofilling, setIsAutofilling] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
    setValue,
    getValues,
  } = useForm<QuickBOFormData>({
    resolver: zodResolver(quickBoSchema),
    defaultValues: {
      tipoOcorrencia: '',
      dataOcorrencia: new Date().toISOString().split('T')[0],
      horaOcorrencia: new Date().toTimeString().substring(0, 5),
      localOcorrencia: '',
      relato: '',
      nomeRequerente: '',
      relacaoComFato: 'Comunicante',
    },
  });

  const registerBoMutation = useCreateBo();

  // Gravação de áudio para Relato
  const handleRelatoTranscriptionComplete = (transcription: string) => {
    const currentRelato = getValues('relato') || '';
    const newRelato = currentRelato.replace('Transcrevendo áudio...', transcription);
    setValue('relato', newRelato, { shouldValidate: true });
    if (newRelato.trim() === '') {
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
      const currentRelato = getValues('relato') || '';
      const newRelato = currentRelato.trim()
        ? `${currentRelato.trim()} Transcrevendo áudio...`
        : 'Transcrevendo áudio...';
      setValue('relato', newRelato, { shouldValidate: false });
    },
    () => {
      const currentRelato = getValues('relato') || '';
      if (currentRelato.endsWith('Transcrevendo áudio...')) {
        setValue('relato', currentRelato.replace('Transcrevendo áudio...', '').trim(), {
          shouldValidate: false,
        });
      }
    },
    {
      source: 'quick-action',
      context: 'relato',
    }
  );

  // Gravação de áudio para Prompt da IA
  const handleAiPromptTranscriptionComplete = (transcription: string) => {
    setAiPrompt((currentPrompt) => {
      const newPrompt = (currentPrompt || '').replace('Transcrevendo áudio...', transcription);
      if (newPrompt.trim() === '') {
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
        const prompt = currentPrompt || '';
        return prompt.trim() ? `${prompt.trim()} Transcrevendo áudio...` : 'Transcrevendo áudio...';
      });
    },
    () => {
      setAiPrompt((currentPrompt) => {
        const prompt = currentPrompt || '';
        if (prompt.endsWith('Transcrevendo áudio...')) {
          return prompt.replace('Transcrevendo áudio...', '').trim();
        }
        return prompt;
      });
    },
    {
      source: 'quick-action',
      context: 'autofill-prompt',
    }
  );

  // Mapeadores da IA
  const mapTipoOcorrencia = (value: string) => {
    if (!value) return '';
    const map: Record<string, string> = {
      roubo: 'Roubo',
      furto: 'Furto',
      'lesão corporal': 'Lesão Corporal',
      dano: 'Dano ao Patrimônio',
      ameaça: 'Ameaça',
      perturbação: 'Perturbação do Sossego',
      'violência doméstica': 'Violência Doméstica',
      'acidente de trânsito': 'Acidente de Trânsito',
      outros: 'Outros',
    };
    const key = value.toLowerCase();
    return map[key] || '';
  };

  const mapRelacaoComFato = (value: string) => {
    if (!value) return '';
    const map: Record<string, string> = {
      vítima: 'Vítima',
      vitima: 'Vítima',
      testemunha: 'Testemunha',
      comunicante: 'Comunicante',
      outro: 'Outro',
    };
    const key = value.toLowerCase();
    return map[key] || '';
  };

  const handleAutofill = async () => {
    if (!aiPrompt.trim()) {
      toast.error('Digite ou grave um relato para que a IA possa preencher.');
      return;
    }
    setIsAutofilling(true);
    try {
      const data = await autofillBo(aiPrompt);
      const mapped: Partial<QuickBOFormData> = {
        tipoOcorrencia: mapTipoOcorrencia(data.type_of_occurrence || '') || getValues('tipoOcorrencia'),
        dataOcorrencia: data.date_and_time_of_event?.split('T')[0] || getValues('dataOcorrencia'),
        horaOcorrencia: data.date_and_time_of_event?.split('T')[1]?.substring(0, 5) || getValues('horaOcorrencia'),
        localOcorrencia: data.place_of_the_fact || getValues('localOcorrencia'),
        relato: data.transcription || getValues('relato'),
        nomeRequerente: data.full_name || getValues('nomeRequerente'),
        relacaoComFato: mapRelacaoComFato(data.relationship_with_the_fact || '') || getValues('relacaoComFato'),
      };
      Object.entries(mapped).forEach(([key, value]) => {
        if (value !== undefined) {
          setValue(key as keyof QuickBOFormData, value, { shouldValidate: true });
        }
      });
      toast.success('Campos preenchidos automaticamente pela IA!');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao preencher com IA.');
    } finally {
      setIsAutofilling(false);
    }
  };

  const tiposOcorrencia = [
    'Furto',
    'Roubo',
    'Lesão Corporal',
    'Dano ao Patrimônio',
    'Ameaça',
    'Perturbação do Sossego',
    'Violência Doméstica',
    'Acidente de Trânsito',
    'Outros',
  ];

  const relacoes = ['Comunicante', 'Vítima', 'Testemunha', 'Outro'];

  const onSubmit = async (data: QuickBOFormData) => {
    const date_and_time_of_event = new Date(`${data.dataOcorrencia}T${data.horaOcorrencia}`).toISOString();
    const boBody: BoSyncBody = {
      type_of_occurrence: data.tipoOcorrencia,
      date_and_time_of_event,
      place_of_the_fact: data.localOcorrencia,
      transcription: data.relato,
      full_name: data.nomeRequerente,
      relationship_with_the_fact: data.relacaoComFato,
    };

    if (navigator.onLine) {
      registerBoMutation.mutate(boBody, {
        onSuccess: () => {
          toast.success('B.O registrado com sucesso!', { duration: 3000 });
          reset();
          setSelectedAction('');
          setAiPrompt('');
          clearAudioAi();
          clearAudioRelato();
        },
        onError: () => {
          toast.error('Erro ao registrar o B.O!', { duration: 3000 });
        },
      });
    } else {
      const localId = crypto.randomUUID();
      const collected_at = new Date().toISOString();
      try {
        await savePendingBo(localId, collected_at, boBody /*, audioBlobRelato */);
        toast.warning('Offline — B.O. salvo localmente e será sincronizado ao reconectar.', { duration: 4000 });
        reset();
        setSelectedAction('');
        setAiPrompt('');
        clearAudioAi();
        clearAudioRelato();
      } catch (err) {
        console.error(err);
        toast.error('Falha ao salvar localmente. Tente novamente.');
      }
    }
  };

  return (
    <Card>
      <CardHeader className="bg-gradient-to-r from-piaui-green to-piaui-green-light text-white">
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-6 w-6" />
          Registro Rápido
        </CardTitle>
      </CardHeader>

      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickActions.map((action) => {
            const IconComponent = action.icon;
            return (
              <Button
                key={action.title}
                onClick={() => {
                  setSelectedAction(action.title);
                  const mappedTipo =
                    action.title.includes('Furto') || action.title.includes('Roubo') ? '' : action.title;
                  setValue('tipoOcorrencia', mappedTipo, { shouldValidate: false });
                  onActionSelect(action.title);
                }}
                className={`${action.color} text-white h-auto p-4 flex flex-col items-center gap-2 transition-all hover:scale-105`}
                variant="default"
              >
                <IconComponent className="h-8 w-8" />
                <div className="text-center">
                  <div className="font-semibold">{action.title}</div>
                  <div className="text-xs opacity-90">{action.description}</div>
                </div>
              </Button>
            );
          })}
        </div>

        <p className="text-sm text-gray-600 mt-4 text-center">
          Clique em uma opção e preencha rapidamente os campos essenciais.
        </p>

        {selectedAction && (
          <div className="mt-6 space-y-4">
            {/* Preenchimento por IA */}
            <div className="flex items-center gap-1.5">
              <Label htmlFor="ai-prompt" className="text-gray-700">
                Preenchimento por IA
              </Label>
              <Button type="button" variant="ghost" size="icon" className="h-5 w-5 cursor-help rounded-full">
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
            <Textarea
              id="ai-prompt"
              placeholder={
                isTranscribingAi
                  ? 'Transcrevendo áudio...'
                  : 'Descreva rapidamente o ocorrido para a IA preencher os campos.'
              }
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              className="border-gray-300 min-h-[90px] focus:outline-none focus:ring-0 focus:ring-offset-0"
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
                  <Button type="button" onClick={stopRecordingAi} size="sm" variant="destructive" className="animate-pulse">
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
                      <Button type="button" onClick={stopAudioAi} size="sm" variant="outline">
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
                  {isAutofilling ? <Loader className="animate-spin h-4 w-4" /> : <Wand2 className="h-4 w-4" />}
                  <span className="ml-2 hidden sm:inline">Preencher</span>
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    setAiPrompt('');
                    clearAudioAi();
                    toast.info('Campo de preenchimento por IA limpo.');
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

            <Separator className="my-4" />

            {/* Formulário mínimo */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
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
                          <SelectValue placeholder="Selecione" />
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
                    <p className="text-red-500 text-sm">{errors.tipoOcorrencia.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="dataOcorrencia" className="text-gray-700">
                    Data <span className="text-red-600">*</span>
                  </Label>
                  <Input
                    id="dataOcorrencia"
                    type="date"
                    {...register('dataOcorrencia')}
                    className="border-gray-300 focus:outline-none focus:ring-0 focus:ring-offset-0"
                  />
                  {errors.dataOcorrencia && (
                    <p className="text-red-500 text-sm">{errors.dataOcorrencia.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="horaOcorrencia" className="text-gray-700">
                    Hora <span className="text-red-600">*</span>
                  </Label>
                  <Input
                    id="horaOcorrencia"
                    type="time"
                    {...register('horaOcorrencia')}
                    className="border-gray-300 focus:outline-none focus:ring-0 focus:ring-offset-0"
                  />
                  {errors.horaOcorrencia && (
                    <p className="text-red-500 text-sm">{errors.horaOcorrencia.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="localOcorrencia" className="text-gray-700">
                    Local da Ocorrência <span className="text-red-600">*</span>
                  </Label>
                  <Input
                    id="localOcorrencia"
                    placeholder="Endereço completo"
                    {...register('localOcorrencia')}
                    className="border-gray-300 focus:outline-none focus:ring-0 focus:ring-offset-0"
                  />
                  {errors.localOcorrencia && (
                    <p className="text-red-500 text-sm">{errors.localOcorrencia.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="nomeRequerente" className="text-gray-700">
                    Nome do Requerente <span className="text-red-600">*</span>
                  </Label>
                  <Input
                    id="nomeRequerente"
                    placeholder="Seu nome completo"
                    {...register('nomeRequerente')}
                    className="border-gray-300 focus:outline-none focus:ring-0 focus:ring-offset-0"
                  />
                  {errors.nomeRequerente && (
                    <p className="text-red-500 text-sm">{errors.nomeRequerente.message}</p>
                  )}
                </div>
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
                        className="border-piaui-green text-piaui-green hover:bg-piaui-green hover:text-white"
                        disabled={isTranscribingRelato}
                      >
                        <Mic className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button type="button" onClick={stopRecordingRelato} size="sm" variant="destructive" className="animate-pulse">
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
                          <Button type="button" onClick={stopAudioRelato} size="sm" variant="outline">
                            <Square className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          type="button"
                          onClick={() => {
                            clearAudioRelato();
                            setValue('relato', '');
                            toast.info('Relato dos fatos limpo.');
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
                  placeholder={isTranscribingRelato ? 'Transcrevendo áudio...' : 'Descreva resumidamente o que aconteceu.'}
                  {...register('relato')}
                  className="border-gray-300 min-h-[90px] focus:outline-none focus:ring-0 focus:ring-offset-0"
                  disabled={isTranscribingRelato}
                />
                {errors.relato && <p className="text-red-500 text-sm">{errors.relato.message}</p>}
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
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        {relacoes.map((r) => (
                          <SelectItem key={r} value={r}>
                            {r}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.relacaoComFato && (
                  <p className="text-red-500 text-sm">{errors.relacaoComFato.message}</p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    reset();
                    setAiPrompt('');
                    clearAudioAi();
                    clearAudioRelato();
                  }}
                >
                  Limpar
                </Button>
                <Button
                  type="submit"
                  className="bg-piaui-green text-white hover:bg-piaui-green/90"
                  disabled={registerBoMutation.isPending || isTranscribingRelato || isTranscribingAi}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {registerBoMutation.isPending || isTranscribingRelato || isTranscribingAi
                    ? 'Processando...'
                    : 'Registrar'}
                </Button>
              </div>
            </form>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
