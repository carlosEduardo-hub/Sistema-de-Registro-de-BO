import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import History from "./pages/History";
import Reports from "./pages/Reports";
import Register from "./pages/Register";
import NotFound from "./pages/NotFound";
import { useBoSync } from "@/hooks/useBoSync";

const queryClient = new QueryClient();

const App = () => {
  // Inicializa sincronização automática quando voltar a ficar online
  useBoSync();
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/registro" element={<Register />} />
            <Route path="/historico" element={<History />} />
            <Route path="/relatorios" element={<Reports />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
