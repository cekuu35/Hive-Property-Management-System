import { LoginForm } from "@/components/auth/LoginForm";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useState, useEffect } from "react";

const Index = () => {
  const { user, loading } = useAuth();
  const [isTransitioning, setIsTransitioning] = useState(true);
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
    // Handle smooth transition states
    if (loading) {
      setIsTransitioning(true);
      setShowLogin(false);
      return;
    }

    if (user) {
      // User is authenticated, will redirect
      setIsTransitioning(false);
      setShowLogin(false);
      return;
    }

    // No user and not loading - show login with smooth fade
    setIsTransitioning(false);
    const timer = setTimeout(() => {
      setShowLogin(true);
    }, 50); // Very short delay for smooth transition
    
    return () => clearTimeout(timer);
  }, [loading, user]);

  if (isTransitioning || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-primary/5 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  // Show login form with smooth fade-in
  return (
    <div className={`min-h-screen transition-all duration-300 ${showLogin ? 'opacity-100' : 'opacity-0'}`}>
      <LoginForm />
    </div>
  );
};

export default Index;
