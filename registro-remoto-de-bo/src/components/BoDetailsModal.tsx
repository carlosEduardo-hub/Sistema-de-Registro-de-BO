import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { RegisterBo } from "@/types/registerBo";
import {
  FileText,
  Calendar,
  Clock,
  User,
  MapPin,
  Briefcase,
  Info,
  Mail,
  Phone,
  Edit,
  Trash2,
  Building,
  Heart,
  Globe,
} from "lucide-react";

interface BoDetailsModalProps {
  bo: RegisterBo;
  onEdit: (bo: RegisterBo) => void;
  onDelete: (id: string | number) => void;
}

const DetailItem = ({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string | null;
}) => (
  <div className="flex min-w-0 items-start gap-3 py-2">
    <div className="mt-1 shrink-0 text-piaui-green">{icon}</div>
    <div className="min-w-0">
      <p className="font-semibold text-gray-700">{label}</p>
      <p className="break-words text-sm text-gray-600">
        {value || "Não informado"}
      </p>
    </div>
  </div>
);

export const BoDetailsModal = ({
  bo,
  onEdit,
  onDelete,
}: BoDetailsModalProps) => {
  return (
    <Dialog>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0"
              aria-label="Ver detalhes"
            >
              <FileText className="h-4 w-4" />
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>
          <span>Ver detalhes</span>
        </TooltipContent>
      </Tooltip>
      <DialogContent className="flex max-h-[min(92dvh,920px)] w-[calc(100%-1.5rem)] flex-col overflow-hidden p-0 sm:max-w-3xl sm:p-0">
        <DialogHeader className="shrink-0 space-y-1.5 border-b px-4 py-4 text-left sm:px-6">
          <DialogTitle className="flex items-center gap-2 text-lg text-gray-800 sm:text-xl">
            <FileText className="h-5 w-5 shrink-0 text-piaui-blue sm:h-6 sm:w-6" />
            <span className="min-w-0 truncate">
              Detalhes do B.O. - {String(bo.id).slice(0, 8)}
            </span>
          </DialogTitle>
          <DialogDescription className="text-left">
            Visualização completa do boletim. Você pode editar ou excluir a
            partir daqui.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
          <div className="space-y-4">
            <div>
              <h3 className="mb-2 border-b border-gray-200 pb-2 text-base font-semibold text-gray-800 sm:text-lg">
                Dados da Ocorrência
              </h3>
              <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
                <DetailItem
                  icon={<Info className="h-5 w-5" />}
                  label="Tipo de Ocorrência"
                  value={bo.type_of_occurrence}
                />
                <DetailItem
                  icon={<Calendar className="h-5 w-5" />}
                  label="Data e Hora do Evento"
                  value={new Date(bo.date_and_time_of_event).toLocaleString()}
                />
                <DetailItem
                  icon={<Clock className="h-5 w-5" />}
                  label="Data e Hora do Registro"
                  value={new Date(bo.createdAt).toLocaleString()}
                />
                <DetailItem
                  icon={<MapPin className="h-5 w-5" />}
                  label="Local do Fato"
                  value={bo.place_of_the_fact}
                />
                <DetailItem
                  icon={<Info className="h-5 w-5" />}
                  label="Relação com o Fato"
                  value={bo.relationship_with_the_fact}
                />
              </div>
              {bo.transcription ? (
                <div className="mt-2">
                  <DetailItem
                    icon={<FileText className="h-5 w-5" />}
                    label="Transcrição do Relato"
                    value={bo.transcription}
                  />
                </div>
              ) : null}
            </div>

            <div>
              <h3 className="mb-2 border-b border-gray-200 pb-2 text-base font-semibold text-gray-800 sm:text-lg">
                Dados do Requerente
              </h3>
              <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
                <DetailItem
                  icon={<User className="h-5 w-5" />}
                  label="Nome Completo"
                  value={bo.full_name}
                />
                <DetailItem
                  icon={<Info className="h-5 w-5" />}
                  label="CPF ou RG"
                  value={bo.cpf_or_rg}
                />
                <DetailItem
                  icon={<Calendar className="h-5 w-5" />}
                  label="Data de Nascimento"
                  value={
                    bo.date_of_birth
                      ? new Date(bo.date_of_birth).toLocaleDateString("pt-BR", {
                          timeZone: "UTC",
                        })
                      : undefined
                  }
                />
                <DetailItem
                  icon={<User className="h-5 w-5" />}
                  label="Gênero"
                  value={bo.gender}
                />
                <DetailItem
                  icon={<Globe className="h-5 w-5" />}
                  label="Nacionalidade"
                  value={bo.nationality}
                />
                <DetailItem
                  icon={<Heart className="h-5 w-5" />}
                  label="Estado Civil"
                  value={bo.marital_status}
                />
                <DetailItem
                  icon={<Briefcase className="h-5 w-5" />}
                  label="Profissão"
                  value={bo.profession}
                />
                <DetailItem
                  icon={<Building className="h-5 w-5" />}
                  label="Endereço Completo"
                  value={bo.full_address}
                />
                <DetailItem
                  icon={<Phone className="h-5 w-5" />}
                  label="Telefone"
                  value={bo.phone_or_cell_phone}
                />
                <DetailItem
                  icon={<Mail className="h-5 w-5" />}
                  label="Email"
                  value={bo.email}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-col-reverse gap-2 border-t px-4 py-4 sm:flex-row sm:justify-end sm:px-6">
          <Button variant="outline" onClick={() => onEdit(bo)} className="w-full sm:w-auto">
            <Edit className="mr-2 h-4 w-4" />
            Editar
          </Button>
          <Button
            variant="destructive"
            onClick={() => onDelete(bo.id)}
            className="w-full sm:w-auto"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Deletar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
