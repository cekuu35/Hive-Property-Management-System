import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Eye, EyeOff, CheckCircle, XCircle, Lock } from "lucide-react";
import { AnimatedBackground } from "@/components/auth/AnimatedBackground";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, useSearchParams } from "react-router-dom";

export default function ResetPassword() {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isValidToken, setIsValidToken] = useState<boolean | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Get token from URL and validate it
    const checkToken = async () => {
      const token = searchParams.get('token');
      
      if (!token) {
        setIsValidToken(false);
        toast({
          variant: "destructive",
          title: "Invalid Link",
          description: "This password reset link is invalid. Please request a new one.",
        });
        return;
      }

      try {
        // Validate token via our custom edge function or direct database check
        const { data, error } = await supabase
          .from('password_reset_tokens')
          .select('user_id, expires_at, used')
          .eq('token', token)
          .single();

        if (error || !data) {
          setIsValidToken(false);
          toast({
            variant: "destructive",
            title: "Invalid Link",
            description: "This password reset link is invalid. Please request a new one.",
          });
          return;
        }

        // Check if token is expired
        const expiresAt = new Date(data.expires_at);
        const now = new Date();
        
        if (now > expiresAt) {
          setIsValidToken(false);
          toast({
            variant: "destructive",
            title: "Link Expired",
            description: "This password reset link has expired. Please request a new one.",
          });
          return;
        }

        // Check if token has been used
        if (data.used) {
          setIsValidToken(false);
          toast({
            variant: "destructive",
            title: "Link Already Used",
            description: "This password reset link has already been used. Please request a new one if needed.",
          });
          return;
        }

        // Token is valid
        setUserId(data.user_id);
        setIsValidToken(true);
      } catch (err) {
        console.error('Error validating token:', err);
        setIsValidToken(false);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to validate reset link. Please try again.",
        });
      }
    };

    checkToken();
  }, [searchParams, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Password Mismatch",
        description: "Passwords do not match. Please try again.",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        variant: "destructive",
        title: "Password Too Short",
        description: "Password must be at least 6 characters long.",
      });
      return;
    }

    if (!userId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Invalid reset session. Please request a new reset link.",
      });
      return;
    }

    setIsLoading(true);

    try {
      const token = searchParams.get('token');
      
      // Call our custom edge function to reset the password securely
      const { data, error } = await supabase.functions.invoke('reset-password', {
        body: { 
          token: token,
          newPassword: password 
        }
      });

      if (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message || "Failed to update password.",
        });
        return;
      }

      if (!data?.success) {
        toast({
          variant: "destructive",
          title: "Error",
          description: data?.error || "Failed to update password.",
        });
        return;
      }

      toast({
        title: "Password Updated",
        description: "Your password has been successfully updated. Redirecting to login...",
      });
      
      setTimeout(() => {
        navigate("/");
      }, 2000);

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update password.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isValidToken === null) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center relative overflow-hidden bg-auth-background"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1973&q=80'), linear-gradient(135deg, #667eea 0%, #764ba2 100%)`,
          backgroundSize: 'cover, cover',
          backgroundPosition: 'center, center',
          backgroundRepeat: 'no-repeat, no-repeat',
          backgroundAttachment: 'fixed, fixed',
        }}
      >
        <AnimatedBackground />
        <div className="absolute inset-0 bg-black/30 backdrop-blur-[0.5px] z-10"></div>
        <div className="relative z-20 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
        </div>
      </div>
    );
  }

  if (isValidToken === false) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center relative overflow-hidden bg-auth-background"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1973&q=80'), linear-gradient(135deg, #667eea 0%, #764ba2 100%)`,
          backgroundSize: 'cover, cover',
          backgroundPosition: 'center, center',
          backgroundRepeat: 'no-repeat, no-repeat',
          backgroundAttachment: 'fixed, fixed',
        }}
      >
        <AnimatedBackground />
        <div className="absolute inset-0 bg-black/30 backdrop-blur-[0.5px] z-10"></div>
        <div className="relative z-20 w-full max-w-md px-4 sm:px-6 mx-auto">
          <Card className="glass-card">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
              <CardTitle className="text-white">Invalid Reset Link</CardTitle>
              <CardDescription className="text-white/70">
                This password reset link is invalid or has expired.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => navigate("/")}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
              >
                Back to Login
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

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
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[0.5px] z-10"></div>
      
      <div className="relative z-20 w-full max-w-md px-4 sm:px-6 mx-auto">
        {/* Logo */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 rounded-2xl flex items-center justify-center shadow-glow relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-2xl"></div>
            <div className="relative z-10 flex items-center justify-center">
              <Lock className="w-8 h-8 text-white drop-shadow-lg" />
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white text-shadow-responsive">Reset Your Password</h1>
          <p className="text-white/80 mt-2 text-shadow-responsive text-sm sm:text-base">Enter your new password below</p>
        </div>

        <Card className="relative overflow-hidden animate-scale-in glass-card mx-2 sm:mx-0">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-white/10 pointer-events-none"></div>
          <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-blue-400/20 via-purple-500/20 to-blue-400/20 opacity-50 blur-sm animate-pulse"></div>
          
          <div className="relative z-10 p-6 sm:p-8">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-white font-medium drop-shadow-sm">New Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter new password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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
                <p className="text-xs text-white/60">Must be at least 6 characters</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-white font-medium drop-shadow-sm">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    className="pr-10 bg-white/10 border-white/30 text-white placeholder:text-white/60 focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400 backdrop-blur-sm transition-all duration-200"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-white/10 text-white/70 hover:text-white transition-all duration-200"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={isLoading}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {password && confirmPassword && (
                <div className={`flex items-center gap-2 text-sm ${password === confirmPassword ? 'text-green-400' : 'text-red-400'}`}>
                  {password === confirmPassword ? (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      <span>Passwords match</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4" />
                      <span>Passwords do not match</span>
                    </>
                  )}
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full mt-6 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02] border border-white/20"
                disabled={isLoading || password !== confirmPassword}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating Password...
                  </>
                ) : (
                  "Update Password"
                )}
              </Button>

              <div className="text-center mt-4">
                <Button
                  type="button"
                  variant="link"
                  className="text-sm text-white/70 hover:text-white transition-colors duration-200"
                  onClick={() => navigate("/")}
                  disabled={isLoading}
                >
                  Back to Login
                </Button>
              </div>
            </form>
          </div>
        </Card>

        <div className="text-center mt-6 text-xs text-white/60 drop-shadow-sm">
          © 2024 Hive. All rights reserved.
        </div>
      </div>
    </div>
  );
}

