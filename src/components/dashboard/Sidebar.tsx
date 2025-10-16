import { 
  Home, CreditCard, Wrench, FileText, MessageCircle, User,
  BarChart3, Building, Users, DollarSign, Settings, TrendingUp,
  Clipboard, Calendar, Package, Shield, AlertTriangle, UserCheck, MapPin,
  Receipt, Bell, Activity, UserPlus, Workflow
} from "lucide-react";
import { useLocation } from "react-router-dom";
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
  useSidebar,
} from "@/components/ui/sidebar";

type UserRole = "landlord" | "tenant" | "caretaker" | "security";

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  badge?: number;
}

const navigationConfig: Record<UserRole, NavigationItem[]> = {
  tenant: [
    { id: "overview", label: "Overview", icon: Home, path: "/dashboard" },
    { id: "browse-units", label: "Browse Units", icon: Building, path: "/dashboard?tab=browse-units" },
    { id: "my-applications", label: "Applications", icon: FileText, path: "/dashboard?tab=my-applications" },
    { id: "payments", label: "Payments", icon: CreditCard, path: "/dashboard?tab=payments" },
    { id: "utility-bills", label: "Utility Bills", icon: Receipt, path: "/dashboard?tab=utility-bills" },
    { id: "maintenance", label: "Maintenance", icon: Wrench, path: "/dashboard?tab=maintenance" },
    { id: "visitors", label: "Visitors", icon: UserCheck, path: "/dashboard?tab=visitors" },
    { id: "documents", label: "Documents", icon: FileText, path: "/dashboard?tab=documents" },
    { id: "messages", label: "Messages", icon: MessageCircle, path: "/dashboard?tab=messages" },
    { id: "profile", label: "Profile", icon: User, path: "/dashboard?tab=profile" },
  ],
  landlord: [
    { id: "dashboard", label: "Dashboard", icon: BarChart3, path: "/dashboard" },
    { id: "properties", label: "Properties", icon: Building, path: "/properties" },
    { id: "tenants", label: "Tenants", icon: Users, path: "/tenants" },
    { id: "applications", label: "Applications", icon: FileText, path: "/applications" },
    { id: "staff", label: "Staff Management", icon: UserPlus, path: "/staff" },
    { id: "financials", label: "Financials", icon: DollarSign, path: "/financials" },
    { id: "utility-bills", label: "Utility Bills", icon: Receipt, path: "/utility-bills" },
    { id: "maintenance", label: "Maintenance", icon: Wrench, path: "/maintenance" },
    { id: "messages", label: "Messages", icon: MessageCircle, path: "/messages" },
    { id: "reports", label: "Reports", icon: TrendingUp, path: "/reports" },
    { id: "workflows", label: "Workflows", icon: Workflow, path: "/workflows" },
    { id: "settings", label: "Settings", icon: Settings, path: "/settings" },
  ],
  caretaker: [
    { id: "dashboard", label: "Dashboard", icon: BarChart3, path: "/dashboard" },
    { id: "workorders", label: "Work Orders", icon: Clipboard, path: "/work-orders" },
    { id: "schedule", label: "Schedule", icon: Calendar, path: "/schedule" },
    { id: "inventory", label: "Inventory", icon: Package, path: "/inventory" },
    { id: "reports", label: "Reports", icon: FileText, path: "/reports" },
    { id: "profile", label: "Profile", icon: User, path: "/profile" },
  ],
  security: [
    { id: "overview", label: "Security Overview", icon: Shield, path: "/dashboard" },
    { id: "visitors", label: "Visitor Management", icon: UserCheck, path: "/visitors" },
    { id: "incidents", label: "Incident Management", icon: AlertTriangle, path: "/incidents" },
    { id: "patrols", label: "Patrols", icon: MapPin, path: "/patrols" },
    { id: "reports", label: "Reports", icon: FileText, path: "/reports" },
    { id: "settings", label: "Settings", icon: Settings, path: "/settings" },
  ],
};

interface AppSidebarProps {
  userRole: UserRole;
  activeItemId?: string;
  onSelect?: (id: string) => void;
}

export const AppSidebar = ({ userRole, activeItemId, onSelect }: AppSidebarProps) => {
  const location = useLocation();
  const currentPath = location.pathname;
  const searchParams = new URLSearchParams(location.search);
  const currentTab = searchParams.get('tab');
  
  const navigationItems = navigationConfig[userRole] || [];
  
  const isItemActive = (id: string, path: string) => {
    if (activeItemId) return activeItemId === id;
    
    // For tenant dashboard, check if the tab matches
    if (userRole === 'tenant' && currentPath === '/dashboard') {
      const tabFromPath = path.split('tab=')[1];
      return currentTab === tabFromPath || (id === 'overview' && !currentTab);
    }
    
    return currentPath === path;
  };
  const getNavClassName = (active: boolean) => 
    active ? "bg-sidebar-accent text-sidebar-primary font-medium" : "hover:bg-sidebar-accent/50";

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
              <p className="text-xs text-sidebar-foreground/70 capitalize">{userRole} Portal</p>
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <SidebarGroup className="px-2">
          <SidebarGroupLabel className="group-data-[collapsible=icon]:hidden">Navigation</SidebarGroupLabel>
          
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    onClick={() => onSelect?.(item.id)}
                    className={getNavClassName(isItemActive(item.id, item.path))}
                    tooltip={item.label}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                    {item.badge && (
                      <span className="ml-auto bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full group-data-[collapsible=icon]:hidden">
                        {item.badge}
                      </span>
                    )}
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