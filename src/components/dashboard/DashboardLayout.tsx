import { ReactNode, useState } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./Sidebar";
import { TenantSidebar } from "./tenant/TenantSidebar";
import { Header } from "./Header";

interface DashboardLayoutProps {
  children: ReactNode;
  userRole: "landlord" | "tenant" | "caretaker" | "security";
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  activeSection?: string;
  onSectionChange?: (id: string) => void;
}

export const DashboardLayout = ({ children, userRole, activeTab = "overview", onTabChange, activeSection, onSectionChange }: DashboardLayoutProps) => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-subtle">
        {userRole === "tenant" ? (
          <TenantSidebar 
            activeTab={activeTab} 
            onTabChange={onTabChange || (() => {})} 
          />
        ) : (
          <AppSidebar userRole={userRole} activeItemId={activeSection} onSelect={onSectionChange || (() => {})} />
        )}
        
        <div className="flex-1 flex flex-col">
          <Header />
          
          <main className="flex-1 p-6 overflow-auto">
            <div className="animate-fade-in">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};