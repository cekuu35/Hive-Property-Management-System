import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { User, Mail, Phone, Shield, Bell, CreditCard, Users, Settings, Save, Plus, Trash2, Loader2 } from 'lucide-react';
import { useSettings } from '@/hooks/useSettings';
import { DataIntegrityCheck } from '../DataIntegrityCheck';
import { LandlordPasswordChangeModal } from '../LandlordPasswordChangeModal';

export const SettingsSection = () => {
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  
  const {
    notifications,
    profileSettings,
    teamMembers,
    paymentGateways,
    loading,
    updateNotificationSettings,
    updateProfileSettings,
    addTeamMember,
    removeTeamMember,
    configurePaymentGateway,
    enableTwoFactor,
    changePassword,
    saveAllSettings
  } = useSettings();

  const handleNotificationChange = (key: string, value: boolean) => {
    updateNotificationSettings({ [key]: value });
  };

  const handleProfileChange = (key: string, value: string) => {
    updateProfileSettings({ [key]: value });
  };

  const handleSaveSettings = async () => {
    await saveAllSettings();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Settings</h1>
          <p className="text-muted-foreground">Manage your account and system preferences</p>
        </div>
        <Button className="gap-2" onClick={handleSaveSettings}>
          <Save className="h-4 w-4" />
          Save Changes
        </Button>
      </div>

      {/* Settings Tabs */}
      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Landlord Profile</CardTitle>
              <CardDescription>Update your personal and business information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Profile Picture Section */}
              <div className="flex items-center gap-6">
                <Avatar className="h-20 w-20">
                  <AvatarImage src="" />
                  <AvatarFallback className="text-lg">{profileSettings.firstName[0]}{profileSettings.lastName[0]}</AvatarFallback>
                </Avatar>
                <div className="space-y-2">
                  <Button variant="outline">Change Photo</Button>
                  <p className="text-sm text-muted-foreground">JPG, GIF or PNG. Max size 2MB.</p>
                </div>
              </div>

              <Separator />

              {/* Personal Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={profileSettings.firstName}
                    onChange={(e) => handleProfileChange('firstName', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={profileSettings.lastName}
                    onChange={(e) => handleProfileChange('lastName', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profileSettings.email}
                    onChange={(e) => handleProfileChange('email', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={profileSettings.phone}
                    onChange={(e) => handleProfileChange('phone', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company">Company Name</Label>
                  <Input
                    id="company"
                    value={profileSettings.company}
                    onChange={(e) => handleProfileChange('company', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Business Address</Label>
                  <Input
                    id="address"
                    value={profileSettings.address}
                    onChange={(e) => handleProfileChange('address', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Team Management</CardTitle>
                  <CardDescription>Manage team members and their access permissions</CardDescription>
                </div>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Member
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {teamMembers.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <Avatar>
                        <AvatarFallback>{member.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{member.name}</div>
                        <div className="text-sm text-muted-foreground">{member.email}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="font-medium">{member.role}</div>
                        <Badge variant="secondary" className={member.status === 'active' ? 'text-success' : 'text-warning'}>
                          {member.status}
                        </Badge>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm">
                          <Settings className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => removeTeamMember(member.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Role Permissions</CardTitle>
              <CardDescription>Define what each role can access and modify</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-3">Property Manager</h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• View all properties</li>
                      <li>• Manage tenants</li>
                      <li>• Handle maintenance requests</li>
                      <li>• Generate reports</li>
                    </ul>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-3">Maintenance Coordinator</h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• View maintenance requests</li>
                      <li>• Assign contractors</li>
                      <li>• Update request status</li>
                      <li>• Track expenses</li>
                    </ul>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-3">Financial Assistant</h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• View financial data</li>
                      <li>• Generate invoices</li>
                      <li>• Track payments</li>
                      <li>• Create reports</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Choose how you want to receive alerts and updates</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Notification Channels */}
              <div>
                <h4 className="font-medium mb-4">Notification Channels</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Mail className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <div className="font-medium">Email Notifications</div>
                        <div className="text-sm text-muted-foreground">Receive updates via email</div>
                      </div>
                    </div>
                    <Switch
                      checked={notifications.email}
                      onCheckedChange={(checked) => handleNotificationChange('email', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Phone className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <div className="font-medium">SMS Notifications</div>
                        <div className="text-sm text-muted-foreground">Receive urgent alerts via SMS</div>
                      </div>
                    </div>
                    <Switch
                      checked={notifications.sms}
                      onCheckedChange={(checked) => handleNotificationChange('sms', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Bell className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <div className="font-medium">Push Notifications</div>
                        <div className="text-sm text-muted-foreground">Receive browser notifications</div>
                      </div>
                    </div>
                    <Switch
                      checked={notifications.push}
                      onCheckedChange={(checked) => handleNotificationChange('push', checked)}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Notification Types */}
              <div>
                <h4 className="font-medium mb-4">Notification Types</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Rent Payment Reminders</div>
                      <div className="text-sm text-muted-foreground">Notify when rent is due or overdue</div>
                    </div>
                    <Switch
                      checked={notifications.rentReminders}
                      onCheckedChange={(checked) => handleNotificationChange('rentReminders', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Maintenance Alerts</div>
                      <div className="text-sm text-muted-foreground">Notify about new or urgent maintenance requests</div>
                    </div>
                    <Switch
                      checked={notifications.maintenanceAlerts}
                      onCheckedChange={(checked) => handleNotificationChange('maintenanceAlerts', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Financial Reports</div>
                      <div className="text-sm text-muted-foreground">Weekly and monthly financial summaries</div>
                    </div>
                    <Switch
                      checked={notifications.financialReports}
                      onCheckedChange={(checked) => handleNotificationChange('financialReports', checked)}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Payment Gateway Setup</CardTitle>
              <CardDescription>Configure payment methods for rent collection</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 bg-success rounded flex items-center justify-center">
                        <span className="text-white text-xs font-bold">MP</span>
                      </div>
                      <div>
                        <div className="font-medium">M-PESA Integration</div>
                        <div className="text-sm text-muted-foreground">Mobile money payments</div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <Label>Business Short Code</Label>
                        <Input placeholder="Enter your paybill number" />
                      </div>
                      <div>
                        <Label>API Key</Label>
                        <Input type="password" placeholder="Enter M-PESA API key" />
                      </div>
                      <Button variant="outline" className="w-full" onClick={() => configurePaymentGateway('mpesa', { businessShortCode: '', apiKey: '' })}>Configure M-PESA</Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-4">
                      <CreditCard className="h-8 w-8 text-primary" />
                      <div>
                        <div className="font-medium">Bank Transfer</div>
                        <div className="text-sm text-muted-foreground">Direct bank payments</div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <Label>Bank Name</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Select bank" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="kcb">KCB Bank</SelectItem>
                            <SelectItem value="equity">Equity Bank</SelectItem>
                            <SelectItem value="coop">Co-operative Bank</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Account Number</Label>
                        <Input placeholder="Enter account number" />
                      </div>
                      <Button variant="outline" className="w-full" onClick={() => configurePaymentGateway('bank', { bankName: '', accountNumber: '' })}>Configure Bank Transfer</Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
                      <span className="text-white text-xs font-bold">CC</span>
                    </div>
                    <div>
                      <div className="font-medium">Credit/Debit Cards</div>
                      <div className="text-sm text-muted-foreground">Visa, MasterCard payments via Stripe</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Stripe Publishable Key</Label>
                      <Input placeholder="pk_live_..." />
                    </div>
                    <div>
                      <Label>Stripe Secret Key</Label>
                      <Input type="password" placeholder="sk_live_..." />
                    </div>
                  </div>
                  <Button variant="outline" className="w-full mt-4">Configure Stripe</Button>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Account Security</CardTitle>
              <CardDescription>Manage your account security settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Shield className="h-5 w-5 text-success" />
                    <div>
                      <div className="font-medium">Two-Factor Authentication</div>
                      <div className="text-sm text-muted-foreground">Add an extra layer of security</div>
                    </div>
                  </div>
                  <Button variant="outline">Enable 2FA</Button>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <div className="font-medium">Password</div>
                    <div className="text-sm text-muted-foreground">Last changed 3 months ago</div>
                  </div>
                  <Button variant="outline" onClick={() => setShowPasswordModal(true)}>Change Password</Button>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <div className="font-medium">Login Sessions</div>
                    <div className="text-sm text-muted-foreground">Manage active sessions</div>
                  </div>
                  <Button variant="outline">View Sessions</Button>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <div className="font-medium">API Access</div>
                    <div className="text-sm text-muted-foreground">Generate API keys for integrations</div>
                  </div>
                  <Button variant="outline">Manage API Keys</Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Data & Privacy</CardTitle>
              <CardDescription>Control your data and privacy settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <div className="font-medium">Export Data</div>
                  <div className="text-sm text-muted-foreground">Download all your property data</div>
                </div>
                <Button variant="outline">Export Data</Button>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <div className="font-medium">Delete Account</div>
                  <div className="text-sm text-muted-foreground">Permanently delete your account and data</div>
                </div>
                <Button variant="destructive">Delete Account</Button>
              </div>
            </CardContent>
          </Card>

          <DataIntegrityCheck />
        </TabsContent>
      </Tabs>

      {/* Password Change Modal */}
      <LandlordPasswordChangeModal 
        isOpen={showPasswordModal} 
        onClose={() => setShowPasswordModal(false)} 
      />
    </div>
  );
};