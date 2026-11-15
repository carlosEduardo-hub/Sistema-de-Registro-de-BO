import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createBo,
  getBos,
  getBoById,
  updateBo,
  deleteBo,
  RegisterBoData,
} from '@/api/registerBoAPI';

const BO_QUERY_KEY = 'registerBos';

// Hook to get all B.O.s with pagination
export const useGetBos = (page: number, limit: number, searchTerm: string, typeFilter: string) => {
  return useQuery({
    queryKey: [BO_QUERY_KEY, { page, limit, searchTerm, typeFilter }],
    queryFn: () => getBos(page, limit, searchTerm, typeFilter),
    placeholderData: keepPreviousData,
    staleTime: 300000, // 5 minutes
  });
};

// Hook to get a single B.O. by ID
export const useGetBoById = (id: string | null) => {
  return useQuery({
    queryKey: [BO_QUERY_KEY, id],
    queryFn: () => getBoById(id!),
    enabled: !!id, // Only run query if ID is not null
  });
};

// Hook to create a B.O.
export const useCreateBo = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createBo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [BO_QUERY_KEY] });
    },
  });
};

// Hook to update a B.O.
export const useUpdateBo = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data, policeIdentifier }: { id: string; data: Partial<RegisterBoData>; policeIdentifier: string }) => updateBo(id, data, policeIdentifier),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: [BO_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [BO_QUERY_KEY, id] });
    },
  });
};

// Hook to delete a B.O.
export const useDeleteBo = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, policeIdentifier, reason }: { id: string; policeIdentifier: string; reason?: string }) => deleteBo(id, policeIdentifier, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [BO_QUERY_KEY] });
    },
  });
};
