import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { BOForm } from "@/components/BOForm";
import { NetworkStatusIndicator } from "@/components/NetworkStatusIndicator";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const Register = () => {
  const navigate = useNavigate();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gray-50">
        <AppSidebar />
        <main className="flex-1">
          <div className="border-b border-gray-200 bg-white px-6 py-4">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="text-gray-600" />
              <div className="flex items-center gap-4">
                {/* <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate("/")}
                  aria-label="Voltar para o início"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button> */}
                <div>
                  <h1 className="text-2xl font-bold text-gray-800">
                    Novo Boletim de Ocorrência
                  </h1>
                  <p className="text-gray-600">
                    Preencha os dados abaixo para registrar a ocorrência
                  </p>
                </div>
              </div>
              <div className="ml-auto">
                <NetworkStatusIndicator />
              </div>
            </div>
          </div>

          <div className="p-6">
            <BOForm />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Register;
