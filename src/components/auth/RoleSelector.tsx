import { Building, Users, Wrench, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

export type UserRole = "landlord" | "tenant" | "caretaker" | "security";

interface RoleSelectorProps {
  selectedRole: UserRole | null;
  onSelectRole: (role: UserRole) => void;
}

const roleConfig = {
  landlord: {
    icon: Building,
    title: "Landlord",
    description: "Manage properties",
    gradient: "bg-gradient-primary",
  },
  tenant: {
    icon: Users,
    title: "Tenant",
    description: "Access rentals",
    gradient: "bg-gradient-secondary",
  },
  caretaker: {
    icon: Wrench,
    title: "Caretaker",
    description: "Handle maintenance",
    gradient: "bg-gradient-gold",
  },
  security: {
    icon: Shield,
    title: "Security",
    description: "Monitor security",
    gradient: "bg-gradient-primary",
  },
};

export const RoleSelector = ({ selectedRole, onSelectRole }: RoleSelectorProps) => {
  return (
    <div className="w-full max-w-md mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-semibold text-foreground mb-2">Select Your Role</h2>
        <p className="text-muted-foreground">Choose how you want to access the system</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {(Object.keys(roleConfig) as UserRole[]).map((role) => {
          const config = roleConfig[role];
          const Icon = config.icon;
          const isSelected = selectedRole === role;

          return (
            <Button
              key={role}
              variant="outline"
              className={`
                relative h-auto p-4 flex-col gap-3 transition-all duration-300
                ${isSelected 
                  ? "border-primary bg-primary/5 shadow-md" 
                  : "hover:border-primary/50 hover:bg-primary/5"
                }
              `}
              onClick={() => onSelectRole(role)}
            >
              <div className={`
                w-12 h-12 rounded-full flex items-center justify-center
                ${isSelected ? config.gradient : "bg-muted"}
                transition-all duration-300
              `}>
                <Icon 
                  className={`
                    w-6 h-6 transition-colors duration-300
                    ${isSelected ? "text-white" : "text-muted-foreground"}
                  `} 
                />
              </div>
              
              <div className="text-center">
                <div className="font-semibold text-sm">{config.title}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {config.description}
                </div>
              </div>

              {isSelected && (
                <div className="absolute inset-0 rounded-lg ring-2 ring-primary ring-offset-2 pointer-events-none" />
              )}
            </Button>
          );
        })}
      </div>
    </div>
  );
};