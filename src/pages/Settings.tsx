import { useState, useEffect } from "react";
import Layout from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  User, 
  Mail, 
  Save, 
  Shield, 
  Bell, 
  Palette, 
  Database,
  Trash2,
  LogOut,
  Settings as SettingsIcon,
  Users,
  UserCog,
  Key,
  RefreshCw
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface UserProfile {
  id: string;
  user_id: string;
  display_name: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
}

interface UserRole {
  id: string;
  user_id: string;
  role: 'admin' | 'editor' | 'viewer';
  created_at: string;
}

interface UserWithRole {
  user_id: string;
  email: string;
  display_name: string | null;
  role: 'admin' | 'editor' | 'viewer' | null;
  role_id: string | null;
}

const Settings = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Admin role management
  const [allUsers, setAllUsers] = useState<UserWithRole[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  
  // Form states
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [bio, setBio] = useState("");
  
  // App preferences
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [dataRetention, setDataRetention] = useState("30");
  const [autoBackup, setAutoBackup] = useState(false);

  // Password change states
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  // Admin - Create new user states
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserDisplayName, setNewUserDisplayName] = useState("");
  const [newUserRole, setNewUserRole] = useState<'admin' | 'editor' | 'viewer'>('viewer');
  const [creatingUser, setCreatingUser] = useState(false);

  // Admin - Change user password states
  const [selectedUserForPasswordChange, setSelectedUserForPasswordChange] = useState<string | null>(null);
  const [adminSetPassword, setAdminSetPassword] = useState("");

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchUserRole();
    }
  }, [user]);

  useEffect(() => {
    if (userRole?.role === 'admin') {
      fetchAllUsers();
    }
  }, [userRole]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setProfile(data);
        setDisplayName(data.display_name || "");
        setEmail(data.email || user?.email || "");
      } else {
        // Create profile if it doesn't exist
        const newProfile = {
          user_id: user?.id,
          display_name: user?.user_metadata?.display_name || "",
          email: user?.email || ""
        };

        const { data: createdProfile, error: createError } = await supabase
          .from('profiles')
          .insert(newProfile)
          .select()
          .single();

        if (createError) throw createError;
        setProfile(createdProfile);
        setDisplayName(createdProfile.display_name || "");
        setEmail(createdProfile.email || "");
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast({
        title: "Error",
        description: "Failed to load profile data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUserRole = async () => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching role:', error);
        return;
      }

      if (data) {
        setUserRole(data);
      } else {
        // No role found - assign admin role to the first user
        console.log('No role found, creating admin role for user');
        const { data: newRole, error: createError } = await supabase
          .from('user_roles')
          .insert({
            user_id: user?.id,
            role: 'admin'
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating admin role:', createError);
          toast({
            title: "Error",
            description: "Failed to assign admin role",
            variant: "destructive",
          });
          return;
        }

        setUserRole(newRole);
        toast({
          title: "Admin Role Assigned",
          description: "You have been assigned as an admin",
        });
      }
    } catch (error) {
      console.error('Error fetching user role:', error);
    }
  };

  const fetchAllUsers = async () => {
    setLoadingUsers(true);
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, email, display_name');

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('id, user_id, role');

      if (rolesError) throw rolesError;

      const usersWithRoles: UserWithRole[] = (profiles || []).map((profile) => {
        const userRole = roles?.find((r) => r.user_id === profile.user_id);
        return {
          user_id: profile.user_id,
          email: profile.email || '',
          display_name: profile.display_name,
          role: userRole?.role || null,
          role_id: userRole?.id || null,
        };
      });

      setAllUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive",
      });
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleUpdateUserRole = async (userId: string, newRole: 'admin' | 'editor' | 'viewer', roleId: string | null) => {
    try {
      if (roleId) {
        // Update existing role
        const { error } = await supabase
          .from('user_roles')
          .update({ role: newRole })
          .eq('id', roleId);

        if (error) throw error;
      } else {
        // Insert new role
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role: newRole });

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: "User role updated successfully",
      });

      fetchAllUsers();
    } catch (error) {
      console.error('Error updating user role:', error);
      toast({
        title: "Error",
        description: "Failed to update user role",
        variant: "destructive",
      });
    }
  };

  const handleSaveProfile = async () => {
    if (!user || !profile) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: displayName || null,
          email: email || null,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Profile updated successfully",
      });

      fetchProfile();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/auth');
    } catch (error) {
      console.error('Error signing out:', error);
      toast({
        title: "Error",
        description: "Failed to sign out",
        variant: "destructive",
      });
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast({
        title: "Error",
        description: "Please fill in all password fields",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters long",
        variant: "destructive",
      });
      return;
    }

    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Password changed successfully",
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      console.error('Error changing password:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to change password",
        variant: "destructive",
      });
    } finally {
      setChangingPassword(false);
    }
  };

  const handleResetUserPassword = async (email: string) => {
    if (!confirm(`Send password reset email to ${email}?`)) {
      return;
    }

    try {
      const { error } = await supabase.functions.invoke('send-password-reset', {
        body: { 
          email,
          isAdmin: true
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Password reset email sent to ${email}`,
      });
    } catch (error: any) {
      console.error('Error sending password reset:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send password reset email",
        variant: "destructive",
      });
    }
  };

  const handleCreateUser = async () => {
    if (!newUserEmail || !newUserPassword) {
      toast({
        title: "Error",
        description: "Email and password are required",
        variant: "destructive",
      });
      return;
    }

    if (newUserPassword.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }

    setCreatingUser(true);
    try {
      // Call edge function to create user with admin privileges
      const { data, error } = await supabase.functions.invoke('admin-create-user', {
        body: {
          email: newUserEmail,
          password: newUserPassword,
          displayName: newUserDisplayName || newUserEmail.split('@')[0],
          role: newUserRole
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `User ${newUserEmail} created successfully`,
      });

      // Reset form
      setNewUserEmail("");
      setNewUserPassword("");
      setNewUserDisplayName("");
      setNewUserRole('viewer');

      // Refresh users list
      fetchAllUsers();
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create user",
        variant: "destructive",
      });
    } finally {
      setCreatingUser(false);
    }
  };

  const handleAdminChangePassword = async (userId: string, userEmail: string) => {
    if (!adminSetPassword || adminSetPassword.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase.functions.invoke('admin-change-password', {
        body: {
          userId,
          newPassword: adminSetPassword
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Password updated for ${userEmail}`,
      });

      setSelectedUserForPasswordChange(null);
      setAdminSetPassword("");
    } catch (error: any) {
      console.error('Error changing user password:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to change password",
        variant: "destructive",
      });
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm("Are you sure you want to delete your account? This action cannot be undone and will delete all your data.")) {
      return;
    }

    try {
      // Delete user data first
      await supabase
        .from('data_sheets')
        .delete()
        .eq('uploaded_by', user?.id);

      await supabase
        .from('profiles')
        .delete()
        .eq('user_id', user?.id);

      toast({
        title: "Account Deleted",
        description: "Your account and all data have been deleted",
      });

      await signOut();
      navigate('/auth');
    } catch (error) {
      console.error('Error deleting account:', error);
      toast({
        title: "Error",
        description: "Failed to delete account",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold bg-gradient-hero bg-clip-text text-transparent">
            Settings
          </h1>
          <p className="text-muted-foreground">
            Manage your account settings and preferences
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Settings */}
          <div className="lg:col-span-2 space-y-6">
            {/* Profile Information */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  <CardTitle>Profile Information</CardTitle>
                </div>
                <CardDescription>
                  Update your personal information and profile details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src="" alt="Profile" />
                    <AvatarFallback className="bg-gradient-primary text-white">
                      {displayName ? getInitials(displayName) : 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-1">
                    <h3 className="font-medium">Profile Picture</h3>
                    <p className="text-sm text-muted-foreground">
                      Coming soon - avatar upload functionality
                    </p>
                  </div>
                </div>

                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="displayName">Display Name</Label>
                    <Input
                      id="displayName"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Enter your display name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Tell us about yourself (coming soon)"
                      rows={3}
                      disabled
                    />
                  </div>
                </div>

                <Button onClick={handleSaveProfile} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </CardContent>
            </Card>

            {/* Password Management */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  <CardTitle>Password Management</CardTitle>
                </div>
                <CardDescription>
                  Change your account password
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password (min 6 characters)"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                  />
                </div>

                <Button 
                  onClick={handleChangePassword} 
                  disabled={changingPassword || !newPassword || !confirmPassword}
                >
                  <Key className="h-4 w-4 mr-2" />
                  {changingPassword ? "Changing Password..." : "Change Password"}
                </Button>
              </CardContent>
            </Card>

            {/* Create New User - Admin Only */}
            {userRole?.role === 'admin' && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    <CardTitle>Create New User</CardTitle>
                  </div>
                  <CardDescription>
                    Create a new user account with email and password (Admin only)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="newUserEmail">Email Address</Label>
                    <Input
                      id="newUserEmail"
                      type="email"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      placeholder="user@example.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="newUserDisplayName">Display Name (Optional)</Label>
                    <Input
                      id="newUserDisplayName"
                      value={newUserDisplayName}
                      onChange={(e) => setNewUserDisplayName(e.target.value)}
                      placeholder="John Doe"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="newUserPassword">Password</Label>
                    <Input
                      id="newUserPassword"
                      type="password"
                      value={newUserPassword}
                      onChange={(e) => setNewUserPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="newUserRole">User Role</Label>
                    <Select value={newUserRole} onValueChange={(value) => setNewUserRole(value as 'admin' | 'editor' | 'viewer')}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="editor">Editor</SelectItem>
                        <SelectItem value="viewer">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button 
                    onClick={handleCreateUser} 
                    disabled={creatingUser || !newUserEmail || !newUserPassword}
                    className="w-full"
                  >
                    <Users className="h-4 w-4 mr-2" />
                    {creatingUser ? "Creating User..." : "Create User"}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Role Management - Admin Only */}
            {userRole?.role === 'admin' && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <UserCog className="h-5 w-5" />
                    <CardTitle>User Management</CardTitle>
                  </div>
                  <CardDescription>
                    Manage user roles and passwords (Admin only)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingUsers ? (
                    <div className="text-sm text-muted-foreground">Loading users...</div>
                  ) : (
                    <div className="space-y-4">
                      {allUsers.map((userItem) => (
                        <div key={userItem.user_id} className="border rounded-lg p-3 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="bg-gradient-primary text-white text-xs">
                                  {userItem.display_name 
                                    ? getInitials(userItem.display_name) 
                                    : userItem.email.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="text-sm font-medium">
                                  {userItem.display_name || 'No name'}
                                </p>
                                <p className="text-xs text-muted-foreground">{userItem.email}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Select
                                value={userItem.role || 'viewer'}
                                onValueChange={(value) => 
                                  handleUpdateUserRole(userItem.user_id, value as 'admin' | 'editor' | 'viewer', userItem.role_id)
                                }
                              >
                                <SelectTrigger className="w-32">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="admin">Admin</SelectItem>
                                  <SelectItem value="editor">Editor</SelectItem>
                                  <SelectItem value="viewer">Viewer</SelectItem>
                                </SelectContent>
                              </Select>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedUserForPasswordChange(
                                  selectedUserForPasswordChange === userItem.user_id ? null : userItem.user_id
                                )}
                                title="Change password"
                              >
                                <Key className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          
                          {selectedUserForPasswordChange === userItem.user_id && (
                            <div className="space-y-2 pt-2 border-t">
                              <Label htmlFor={`password-${userItem.user_id}`}>New Password</Label>
                              <div className="flex gap-2">
                                <Input
                                  id={`password-${userItem.user_id}`}
                                  type="password"
                                  value={adminSetPassword}
                                  onChange={(e) => setAdminSetPassword(e.target.value)}
                                  placeholder="Enter new password (min 6 characters)"
                                />
                                <Button
                                  size="sm"
                                  onClick={() => handleAdminChangePassword(userItem.user_id, userItem.email)}
                                  disabled={!adminSetPassword || adminSetPassword.length < 6}
                                >
                                  Set
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                      {allUsers.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No users found
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* App Preferences */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <SettingsIcon className="h-5 w-5" />
                  <CardTitle>App Preferences</CardTitle>
                </div>
                <CardDescription>
                  Customize your app experience and notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Bell className="h-4 w-4" />
                        <Label>Email Notifications</Label>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Receive email updates about your data sheets
                      </p>
                    </div>
                    <Switch
                      checked={emailNotifications}
                      onCheckedChange={setEmailNotifications}
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Database className="h-4 w-4" />
                        <Label>Auto Backup</Label>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Automatically backup your data sheets
                      </p>
                    </div>
                    <Switch
                      checked={autoBackup}
                      onCheckedChange={setAutoBackup}
                    />
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label>Data Retention Period</Label>
                    <Select value={dataRetention} onValueChange={setDataRetention}>
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7">7 days</SelectItem>
                        <SelectItem value="30">30 days</SelectItem>
                        <SelectItem value="90">90 days</SelectItem>
                        <SelectItem value="365">1 year</SelectItem>
                        <SelectItem value="forever">Forever</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground">
                      How long to keep deleted data sheets in backup
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Account Status */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  <CardTitle>Account Status</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>User Role</span>
                    <span className="font-medium capitalize">
                      {userRole?.role || 'No role assigned'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Account Type</span>
                    <span className="font-medium">Standard</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Member Since</span>
                    <span className="font-medium">
                      {profile ? new Date(profile.created_at).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Last Updated</span>
                    <span className="font-medium">
                      {profile ? new Date(profile.updated_at).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => navigate('/upload')}
                >
                  <Database className="h-4 w-4 mr-2" />
                  Upload New Sheet
                </Button>
                
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => navigate('/search')}
                >
                  <SettingsIcon className="h-4 w-4 mr-2" />
                  Manage Sheets
                </Button>

                <Separator />

                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={handleSignOut}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="text-destructive">Danger Zone</CardTitle>
                <CardDescription>
                  Irreversible actions that affect your account
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={handleDeleteAccount}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Account
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  This will permanently delete your account and all data
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Settings;