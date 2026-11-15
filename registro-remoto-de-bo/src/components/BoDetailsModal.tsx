import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RegisterBo } from "@/types/registerBo";
import { FileText, Calendar, Clock, User, MapPin, Briefcase, Info, Mail, Phone, Edit, Trash2, Building, Heart, Globe } from "lucide-react";

interface BoDetailsModalProps {
  bo: RegisterBo;
  onEdit: (bo: RegisterBo) => void;
  onDelete: (id: string | number) => void;
}

const DetailItem = ({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string | null }) => (
  <div className="flex items-start gap-3 py-2">
    <div className="text-piaui-green mt-1">{icon}</div>
    <div>
      <p className="font-semibold text-gray-700">{label}</p>
      <p className="text-gray-600 text-sm">{value || "Não informado"}</p>
    </div>
  </div>
);

export const BoDetailsModal = ({ bo, onEdit, onDelete }: BoDetailsModalProps) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <FileText className="h-4 w-4" />
          <span className="ml-2 hidden lg:inline">Ver Detalhes</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl text-gray-800">
            <FileText className="h-6 w-6 text-piaui-blue" />
            Detalhes do B.O. - {bo.id.toString()}
          </DialogTitle>
          <DialogDescription>
            Visualização completa dos detalhes do Boletim de Ocorrência. Você pode editar ou deletar o registro a partir daqui.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-grow overflow-y-auto pr-4 -mr-4 space-y-4 mt-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2 mb-2">Dados da Ocorrência</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
              <DetailItem icon={<Info className="h-5 w-5" />} label="Tipo de Ocorrência" value={bo.type_of_occurrence} />
              <DetailItem icon={<Calendar className="h-5 w-5" />} label="Data e Hora do Evento" value={new Date(bo.date_and_time_of_event).toLocaleString()} />
              <DetailItem icon={<Clock className="h-5 w-5" />} label="Data e Hora do Registro" value={new Date(bo.createdAt).toLocaleString()} />
              <DetailItem icon={<MapPin className="h-5 w-5" />} label="Local do Fato" value={bo.place_of_the_fact} />
              <DetailItem icon={<Info className="h-5 w-5" />} label="Relação com o Fato" value={bo.relationship_with_the_fact} />
            </div>
            {bo.transcription && 
              <div className="mt-4">
                <DetailItem icon={<FileText className="h-5 w-5" />} label="Transcrição do Relato" value={bo.transcription} />
              </div>
            }
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2 mb-2">Dados do Requerente</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
              <DetailItem icon={<User className="h-5 w-5" />} label="Nome Completo" value={bo.full_name} />
              <DetailItem icon={<Info className="h-5 w-5" />} label="CPF ou RG" value={bo.cpf_or_rg} />
              <DetailItem icon={<Calendar className="h-5 w-5" />} label="Data de Nascimento" value={bo.date_of_birth ? new Date(bo.date_of_birth).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : undefined} />
              <DetailItem icon={<User className="h-5 w-5" />} label="Gênero" value={bo.gender} />
              <DetailItem icon={<Globe className="h-5 w-5" />} label="Nacionalidade" value={bo.nationality} />
              <DetailItem icon={<Heart className="h-5 w-5" />} label="Estado Civil" value={bo.marital_status} />
              <DetailItem icon={<Briefcase className="h-5 w-5" />} label="Profissão" value={bo.profession} />
              <DetailItem icon={<Building className="h-5 w-5" />} label="Endereço Completo" value={bo.full_address} />
              <DetailItem icon={<Phone className="h-5 w-5" />} label="Telefone" value={bo.phone_or_cell_phone} />
              <DetailItem icon={<Mail className="h-5 w-5" />} label="Email" value={bo.email} />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 flex-shrink-0">
            <Button variant="outline" onClick={() => onEdit(bo)}>
                <Edit className="h-4 w-4 mr-2" />
                Editar
            </Button>
            <Button variant="destructive" onClick={() => onDelete(bo.id)}>
                <Trash2 className="h-4 w-4 mr-2" />
                Deletar
            </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};