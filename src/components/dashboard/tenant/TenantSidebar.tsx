import { 
  Home, CreditCard, Wrench, FileText, MessageCircle, User, Building2, Receipt, UserCheck
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from "@/components/ui/sidebar";

interface TenantSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const tenantTabs = [
  { id: "overview", label: "Overview", icon: Home },
  { id: "browse-units", label: "Browse Units", icon: Building2 },
  { id: "my-applications", label: "My Applications", icon: FileText },
  { id: "payments", label: "Rent & Payments", icon: CreditCard },
  { id: "utility-bills", label: "Utility Bills", icon: Receipt },
  { id: "maintenance", label: "Maintenance", icon: Wrench },
  { id: "visitors", label: "Visitors", icon: UserCheck },
  { id: "documents", label: "Documents", icon: FileText },
  { id: "messages", label: "Messages", icon: MessageCircle },
  { id: "profile", label: "Profile", icon: User },
];

export const TenantSidebar = ({ activeTab, onTabChange }: TenantSidebarProps) => {
  const getNavClassName = (isActive: boolean) => 
    isActive ? "bg-sidebar-accent text-sidebar-primary font-medium" : "hover:bg-sidebar-accent/50";

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        {/* Logo Section */}
        <div className="p-4 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-logo-blue rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">PM</span>
            </div>
            <div className="group-data-[collapsible=icon]:hidden">
              <h2 className="font-semibold text-sm text-sidebar-foreground">Property Manager</h2>
              <p className="text-xs text-sidebar-foreground/70 capitalize">Tenant Portal</p>
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <SidebarGroup className="px-2">
          <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">Navigation</SidebarGroupLabel>
          
          <SidebarGroupContent>
            <SidebarMenu>
              {tenantTabs.map((tab) => (
                <SidebarMenuItem key={tab.id}>
                  <SidebarMenuButton
                    onClick={() => onTabChange(tab.id)}
                    className={getNavClassName(activeTab === tab.id)}
                    tooltip={tab.label}
                  >
                    <tab.icon className="h-4 w-4 shrink-0" />
                    <span className="group-data-[collapsible=icon]:hidden">{tab.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      
      {/* Sidebar Toggle */}
      <div className="p-2 border-t border-sidebar-border">
        <SidebarTrigger />
      </div>
    </Sidebar>
  );
};