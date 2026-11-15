import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { NetworkStatusIndicator } from "@/components/NetworkStatusIndicator";
import {
  ArrowRight,
  BarChart3,
  FileText,
  History,
  ShieldCheck,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full min-w-0 overflow-x-hidden bg-slate-50">
        <AppSidebar />
        <main className="flex min-w-0 flex-1 flex-col overflow-x-hidden">
          <header className="shrink-0 border-b border-gray-200 bg-white px-4 py-4 sm:px-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <SidebarTrigger className="shrink-0 text-gray-600" />
              <div className="flex min-w-0 items-center gap-2">
                <ShieldCheck className="h-7 w-7 shrink-0 text-piaui-blue sm:h-8 sm:w-8" />
                <div className="min-w-0">
                  <h1 className="truncate text-lg font-bold text-gray-800 sm:text-xl">
                    Sistema de Registros
                  </h1>
                  <p className="truncate text-xs uppercase tracking-wider text-gray-500">
                    Boletim de Ocorrência
                  </p>
                </div>
              </div>
              <div className="ml-auto shrink-0">
                <NetworkStatusIndicator />
              </div>
            </div>
          </header>

          <div className="relative flex min-w-0 flex-1 flex-col">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(30,58,138,0.08),_transparent_55%)]"
            />

            <div className="relative mx-auto flex w-full min-w-0 max-w-3xl flex-1 flex-col justify-center gap-8 px-4 py-10 sm:px-6 sm:py-14">
              <div className="max-w-xl space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <h2 className="text-balance text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                  Pronto para registrar ou consultar ocorrências
                </h2>
                <p className="max-w-prose text-base leading-relaxed text-gray-600 sm:text-lg">
                  Registro assistido por IA: transcrição de áudio e
                  preenchimento automático do boletim.
                </p>
              </div>

              <div className="flex w-full min-w-0 flex-col gap-3 sm:gap-4">
                <button
                  type="button"
                  onClick={() => navigate("/registro")}
                  className="group flex w-full min-w-0 items-center gap-4 rounded-xl bg-piaui-blue px-5 py-5 text-left text-white shadow-md shadow-piaui-blue/25 transition hover:bg-piaui-blue/95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-piaui-blue focus-visible:ring-offset-2 sm:px-6 sm:py-6"
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-white/15">
                    <FileText className="h-6 w-6" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-lg font-semibold sm:text-xl">
                      Registrar ocorrência
                    </span>
                    <span className="mt-0.5 block text-sm text-blue-100">
                      Abrir um novo boletim de ocorrência
                    </span>
                  </span>
                  <ArrowRight className="h-5 w-5 shrink-0 opacity-80 transition group-hover:translate-x-0.5" />
                </button>

                <button
                  type="button"
                  onClick={() => navigate("/historico")}
                  className="group flex w-full min-w-0 items-center gap-4 rounded-xl border border-gray-200 bg-white px-5 py-4 text-left shadow-sm transition hover:border-piaui-blue/30 hover:bg-piaui-blue/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-piaui-blue focus-visible:ring-offset-2 sm:px-6"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-piaui-blue transition group-hover:bg-piaui-blue/10">
                    <History className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-base font-semibold text-gray-900 sm:text-lg">
                      Consultar histórico
                    </span>
                    <span className="mt-0.5 block text-sm text-gray-500">
                      Buscar, editar ou exportar registros anteriores
                    </span>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-gray-400 transition group-hover:translate-x-0.5 group-hover:text-piaui-blue" />
                </button>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <Link
                    to="/relatorios"
                    className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 underline-offset-4 transition hover:text-piaui-blue hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-piaui-blue focus-visible:ring-offset-2 rounded-sm"
                  >
                    <BarChart3 className="h-4 w-4 text-piaui-yellow" />
                    Abrir relatórios
                  </Link>
                  <p className="text-xs text-gray-400">Versão 1.0.0</p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Index;
