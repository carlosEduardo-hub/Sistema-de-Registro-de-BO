import { useState, useEffect } from "react";
import useDebounceValue from "@/hooks/use-debounce-value";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download, Edit, Trash2, Loader2, Upload } from "lucide-react";
import { useGetBos, useDeleteBo } from "@/hooks/useRegisterBo";
import { useQueryClient } from "@tanstack/react-query";
import { RegisterBo } from "@/types/registerBo";
import { BoDetailsModal } from "@/components/BoDetailsModal";
import { BoEditModal } from "@/components/BoEditModal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { generateBoPdf } from "@/lib/pdfGenerator";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { NetworkStatusIndicator } from "@/components/NetworkStatusIndicator";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  buildSyncPayload,
  listPendingBos,
  loadDecryptedBody,
  markFailed,
  OfflineBoItem,
  removePendingBo,
} from "@/lib/offlineStore";
import { syncBoletins } from "@/api/registerBoAPI";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { PoliceIdentifierDialog } from "@/components/PoliceIdentifierDialog";

export default function History() {
  const [page, setPage] = useState(1);
  const limit = 10;
  const [editingBo, setEditingBo] = useState<RegisterBo | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<
    string | number | null
  >(null);
  const [pendingItems, setPendingItems] = useState<OfflineBoItem[]>([]);
  const [isSyncingOne, setIsSyncingOne] = useState<string | null>(null);
  const [isSyncingAll, setIsSyncingAll] = useState(false);

  const [filters, setFilters] = useState({
    searchTerm: "",
    typeFilter: "all",
  });
  const debouncedSearchTerm = useDebounceValue(filters.searchTerm, 500);

  const { data, isLoading, error, isPlaceholderData } = useGetBos(
    page,
    limit,
    debouncedSearchTerm,
    filters.typeFilter,
  );
  const { mutate: deleteBo } = useDeleteBo();
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isPoliceDialogOpen, setIsPoliceDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    setPage(1);
  }, [debouncedSearchTerm, filters.typeFilter]);

  const refreshPendings = async () => {
    try {
      const items = await listPendingBos();
      setPendingItems(items);
    } catch (err) {
      console.error(err);
      toast.error("Falha ao carregar pendentes offline");
    }
  };

  useEffect(() => {
    refreshPendings();
  }, []);

  const handleDeleteConfirm = (
    policeIdentifier: string,
    clearInput: () => void,
    reason?: string,
  ) => {
    if (!deleteTargetId) return;
    deleteBo(
      { id: deleteTargetId, policeIdentifier, reason },
      {
        onSuccess: () => {
          toast.success("B.O. deletado com sucesso!");
          setIsPoliceDialogOpen(false);
          setDeleteTargetId(null);
        },
        onError: (err: unknown) => {
          const status = (err as { status?: number })?.status ?? undefined;
          if (status === 403) {
            toast.error("Identificação inválida", {
              description: "Verifique o número do policial e tente novamente.",
            });
            clearInput();
          } else {
            toast.error("Erro ao deletar B.O.");
            setIsPoliceDialogOpen(false);
            setDeleteTargetId(null);
          }
        },
      },
    );
  };

  const handleExportPdf = async (bo: RegisterBo) => {
    setIsGeneratingPdf(bo.id);
    try {
      await generateBoPdf(bo);
      toast.success(`PDF para o B.O. ${bo.id} gerado com sucesso!`);
    } catch (err) {
      toast.error("Erro ao gerar o PDF.");
      console.error(err);
    } finally {
      setIsGeneratingPdf(null);
    }
  };

  const handleFilterChange = (
    filterName: keyof typeof filters,
    value: string,
  ) => {
    setFilters((prev) => ({ ...prev, [filterName]: value }));
  };

  const totalItems = data?.total ?? 0;
  const totalPages = totalItems > 0 ? Math.ceil(totalItems / limit) : 1;
  const hasActiveFilters =
    Boolean(filters.searchTerm.trim()) || filters.typeFilter !== "all";

  const handleClearFilters = () => {
    setFilters({ searchTerm: "", typeFilter: "all" });
  };

  const handleRefreshList = () => {
    queryClient.invalidateQueries({ queryKey: ["registerBos"] });
  };

  const handleSyncAllPendings = async () => {
    if (pendingItems.length === 0) return;
    setIsSyncingAll(true);
    try {
      const payload = await buildSyncPayload(pendingItems);
      const res = await syncBoletins(payload);

      const syncedIds = new Set(res.synced.map((s) => s.localId));
      const failedById = new Map(res.failed.map((f) => [f.localId, f.error]));

      await Promise.all(
        pendingItems.map(async (p) => {
          if (syncedIds.has(p.localId)) {
            await removePendingBo(p.localId);
            return;
          }
          const err = failedById.get(p.localId);
          if (err) {
            await markFailed(p.localId, err || "Erro desconhecido");
          }
        }),
      );

      if (res.synced.length > 0) {
        toast.success("Pendentes sincronizados", {
          description: `${res.synced.length} enviado(s) com sucesso.`,
        });
      }
      if (res.failed.length > 0) {
        toast.warning("Alguns itens falharam", {
          description: `${res.failed.length} item(ns) permaneceram na fila.`,
        });
      }

      handleRefreshList();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao sincronizar pendentes");
    } finally {
      setIsSyncingAll(false);
      await refreshPendings();
    }
  };

  return (
    <SidebarProvider>
      <BoEditModal
        bo={editingBo}
        isOpen={!!editingBo}
        onClose={() => setEditingBo(null)}
      />
      <div className="flex min-h-screen w-full min-w-0 overflow-x-hidden">
        <AppSidebar />
        <SidebarInset className="min-w-0 flex-1 overflow-x-hidden">
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-2 sm:px-4">
            <SidebarTrigger className="-ml-1 shrink-0" />
            <h1 className="truncate text-lg font-semibold text-foreground sm:text-xl">
              Histórico de B.O.
            </h1>
            <div className="ml-auto shrink-0 pr-1 sm:pr-2">
              <NetworkStatusIndicator />
            </div>
          </header>

          <div className="w-full min-w-0 flex-1 space-y-4 overflow-x-hidden p-2 pt-6 sm:p-4">
            <div className="mx-auto w-full min-w-0 max-w-6xl space-y-4">
              <Card>
                <CardHeader className="gap-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-xl">
                          Pendentes offline
                        </CardTitle>
                        <Badge
                          variant={
                            pendingItems.length > 0 ? "secondary" : "outline"
                          }
                        >
                          {pendingItems.length}
                        </Badge>
                      </div>
                      <CardDescription>
                        Itens coletados sem internet. Sincronize quando estiver
                        online.
                      </CardDescription>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        variant="outline"
                        onClick={async () => {
                          await refreshPendings();
                          handleRefreshList();
                        }}
                      >
                        Atualizar
                      </Button>
                      <Button
                        onClick={handleSyncAllPendings}
                        disabled={pendingItems.length === 0 || isSyncingAll}
                      >
                        {isSyncingAll ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Sincronizando…
                          </>
                        ) : (
                          "Sincronizar tudo"
                        )}
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="destructive"
                            disabled={pendingItems.length === 0}
                          >
                            Limpar fila
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Limpar fila offline?
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              Isso apaga os itens pendentes do dispositivo. Essa
                              ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={async () => {
                                await Promise.all(
                                  pendingItems.map((p) =>
                                    removePendingBo(p.localId),
                                  ),
                                );
                                await refreshPendings();
                                toast.success("Fila offline limpa");
                              }}
                            >
                              Confirmar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {pendingItems.length === 0 ? (
                    <div className="flex items-center justify-between gap-3 rounded-md border bg-muted/30 p-4">
                      <div className="text-sm text-muted-foreground">
                        Nenhum item pendente.
                      </div>
                    </div>
                  ) : (
                    <div className="w-full min-w-0 overflow-hidden">
                      <Table className="table-fixed w-full">
                        <TableHeader>
                          <TableRow>
                            <TableHead className="hidden w-[18%] lg:table-cell">
                              LocalID
                            </TableHead>
                            <TableHead className="w-[28%]">Nome</TableHead>
                            <TableHead className="w-[18%]">Tipo</TableHead>
                            <TableHead className="hidden w-[16%] xl:table-cell">
                              Coletado em
                            </TableHead>
                            <TableHead className="w-[14%]">Status</TableHead>
                            <TableHead className="hidden w-[14%] xl:table-cell">
                              Erro
                            </TableHead>
                            <TableHead className="w-[22%] text-right">
                              Ações
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pendingItems.map((p) => (
                            <TableRow key={p.localId}>
                              <TableCell
                                className="hidden truncate font-mono text-xs lg:table-cell"
                                title={p.localId}
                              >
                                {p.localId}
                              </TableCell>
                              <TableCell className="truncate font-medium">
                                <PendingName item={p} />
                              </TableCell>
                              <TableCell className="truncate">
                                <PendingType item={p} />
                              </TableCell>
                              <TableCell className="hidden truncate xl:table-cell">
                                {formatDateTime(p.collected_at)}
                              </TableCell>
                              <TableCell>
                                <PendingStatusBadge status={p.status} />
                              </TableCell>
                              <TableCell className="hidden truncate xl:table-cell">
                                {p.error ? (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="block cursor-help truncate">
                                        {p.error}
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <span className="max-w-[280px] break-words">
                                        {p.error}
                                      </span>
                                    </TooltipContent>
                                  </Tooltip>
                                ) : (
                                  <span className="text-muted-foreground">
                                    —
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-2">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-9 w-9 shrink-0"
                                        aria-label="Enviar pendente"
                                        disabled={
                                          isSyncingOne === p.localId ||
                                          isSyncingAll
                                        }
                                        onClick={async () => {
                                          setIsSyncingOne(p.localId);
                                          try {
                                            const payload =
                                              await buildSyncPayload([p]);
                                            const res =
                                              await syncBoletins(payload);
                                            const match = res.synced.find(
                                              (s) => s.localId === p.localId,
                                            );
                                            if (match) {
                                              await removePendingBo(p.localId);
                                              toast.success(
                                                "Sincronizado com sucesso",
                                              );
                                              handleRefreshList();
                                            } else {
                                              const f = res.failed.find(
                                                (f) => f.localId === p.localId,
                                              );
                                              if (f) {
                                                await markFailed(
                                                  p.localId,
                                                  f.error ||
                                                    "Erro desconhecido",
                                                );
                                                toast.warning(
                                                  "Falha ao sincronizar",
                                                  {
                                                    description:
                                                      f.error || "Erro",
                                                  },
                                                );
                                              }
                                            }
                                          } catch (err) {
                                            console.error(err);
                                            toast.error(
                                              "Erro ao tentar sincronizar",
                                            );
                                          } finally {
                                            setIsSyncingOne(null);
                                            await refreshPendings();
                                          }
                                        }}
                                      >
                                        {isSyncingOne === p.localId ? (
                                          <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                          <UploadIcon />
                                        )}
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <span>Enviar</span>
                                    </TooltipContent>
                                  </Tooltip>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-9 w-9 shrink-0"
                                        aria-label="Apagar pendente"
                                        disabled={
                                          isSyncingOne === p.localId ||
                                          isSyncingAll
                                        }
                                        onClick={async () => {
                                          await removePendingBo(p.localId);
                                          await refreshPendings();
                                        }}
                                      >
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <span>Apagar</span>
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="gap-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-xl">Filtros</CardTitle>
                      <CardDescription>
                        A busca é aplicada automaticamente após você parar de
                        digitar.
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" onClick={handleRefreshList}>
                        Recarregar
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={handleClearFilters}
                        disabled={!hasActiveFilters}
                      >
                        Limpar
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label htmlFor="history-search" className="sr-only">
                        Buscar
                      </label>
                      <Input
                        id="history-search"
                        placeholder="Buscar por ID, nome, tipo, local…"
                        value={filters.searchTerm}
                        onChange={(e) =>
                          handleFilterChange("searchTerm", e.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="sr-only">Tipo</label>
                      <Select
                        value={filters.typeFilter}
                        onValueChange={(value) =>
                          handleFilterChange("typeFilter", value)
                        }
                      >
                        <SelectTrigger aria-label="Filtrar por tipo">
                          <SelectValue placeholder="Tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos os Tipos</SelectItem>
                          <SelectItem value="Roubo">Roubo</SelectItem>
                          <SelectItem value="Furto">Furto</SelectItem>
                          <SelectItem value="Acidente de trânsito">
                            Acidente de trânsito
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="gap-2">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-xl">Registros</CardTitle>
                        <Badge variant="outline">{totalItems}</Badge>
                      </div>
                      <CardDescription>
                        {hasActiveFilters ? "Filtrado" : "Todos"} · Página{" "}
                        {page} de {totalPages}
                      </CardDescription>
                    </div>
                    {isPlaceholderData ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Carregando…
                      </div>
                    ) : null}
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="space-y-3">
                      <div className="w-full min-w-0 overflow-hidden">
                        <Table className="table-fixed w-full">
                          <TableHeader>
                            <TableRow>
                              <TableHead className="hidden w-[10%] lg:table-cell">
                                ID
                              </TableHead>
                              <TableHead className="w-[34%] sm:w-[30%]">
                                Nome
                              </TableHead>
                              <TableHead className="w-[26%] sm:w-[22%]">
                                Tipo
                              </TableHead>
                              <TableHead className="hidden w-[18%] xl:table-cell">
                                Local
                              </TableHead>
                              <TableHead className="hidden w-[12%] xl:table-cell">
                                Registro
                              </TableHead>
                              <TableHead className="w-[40%] text-right sm:w-[28%] lg:w-[24%]">
                                Ações
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {Array.from({ length: limit }).map((_, idx) => (
                              <TableRow key={idx}>
                                <TableCell className="hidden lg:table-cell">
                                  <Skeleton className="h-4 w-16" />
                                </TableCell>
                                <TableCell>
                                  <Skeleton className="h-4 w-full max-w-[10rem]" />
                                </TableCell>
                                <TableCell>
                                  <Skeleton className="h-4 w-20" />
                                </TableCell>
                                <TableCell className="hidden xl:table-cell">
                                  <Skeleton className="h-4 w-28" />
                                </TableCell>
                                <TableCell className="hidden xl:table-cell">
                                  <Skeleton className="h-4 w-16" />
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex items-center justify-end gap-1.5 sm:gap-2">
                                    <Skeleton className="h-9 w-9" />
                                    <Skeleton className="h-9 w-9" />
                                    <Skeleton className="h-9 w-9" />
                                    <Skeleton className="h-9 w-9" />
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  ) : error ? (
                    <div className="flex flex-col gap-3 rounded-md border bg-muted/30 p-4">
                      <div className="text-sm text-foreground">
                        Não foi possível carregar os registros.
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button onClick={handleRefreshList}>
                          Tentar novamente
                        </Button>
                        {hasActiveFilters ? (
                          <Button
                            variant="outline"
                            onClick={handleClearFilters}
                          >
                            Limpar filtros
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  ) : (data?.data?.length ?? 0) === 0 ? (
                    <div className="flex flex-col gap-3 rounded-md border bg-muted/30 p-4">
                      <div className="text-sm text-foreground">
                        Nenhum registro encontrado.
                      </div>
                      {hasActiveFilters ? (
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="secondary"
                            onClick={handleClearFilters}
                          >
                            Limpar filtros
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <>
                      <div className="w-full min-w-0 overflow-hidden">
                        <Table className="table-fixed w-full">
                          <TableHeader>
                            <TableRow>
                              <TableHead className="hidden w-[10%] lg:table-cell">
                                ID
                              </TableHead>
                              <TableHead className="w-[34%] sm:w-[30%]">
                                Nome
                              </TableHead>
                              <TableHead className="w-[26%] sm:w-[22%]">
                                Tipo
                              </TableHead>
                              <TableHead className="hidden w-[18%] xl:table-cell">
                                Local
                              </TableHead>
                              <TableHead className="hidden w-[12%] xl:table-cell">
                                Registro
                              </TableHead>
                              <TableHead className="w-[40%] text-right sm:w-[28%] lg:w-[24%]">
                                Ações
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {data?.data?.map((item) => (
                              <TableRow key={item.id}>
                                <TableCell
                                  className="hidden truncate font-mono text-xs lg:table-cell"
                                  title={String(item.id)}
                                >
                                  {String(item.id).slice(0, 8)}
                                </TableCell>
                                <TableCell
                                  className="truncate font-medium"
                                  title={item.full_name}
                                >
                                  {item.full_name}
                                </TableCell>
                                <TableCell
                                  className="truncate"
                                  title={item.type_of_occurrence}
                                >
                                  {item.type_of_occurrence}
                                </TableCell>
                                <TableCell
                                  className="hidden truncate xl:table-cell"
                                  title={item.place_of_the_fact || ""}
                                >
                                  {item.place_of_the_fact}
                                </TableCell>
                                <TableCell className="hidden truncate xl:table-cell">
                                  {formatDate(item.createdAt)}
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-2">
                                    <BoDetailsModal
                                      bo={item}
                                      onEdit={() => setEditingBo(item)}
                                      onDelete={() => {
                                        setDeleteTargetId(item.id as string);
                                        setIsPoliceDialogOpen(true);
                                      }}
                                    />
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-9 w-9 shrink-0"
                                          aria-label="Baixar PDF"
                                          onClick={() => handleExportPdf(item)}
                                          disabled={isGeneratingPdf === item.id}
                                        >
                                          {isGeneratingPdf === item.id ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                          ) : (
                                            <Download className="h-4 w-4" />
                                          )}
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <span>Baixar PDF</span>
                                      </TooltipContent>
                                    </Tooltip>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-9 w-9 shrink-0"
                                          aria-label="Editar"
                                          onClick={() => setEditingBo(item)}
                                        >
                                          <Edit className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <span>Editar</span>
                                      </TooltipContent>
                                    </Tooltip>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-9 w-9 shrink-0"
                                          aria-label="Apagar"
                                          onClick={() => {
                                            setDeleteTargetId(
                                              item.id as string,
                                            );
                                            setIsPoliceDialogOpen(true);
                                          }}
                                        >
                                          <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <span>Apagar</span>
                                      </TooltipContent>
                                    </Tooltip>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>

                      {totalPages > 1 ? (
                        <Pagination className="mt-4">
                          <PaginationContent>
                            <PaginationItem>
                              <PaginationPrevious
                                onClick={() =>
                                  setPage((old) => Math.max(old - 1, 1))
                                }
                                className={
                                  page <= 1
                                    ? "pointer-events-none opacity-50"
                                    : "cursor-pointer"
                                }
                              />
                            </PaginationItem>
                            <PaginationItem>
                              <span className="p-2 text-sm text-muted-foreground">
                                Página {page} de {totalPages}
                              </span>
                            </PaginationItem>
                            <PaginationItem>
                              <PaginationNext
                                onClick={() => {
                                  if (!isPlaceholderData && page < totalPages) {
                                    setPage((old) => old + 1);
                                  }
                                }}
                                className={
                                  isPlaceholderData || page >= totalPages
                                    ? "pointer-events-none opacity-50"
                                    : "cursor-pointer"
                                }
                              />
                            </PaginationItem>
                          </PaginationContent>
                        </Pagination>
                      ) : null}
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </SidebarInset>
      </div>
      <PoliceIdentifierDialog
        open={isPoliceDialogOpen}
        onClose={() => {
          setIsPoliceDialogOpen(false);
          setDeleteTargetId(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Confirmar Exclusão"
        description="Informe o número de identificação do policial e o motivo para confirmar a exclusão do B.O."
        showReason={true}
      />
    </SidebarProvider>
  );
}

function PendingName({ item }: { item: OfflineBoItem }) {
  const [name, setName] = useState<string>("…");
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const body = await loadDecryptedBody(item);
        if (mounted) setName(body.full_name || "—");
      } catch {
        if (mounted) setName("—");
      }
    })();
    return () => {
      mounted = false;
    };
  }, [item]);
  return <span>{name}</span>;
}

function PendingType({ item }: { item: OfflineBoItem }) {
  const [typ, setTyp] = useState<string>("…");
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const body = await loadDecryptedBody(item);
        if (mounted) setTyp(body.type_of_occurrence || "—");
      } catch {
        if (mounted) setTyp("—");
      }
    })();
    return () => {
      mounted = false;
    };
  }, [item]);
  return <span>{typ}</span>;
}

function UploadIcon() {
  return <Upload className="h-4 w-4" />;
}

function PendingStatusBadge({ status }: { status: OfflineBoItem["status"] }) {
  if (status === "failed") return <Badge variant="destructive">Falhou</Badge>;
  return <Badge variant="secondary">Pendente</Badge>;
}

function formatDate(value: string | number | Date) {
  const date = new Date(value);
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(date);
}

function formatDateTime(value: string | number | Date) {
  const date = new Date(value);
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}
