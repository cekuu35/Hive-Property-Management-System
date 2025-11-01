import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Loader2, Eye, EyeOff, Shield, Mail } from "lucide-react";
import { RoleSelector, UserRole } from "./RoleSelector";
import { AnimatedBackground } from "./AnimatedBackground";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Link, useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const LoginForm = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    role: "tenant" as UserRole,
  });

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    setFormData(prev => ({ ...prev, role }));
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
              role: formData.role,
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
          // Navigate to dashboard after a brief delay to ensure auth state is updated
          setTimeout(() => {
            navigate("/dashboard", { replace: true });
          }, 500);
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
          // Navigate to dashboard after a brief delay to ensure auth state is updated
          setTimeout(() => {
            navigate("/dashboard", { replace: true });
          }, 500);
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

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!forgotPasswordEmail) {
      toast({
        variant: "destructive",
        title: "Email Required",
        description: "Please enter your email address.",
      });
      return;
    }

    setIsResettingPassword(true);

    try {
      // Use our custom edge function instead of Supabase's built-in reset
      const { data, error } = await supabase.functions.invoke('send-password-reset', {
        body: { email: forgotPasswordEmail }
      });

      if (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message || "Failed to send password reset email.",
        });
        return;
      }

      if (!data?.success) {
        toast({
          variant: "destructive",
          title: "Error",
          description: data?.error || "Failed to send password reset email.",
        });
        return;
      }

      toast({
        title: "Password Reset Email Sent",
        description: "Please check your email for the password reset link. The link expires in 1 hour.",
      });

      setShowForgotPassword(false);
      setForgotPasswordEmail("");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to send password reset email.",
      });
    } finally {
      setIsResettingPassword(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center relative overflow-hidden bg-auth-background"
      style={{
        backgroundImage: `url('https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1973&q=80'), linear-gradient(135deg, #667eea 0%, #764ba2 100%)`,
        backgroundSize: 'cover, cover',
        backgroundPosition: 'center, center',
        backgroundRepeat: 'no-repeat, no-repeat',
        backgroundAttachment: 'fixed, fixed',
        animation: 'backgroundShift 20s ease-in-out infinite'
      }}
    >
      <AnimatedBackground />
      {/* Dark overlay for better text readability */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[0.5px] z-10"></div>
      
      <div className="relative z-20 w-full max-w-md px-4 sm:px-6 mx-auto">
        {/* Logo */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 rounded-2xl flex items-center justify-center shadow-glow relative overflow-hidden">
            {/* Property management building pattern */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-2xl"></div>
            <div className="relative z-10 flex items-center justify-center">
              <svg className="w-8 h-8 text-white drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24">
                {/* Main building */}
                <rect x="8" y="6" width="8" height="12" fill="currentColor" rx="0.5"/>
                {/* Building windows */}
                <rect x="9.5" y="8" width="1.5" height="1.5" fill="white" opacity="0.8"/>
                <rect x="12" y="8" width="1.5" height="1.5" fill="white" opacity="0.8"/>
                <rect x="14.5" y="8" width="1.5" height="1.5" fill="white" opacity="0.8"/>
                <rect x="9.5" y="10.5" width="1.5" height="1.5" fill="white" opacity="0.8"/>
                <rect x="12" y="10.5" width="1.5" height="1.5" fill="white" opacity="0.8"/>
                <rect x="14.5" y="10.5" width="1.5" height="1.5" fill="white" opacity="0.8"/>
                <rect x="9.5" y="13" width="1.5" height="1.5" fill="white" opacity="0.8"/>
                <rect x="12" y="13" width="1.5" height="1.5" fill="white" opacity="0.8"/>
                <rect x="14.5" y="13" width="1.5" height="1.5" fill="white" opacity="0.8"/>
                {/* Door */}
                <rect x="11.5" y="15" width="1" height="3" fill="white" opacity="0.9"/>
                {/* Roof */}
                <path d="M7 6L12 2L17 6V7H7V6Z" fill="currentColor"/>
                {/* Side building */}
                <rect x="4" y="9" width="5" height="9" fill="currentColor" opacity="0.7" rx="0.5"/>
                <rect x="5" y="10.5" width="1" height="1" fill="white" opacity="0.6"/>
                <rect x="7" y="10.5" width="1" height="1" fill="white" opacity="0.6"/>
                <rect x="5" y="12.5" width="1" height="1" fill="white" opacity="0.6"/>
                <rect x="7" y="12.5" width="1" height="1" fill="white" opacity="0.6"/>
                {/* Key symbol */}
                <circle cx="18" cy="8" r="1.5" fill="white" opacity="0.9"/>
                <path d="M18 9.5L20 11.5" stroke="white" strokeWidth="0.8" strokeLinecap="round" opacity="0.9"/>
              </svg>
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white text-shadow-responsive">Hive</h1>
          <p className="text-white/80 mt-2 text-shadow-responsive text-sm sm:text-base">Smart Property Management</p>
        </div>

        <Card className="relative overflow-hidden animate-scale-in glass-card mx-2 sm:mx-0">
          {/* Subtle gradient overlay for depth */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-white/10 pointer-events-none"></div>
          
          {/* Animated border glow effect */}
          <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-blue-400/20 via-purple-500/20 to-blue-400/20 opacity-50 blur-sm animate-pulse"></div>
          
          {/* Main content with enhanced styling */}
          <div className="relative z-10 p-6 sm:p-8">
            <div className="animate-fade-in">

                {/* Auth Mode Toggle */}
                <div className="text-center mb-6">
                  <h2 className="text-xl font-semibold text-white mb-4 text-shadow-responsive">
                    {authMode === "login" ? "Welcome back" : "Create account"}
                  </h2>
                  
                  {/* Role Selection - Only show during signup */}
                  {authMode === "signup" && (
                    <div className="mb-6">
                      <RoleSelector
                        selectedRole={selectedRole}
                        onSelectRole={handleRoleSelect}
                      />
                    </div>
                  )}
                  <div className="relative bg-white/10 backdrop-blur-sm rounded-xl p-1 border border-white/20 shadow-lg">
                    <div 
                      className={`absolute top-1 bottom-1 w-1/2 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 rounded-lg shadow-lg transition-all duration-300 ease-out ${
                        authMode === "login" ? "left-1" : "left-1/2"
                      }`}
                      style={{
                        boxShadow: "0 4px 20px rgba(59, 130, 246, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)"
                      }}
                    />
                    <div className="relative flex">
                      <button
                        type="button"
                        onClick={() => setAuthMode("login")}
                        className={`flex-1 py-3 px-4 text-sm font-medium rounded-lg transition-all duration-300 ease-out relative z-10 ${
                          authMode === "login" 
                            ? "text-white shadow-sm" 
                            : "text-white/70 hover:text-white"
                        }`}
                      >
                        <span className="relative z-10">Sign In</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setAuthMode("signup")}
                        className={`flex-1 py-3 px-4 text-sm font-medium rounded-lg transition-all duration-300 ease-out relative z-10 ${
                          authMode === "signup" 
                            ? "text-white shadow-sm" 
                            : "text-white/70 hover:text-white"
                        }`}
                      >
                        <span className="relative z-10">Sign Up</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Auth Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-white font-medium drop-shadow-sm">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      required
                      disabled={isLoading}
                      className="bg-white/10 border-white/30 text-white placeholder:text-white/60 focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400 backdrop-blur-sm transition-all duration-200"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-white font-medium drop-shadow-sm">Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={formData.password}
                        onChange={(e) => handleInputChange("password", e.target.value)}
                        required
                        disabled={isLoading}
                        className="pr-10 bg-white/10 border-white/30 text-white placeholder:text-white/60 focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400 backdrop-blur-sm transition-all duration-200"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-white/10 text-white/70 hover:text-white transition-all duration-200"
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
                          <Label htmlFor="firstName" className="text-white font-medium drop-shadow-sm">First Name</Label>
                          <Input
                            id="firstName"
                            type="text"
                            placeholder="First name"
                            value={formData.firstName}
                            onChange={(e) => handleInputChange("firstName", e.target.value)}
                            required
                            disabled={isLoading}
                            className="bg-white/10 border-white/30 text-white placeholder:text-white/60 focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400 backdrop-blur-sm transition-all duration-200"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="lastName" className="text-white font-medium drop-shadow-sm">Last Name</Label>
                          <Input
                            id="lastName"
                            type="text"
                            placeholder="Last name"
                            value={formData.lastName}
                            onChange={(e) => handleInputChange("lastName", e.target.value)}
                            required
                            disabled={isLoading}
                            className="bg-white/10 border-white/30 text-white placeholder:text-white/60 focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400 backdrop-blur-sm transition-all duration-200"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword" className="text-white font-medium drop-shadow-sm">Confirm Password</Label>
                        <Input
                          id="confirmPassword"
                          type="password"
                          placeholder="Confirm your password"
                          value={formData.confirmPassword}
                          onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                          required
                          disabled={isLoading}
                          className="bg-white/10 border-white/30 text-white placeholder:text-white/60 focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400 backdrop-blur-sm transition-all duration-200"
                        />
                      </div>
                    </>
                  )}

                  <Button 
                    type="submit" 
                    className="w-full mt-6 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02] border border-white/20"
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
                  <div className="mt-6 text-center space-y-3">
                    <Button 
                      variant="link" 
                      className="text-sm text-white/70 hover:text-white transition-colors duration-200"
                      onClick={() => setShowForgotPassword(true)}
                      type="button"
                    >
                      Forgot your password?
                    </Button>
                    
                    {/* Admin Gateway Button */}
                    <div className="pt-2">
                      <Link to="/admin">
                        <Button
                          variant="outline"
                          size="sm"
                          className="bg-white/10 hover:bg-white/20 backdrop-blur-sm border-white/30 text-white hover:text-white transition-all duration-200 rounded-full p-2"
                          title="Admin Portal"
                        >
                          <Shield className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                )}
            </div>
          </div>
        </Card>

        <div className="text-center mt-6 text-xs text-white/60 drop-shadow-sm">
          © 2024 Hive. All rights reserved.
        </div>
      </div>

      {/* Forgot Password Dialog */}
      <Dialog open={showForgotPassword} onOpenChange={setShowForgotPassword}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-blue-600" />
              Reset Your Password
            </DialogTitle>
            <DialogDescription>
              Enter your email address and we'll send you a link to reset your password.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reset-email">Email Address</Label>
              <Input
                id="reset-email"
                type="email"
                placeholder="Enter your email"
                value={forgotPasswordEmail}
                onChange={(e) => setForgotPasswordEmail(e.target.value)}
                required
                disabled={isResettingPassword}
                className="w-full"
              />
            </div>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowForgotPassword(false);
                  setForgotPasswordEmail("");
                }}
                disabled={isResettingPassword}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isResettingPassword}
                className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
              >
                {isResettingPassword ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send Reset Link"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};