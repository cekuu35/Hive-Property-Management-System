import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Lock, Users, Settings, DollarSign, Sun, Moon, Eye, EyeOff, Workflow } from 'lucide-react';
import LandlordMpesaManager from '@/components/admin/LandlordMpesaManager';
import AdminDashboard from '@/components/admin/AdminDashboard';
import PasswordChangeModal from '@/components/admin/PasswordChangeModal';
import { N8nWorkflowManager } from '@/components/dashboard/landlord/N8nWorkflowManager';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useTheme } from '@/components/ThemeProvider';

export default function AdminPortal() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { isAdmin, isLoading, signInAsAdmin, signOut } = useAdminAuth();
  const { theme, setTheme } = useTheme();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await signInAsAdmin(email, password);
    } catch (error: any) {
      setError(error.message);
    }
  };

  const handleLogout = async () => {
    await signOut();
    setEmail('');
    setPassword('');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Shield className="h-12 w-12 mx-auto text-primary mb-4 animate-pulse" />
          <p className="text-muted-foreground">Verifying access...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <Shield className="h-16 w-16 mx-auto text-primary mb-4" />
            <h2 className="text-3xl font-bold text-foreground">Admin Portal</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Secure administrative access only
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-center">Sign In</CardTitle>
              <CardDescription className="text-center">
                Enter your administrator credentials
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-foreground">
                    Email Address
                  </label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="mt-1"
                    placeholder="admin@example.com"
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-foreground">
                    Password
                  </label>
                  <div className="relative mt-1">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="pr-10"
                      placeholder="Enter your password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <Button type="submit" className="w-full">
                  <Lock className="h-4 w-4 mr-2" />
                  Sign In
                </Button>

                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full"
                  onClick={() => {
                    localStorage.removeItem('admin_session');
                    console.log('Admin session cleared!');
                    alert('Admin session cleared! Please try logging in again.');
                  }}
                >
                  Reset Admin Session
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              This portal is restricted to authorized administrators only.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card shadow border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Shield className="h-8 w-8 text-primary mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">Admin Portal</h1>
                <p className="text-sm text-muted-foreground">System Administration Dashboard</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Theme Toggle */}
              <Button
                variant="outline"
                size="sm" 
                onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              >
                {theme === "light" ? (
                  <Moon className="h-4 w-4" />
                ) : (
                  <Sun className="h-4 w-4" />
                )}
              </Button>
              <Button 
                onClick={() => setShowPasswordModal(true)} 
                variant="outline" 
                size="sm"
              >
                <Lock className="h-4 w-4 mr-2" />
                Change Password
              </Button>
              <Button onClick={handleLogout} variant="outline">
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Users className="h-8 w-8 text-blue-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Landlords</p>
                    <p className="text-2xl font-bold text-gray-900">6</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Settings className="h-8 w-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">System Status</p>
                    <p className="text-2xl font-bold text-green-600">Active</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <DollarSign className="h-8 w-8 text-purple-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Payments</p>
                    <p className="text-2xl font-bold text-gray-900">Multi-Landlord</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Shield className="h-8 w-8 text-red-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Security</p>
                    <p className="text-2xl font-bold text-red-600">Protected</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Admin Content */}
          <div className="space-y-8">
            <AdminDashboard />
            <LandlordMpesaManager />
            
            {/* n8n Workflow Management */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Workflow className="h-5 w-5 text-primary" />
                  <CardTitle>n8n Workflow Management</CardTitle>
                </div>
                <CardDescription>
                  Manage automation workflows and integrations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <N8nWorkflowManager />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Password Change Modal */}
      <PasswordChangeModal 
        isOpen={showPasswordModal} 
        onClose={() => setShowPasswordModal(false)} 
      />
    </div>
  );
}
