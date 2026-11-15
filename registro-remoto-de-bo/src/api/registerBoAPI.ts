import { z } from "zod";
import { RegisterBo } from "@/types/registerBo";
import type { SyncPayloadItem } from "@/lib/offlineStore";

class ApiError extends Error {
  status: number;
  data: unknown;
  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

const registerBoSchema = z.object({
  date_and_time_of_event: z.string(),
  place_of_the_fact: z.string(),
  type_of_occurrence: z.string(),
  full_name: z.string(),
  cpf_or_rg: z.string().optional(),
  date_of_birth: z.string().optional(),
  gender: z.string().optional(),
  nationality: z.string().optional(),
  marital_status: z.string().optional(),
  profession: z.string().optional(),
  full_address: z.string().optional(),
  phone_or_cell_phone: z.string().optional(),
  email: z.string().email().optional(),
  relationship_with_the_fact: z.string(),
  transcription: z.string().optional(),
});

export type RegisterBoData = z.infer<typeof registerBoSchema>;

// Preserva strings vazias ("") para permitir limpeza de campos opcionais no backend
function sanitizePayload<T extends Record<string, unknown>>(
  obj: T,
): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    // Não remova strings vazias: o backend usa "" para limpar (NULL)
    (out as Record<string, unknown>)[k] = v;
  }
  return out;
}

// Basic token resolver. Replace with real JWT management when available.
const getAuthToken = (): string | null => {
  return localStorage.getItem("authToken") || "test-token";
};

// Base API function
const apiFetch = async (url: string, options: RequestInit = {}) => {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  // Inject Authorization header if not present
  if (!headers.has("Authorization")) {
    const token = getAuthToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ message: "Erro desconhecido" }));
    const message =
      (errorData && (errorData.message || errorData.error)) ||
      "Ocorreu um erro na requisição";
    throw new ApiError(message, response.status, errorData);
  }

  // Handle 201 Created and 204 No Content, which may have empty bodies
  if (response.status === 201 || response.status === 204) {
    return null;
  }

  return response.json();
};

// Create B.O.
export const createBo = (data: RegisterBoData) => {
  return apiFetch("/api/register-bo", {
    method: "POST",
    body: JSON.stringify(sanitizePayload(data)),
  });
};

// Get all B.O.s
export const getBos = (
  page: number,
  limit: number,
  searchTerm: string,
  typeFilter: string,
): Promise<{ data: RegisterBo[]; total: number }> => {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  if (searchTerm) {
    params.set("searchTerm", searchTerm);
  }
  if (typeFilter && typeFilter !== "all") {
    params.set("typeFilter", typeFilter);
  }

  return apiFetch(`/api/register-bo?${params.toString()}`);
};

export const getAllBos = (
  searchTerm?: string,
  typeFilter?: string,
): Promise<{ data: RegisterBo[]; total: number }> => {
  const params = new URLSearchParams();

  if (searchTerm) {
    params.set("searchTerm", searchTerm);
  }
  if (typeFilter && typeFilter !== "all") {
    params.set("typeFilter", typeFilter);
  }

  const qs = params.toString();
  return apiFetch(`/api/register-bo/all${qs ? `?${qs}` : ""}`);
};

// Get B.O. by ID
export const getBoById = (id: string): Promise<RegisterBo> => {
  return apiFetch(`/api/register-bo/${id}`);
};

// Update B.O.
export const updateBo = (
  id: string,
  data: Partial<RegisterBoData>,
  policeIdentifier: string,
): Promise<RegisterBo> => {
  const body = {
    police_identifier: policeIdentifier,
    ...sanitizePayload(data),
  };
  return apiFetch(`/api/register-bo/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
};

// Delete B.O.
export const deleteBo = (
  id: string,
  policeIdentifier: string,
  reason?: string,
): Promise<null> => {
  return apiFetch(`/api/register-bo/${id}`, {
    method: "DELETE",
    body: JSON.stringify({
      police_identifier: policeIdentifier,
      reason: reason,
    }),
  });
};

// Sync offline-collected B.Os in batch
export const syncBoletins = (
  items: SyncPayloadItem[],
): Promise<{
  synced: { localId: string; serverId: string }[];
  failed: { localId: string; error: string }[];
}> => {
  return apiFetch("/api/sync/boletins", {
    method: "POST",
    body: JSON.stringify(items),
  });
};

// Autofill B.O.
export const autofillBo = async (userInput: string) => {
  const response = await fetch("/api/autofill-bo", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userInput }),
  });

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ message: "Erro desconhecido" }));
    throw new Error(errorData.message || "Erro ao preencher B.O.");
  }

  const data = await response.json();
  return data; // Retorna JSON completo
};
