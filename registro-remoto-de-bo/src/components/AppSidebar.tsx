import {
  Home,
  FileText,
  History,
  Settings,
  Download,
  Wifi,
  BarChart3,
  Shield,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { SystemMark } from "@/components/SystemMark";

const menuItems = [
  {
    title: "Início",
    url: "/",
    icon: Home,
    color: "text-gray-700",
  },
  {
    title: "Registrar B.O.",
    url: "/registro",
    icon: FileText,
    color: "text-piaui-blue",
  },
  {
    title: "Histórico",
    url: "/historico",
    icon: History,
    color: "text-piaui-green",
  },
  {
    title: "Relatórios",
    url: "/relatorios",
    icon: BarChart3,
    color: "text-piaui-yellow",
  },
];

const configItems = [
  // {
  //   title: "Conectar Raspberry Pi",
  //   url: "/config/raspberry",
  //   icon: Wifi,
  //   color: "text-piaui-red"
  // },
  // {
  //   title: "Download PDF",
  //   url: "/config/download",
  //   icon: Download,
  //   color: "text-piaui-blue"
  // },
  // {
  //   title: "Configurações",
  //   url: "/config",
  //   icon: Settings,
  //   color: "text-gray-600"
  // }
];

export function AppSidebar() {
  const location = useLocation();

  return (
    <Sidebar className="border-r border-gray-200">
      <SidebarHeader className="border-b border-gray-200 p-3">
        <div className="flex min-w-0 items-center gap-2">
          <Shield className="h-7 w-7 shrink-0 text-piaui-blue" />
          <div className="min-w-0">
            <h1 className="truncate text-base font-bold text-gray-800">
              Sistema de B.O.
            </h1>
            <p className="truncate text-xs text-gray-600">Governo do Piauí</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-gray-700 font-semibold">
            Principal
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    className="hover:bg-gray-100 transition-colors"
                    isActive={location.pathname === item.url}
                  >
                    <Link to={item.url} className="flex items-center gap-3">
                      <item.icon className={`h-5 w-5 ${item.color}`} />
                      <span className="text-gray-700">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          {/* <SidebarGroupLabel className="text-gray-700 font-semibold">
            Configurações
          </SidebarGroupLabel> */}
          <SidebarGroupContent>
            <SidebarMenu>
              {configItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    className="hover:bg-gray-100 transition-colors"
                    isActive={location.pathname === item.url}
                  >
                    <Link to={item.url} className="flex items-center gap-3">
                      <item.icon className={`h-5 w-5 ${item.color}`} />
                      <span className="text-gray-700">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-gray-200 p-3">
        <SystemMark />
      </SidebarFooter>
    </Sidebar>
  );
}
