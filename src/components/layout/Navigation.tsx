import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { 
  Menu, 
  FileSpreadsheet, 
  Search, 
  Users, 
  Settings, 
  Upload,
  Home,
  LogOut
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const { user: authUser, signOut } = useAuth();
  
  // User data from auth
  const user = {
    name: authUser?.email?.split('@')[0] || "User",
    email: authUser?.email || ""
  };

  const [role, setRole] = useState<'admin' | 'editor' | 'viewer'>('viewer');

  useEffect(() => {
    let active = true;
    const fetchRole = async () => {
      if (!authUser?.id) return;
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', authUser.id)
        .maybeSingle();
      if (!active) return;
      if (data?.role) setRole(data.role as any);
    };
    fetchRole();

    const channel = supabase
      .channel('nav-user-role')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_roles', filter: `user_id=eq.${authUser?.id}` }, () => {
        fetchRole();
      })
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [authUser?.id]);
  const navigationItems = [
    { icon: Home, label: "Dashboard", href: "/", badge: null },
    { icon: Upload, label: "Upload Data", href: "/upload", badge: null },
    { icon: FileSpreadsheet, label: "Data Sheets", href: "/sheets", badge: "3" },
    { icon: Search, label: "Search & Filter", href: "/search", badge: null },
    { icon: Users, label: "User Management", href: "/users", badge: null, adminOnly: true },
    { icon: Settings, label: "Settings", href: "/settings", badge: null },
  ];

  const filteredItems = navigationItems.filter(item => 
    !item.adminOnly
  );

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "admin": return "default";
      case "editor": return "secondary";
      case "viewer": return "outline";
      default: return "outline";
    }
  };

  const NavContent = () => (
    <div className="flex flex-col h-full">
      {/* User Profile Section */}
      <div className="p-4 border-b bg-gradient-primary text-primary-foreground">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
            <span className="text-sm font-semibold">
              {user?.email?.substring(0, 2).toUpperCase() || "U"}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate">{user?.email || "User"}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={getRoleBadgeVariant(role)} className="text-xs capitalize">
                {role}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 p-4 space-y-2">
        {filteredItems.map((item, index) => (
          <Button
            key={index}
            variant="ghost"
            className="w-full justify-start h-auto p-3 text-left"
            onClick={() => {
              setIsOpen(false);
              navigate(item.href);
            }}
          >
            <item.icon className="h-5 w-5 mr-3 flex-shrink-0" />
            <span className="flex-1">{item.label}</span>
            {item.badge && (
              <Badge variant="secondary" className="ml-auto">
                {item.badge}
              </Badge>
            )}
          </Button>
        ))}
      </nav>
      <p className="p-4 border-t"> © Vinod Kumar/CNC</p>

      {/* Footer */}
      <div className="p-4 border-t">
        <Button 
          variant="ghost" 
          className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={signOut}
        >
          <LogOut className="h-5 w-5 mr-3" />
          Sign Out
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Navigation */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-card border-b shadow-elegant">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-80">
                <NavContent />
              </SheetContent>
            </Sheet>
            <h1 className="text-lg font-bold bg-gradient-primary bg-clip-text text-transparent">
              DataStore
            </h1>
          </div>
          <Badge variant={getRoleBadgeVariant(role)} className="capitalize">
            {role}
          </Badge>
        </div>
      </div>

      {/* Desktop Navigation */}
      <aside className="hidden lg:flex lg:w-80 lg:flex-col lg:fixed lg:inset-y-0 z-50 bg-card border-r shadow-elegant">
        <div className="p-6 border-b">
          <h1 className="text-2xl font-bold bg-gradient-hero bg-clip-text text-transparent">
            DataStore
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Excel Data Management Platform
          </p>
        </div>
        <NavContent />
      </aside>
    </>
  );
};

export default Navigation;