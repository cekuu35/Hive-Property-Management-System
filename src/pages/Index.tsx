import { LoginForm } from "@/components/auth/LoginForm";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useState, useEffect } from "react";

const Index = () => {
  const { user, loading } = useAuth();
  const [showLogin, setShowLogin] = useState(false);

  // Add a small delay to prevent flickering during logout transition
  useEffect(() => {
    if (!loading && !user) {
      const timer = setTimeout(() => {
        setShowLogin(true);
      }, 100); // Small delay to ensure smooth transition
      
      return () => clearTimeout(timer);
    } else if (user) {
      setShowLogin(false);
    }
  }, [loading, user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-primary/5 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading your dashboard...</p>
          <p className="text-xs text-muted-foreground">Debug: Loading state active</p>
        </div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  // Show login form with smooth transition
  return (
    <div className={`transition-opacity duration-200 ${showLogin ? 'opacity-100' : 'opacity-0'}`}>
      <LoginForm />
    </div>
  );
};

export default Index;
