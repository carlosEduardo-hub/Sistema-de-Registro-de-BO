export interface RegisterBo {
  id: string;
  date_and_time_of_event: string;
  place_of_the_fact: string;
  type_of_occurrence: string;
  full_name: string;
  cpf_or_rg?: string;
  date_of_birth?: string;
  gender?: string;
  nationality?: string;
  marital_status?: string;
  profession?: string;
  full_address?: string;
  phone_or_cell_phone?: string;
  email?: string;
  relationship_with_the_fact: string;
  transcription?: string;
  createdAt: string;
  updatedAt: string;
}
