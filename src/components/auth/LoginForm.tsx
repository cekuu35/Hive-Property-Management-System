import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Loader2, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { RoleSelector, UserRole } from "./RoleSelector";
import { AnimatedBackground } from "./AnimatedBackground";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const LoginForm = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [step, setStep] = useState<"role" | "auth">("role");
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    role: selectedRole || "tenant" as UserRole,
  });

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    setTimeout(() => setStep("auth"), 300);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (authMode === "signup") {
        if (formData.password !== formData.confirmPassword) {
          toast({
            variant: "destructive",
            title: "Password Mismatch",
            description: "Passwords do not match. Please try again.",
          });
          setIsLoading(false);
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              role: selectedRole || 'tenant',
              first_name: formData.firstName,
              last_name: formData.lastName,
            }
          }
        });

        if (error) {
          let errorMessage = error.message;
          
          // Handle common signup errors with user-friendly messages
          if (error.message.includes("User already registered")) {
            errorMessage = "An account with this email already exists. Please try signing in instead.";
            // Auto-switch to login mode
            setAuthMode("login");
          } else if (error.message.includes("Password should be at least")) {
            errorMessage = "Password must be at least 6 characters long.";
          } else if (error.message.includes("signup_disabled")) {
            errorMessage = "Account registration is currently disabled. Please contact support.";
          }
          
          toast({
            title: "Signup Error",
            description: errorMessage,
            variant: "destructive",
          });
          return;
        }

        if (data.user && !data.session) {
          toast({
            title: "Account Created",
            description: "Please check your email and click the verification link to complete your registration.",
          });
          // Switch to login mode for when they return
          setAuthMode("login");
        } else if (data.user && data.session) {
          toast({
            title: "Account Created",
            description: "Welcome! Setting up your account...",
          });
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

        if (error) {
          let errorMessage = error.message;
          
          // Handle common authentication errors with user-friendly messages
          if (error.message.includes("Invalid login credentials")) {
            errorMessage = "Invalid email or password. Please check your credentials and try again.";
          } else if (error.message.includes("Email not confirmed")) {
            errorMessage = "Please check your email and click the verification link before signing in.";
          } else if (error.message.includes("signup_disabled")) {
            errorMessage = "Account registration is currently disabled. Please contact support.";
          }
          
          toast({
            title: "Login Error",
            description: errorMessage,
            variant: "destructive",
          });
          return;
        }

        if (data.user) {
          toast({
            title: "Welcome Back",
            description: "You have successfully logged in.",
          });
        }
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Authentication Error",
        description: error.message || "An error occurred during authentication.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-auth-background">
      <AnimatedBackground />
      
      <div className="relative z-10 w-full max-w-md px-6">
        {/* Logo */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-primary rounded-2xl flex items-center justify-center shadow-glow">
            <span className="text-2xl font-bold text-white">PM</span>
          </div>
          <h1 className="text-3xl font-bold text-auth-foreground">Property Manager Pro</h1>
          <p className="text-auth-muted-foreground mt-2">Professional Rental Management</p>
        </div>

        <Card className="card-elevated animate-scale-in bg-auth-card border-auth-border">
          <div className="p-8">
            {step === "role" ? (
              <div className="animate-fade-in">
                <RoleSelector
                  selectedRole={selectedRole}
                  onSelectRole={handleRoleSelect}
                />
              </div>
            ) : (
              <div className="animate-slide-in">
                {/* Back Button & Role Display */}
                <div className="flex items-center justify-between mb-6">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setStep("role")}
                    className="text-auth-muted-foreground hover:text-auth-foreground hover:bg-auth-muted/50"
                  >
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Back
                  </Button>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
                    {selectedRole}
                  </div>
                </div>

                {/* Auth Mode Toggle */}
                <div className="text-center mb-6">
                  <h2 className="text-xl font-semibold text-auth-foreground mb-4">
                    {authMode === "login" ? "Welcome back" : "Create account"}
                  </h2>
                  <div className="flex gap-1 p-1 bg-auth-muted rounded-lg">
                    <Button
                      type="button"
                      variant={authMode === "login" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setAuthMode("login")}
                      className={`flex-1 ${authMode === "login" ? "bg-primary text-white" : "text-auth-muted-foreground hover:bg-auth-muted hover:text-auth-foreground"}`}
                    >
                      Sign In
                    </Button>
                    <Button
                      type="button"
                      variant={authMode === "signup" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setAuthMode("signup")}
                      className={`flex-1 ${authMode === "signup" ? "bg-primary text-white" : "text-auth-muted-foreground hover:bg-auth-muted hover:text-auth-foreground"}`}
                    >
                      Sign Up
                    </Button>
                  </div>
                </div>

                {/* Auth Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-auth-foreground">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      required
                      disabled={isLoading}
                      className="bg-auth-input border-auth-border text-auth-foreground placeholder:text-auth-muted-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-auth-foreground">Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={formData.password}
                        onChange={(e) => handleInputChange("password", e.target.value)}
                        required
                        disabled={isLoading}
                        className="pr-10 bg-auth-input border-auth-border text-auth-foreground placeholder:text-auth-muted-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent text-auth-muted-foreground hover:text-auth-foreground"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={isLoading}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {authMode === "signup" && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="firstName" className="text-auth-foreground">First Name</Label>
                          <Input
                            id="firstName"
                            type="text"
                            placeholder="First name"
                            value={formData.firstName}
                            onChange={(e) => handleInputChange("firstName", e.target.value)}
                            required
                            disabled={isLoading}
                            className="bg-auth-input border-auth-border text-auth-foreground placeholder:text-auth-muted-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="lastName" className="text-auth-foreground">Last Name</Label>
                          <Input
                            id="lastName"
                            type="text"
                            placeholder="Last name"
                            value={formData.lastName}
                            onChange={(e) => handleInputChange("lastName", e.target.value)}
                            required
                            disabled={isLoading}
                            className="bg-auth-input border-auth-border text-auth-foreground placeholder:text-auth-muted-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword" className="text-auth-foreground">Confirm Password</Label>
                        <Input
                          id="confirmPassword"
                          type="password"
                          placeholder="Confirm your password"
                          value={formData.confirmPassword}
                          onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                          required
                          disabled={isLoading}
                          className="bg-auth-input border-auth-border text-auth-foreground placeholder:text-auth-muted-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        />
                      </div>
                    </>
                  )}

                  <Button 
                    type="submit" 
                    className="w-full btn-primary mt-6"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {authMode === "login" ? "Signing in..." : "Creating account..."}
                      </>
                    ) : (
                      authMode === "login" ? "Sign In" : "Create Account"
                    )}
                  </Button>
                </form>

                {authMode === "login" && (
                  <div className="mt-6 text-center">
                    <Button variant="link" className="text-sm text-auth-muted-foreground hover:text-primary">
                      Forgot your password?
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>

        <div className="text-center mt-6 text-xs text-auth-muted-foreground">
          © 2024 Property Manager Pro. All rights reserved.
        </div>
      </div>
    </div>
  );
};