import Layout from "@/components/layout/Layout";
import DashboardStats from "@/components/dashboard/DashboardStats";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Upload, 
  FileSpreadsheet, 
  Search, 
  Activity,
  TrendingUp,
  Clock
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const navigate = useNavigate();
  
  const { data: recentActivity, refetch } = useQuery({
    queryKey: ['recent-activity'],
    queryFn: async () => {
      const { data: logs, error: logsError } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (logsError) throw logsError;

      const { data: sheets, error: sheetsError } = await supabase
        .from('data_sheets')
        .select('id, name');
      
      if (sheetsError) throw sheetsError;

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, display_name, email');
      
      if (profilesError) throw profilesError;

      const sheetMap = new Map(sheets?.map(s => [s.id, s.name]) || []);
      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      return logs?.map(log => {
        const profile = profileMap.get(log.user_id);
        const details = log.details as { name?: string; rows?: number; cellsEdited?: number } | null;
        
        let detailText = '';
        if (log.action === 'upload' && details?.rows) {
          detailText = `${details.rows} rows`;
        } else if (log.action === 'edit' && details?.cellsEdited) {
          detailText = `${details.cellsEdited} cell${details.cellsEdited !== 1 ? 's' : ''} modified`;
        } else if (log.action === 'delete') {
          detailText = 'deleted permanently';
        }
        
        return {
          id: log.id,
          action: log.action.charAt(0).toUpperCase() + log.action.slice(1),
          item: log.resource_type === 'sheet' && log.resource_id 
            ? sheetMap.get(log.resource_id) || details?.name || 'Unknown Sheet'
            : details?.name || 'Unknown',
          user: profile?.display_name || profile?.email || 'Unknown User',
          time: formatDistanceToNow(new Date(log.created_at), { addSuffix: true }),
          type: log.action,
          detail: detailText
        };
      }) || [];
    }
  });

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('dashboard-activity-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'audit_logs' }, () => {
        refetch();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "upload": return <Upload className="h-4 w-4 text-primary" />;
      case "edit": return <FileSpreadsheet className="h-4 w-4 text-secondary" />;
      case "download": return <TrendingUp className="h-4 w-4 text-accent" />;
      default: return <Activity className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold bg-gradient-hero bg-clip-text text-transparent">
            Dashboard
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Welcome to DataSheet Pro - your comprehensive Excel data management platform
          </p>
        </div>

        {/* Stats Cards */}
        <DashboardStats />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Actions */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Quick Actions
              </CardTitle>
              <CardDescription>
                Common tasks and shortcuts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="gradient" className="w-full justify-start" onClick={() => navigate('/upload')}>
                <Upload className="h-4 w-4 mr-2" />
                Upload New File
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/sheets')}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                View All Sheets
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/search')}>
                <Search className="h-4 w-4 mr-2" />
                Search Data
              </Button>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Recent Activity
              </CardTitle>
              <CardDescription>
                Latest updates and changes to your data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {!recentActivity || recentActivity.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No recent activity</p>
                ) : (
                  recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-center gap-4 p-3 rounded-lg border bg-muted/20">
                      <div className="flex-shrink-0">
                        {getActivityIcon(activity.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">
                          <span className="text-primary">{activity.user}</span> {activity.action.toLowerCase()} 
                          <span className="font-semibold"> {activity.item}</span>
                        </p>
                        {activity.detail && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {activity.detail}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">{activity.time}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Getting Started */}
        <Card className="bg-gradient-primary text-primary-foreground">
          <CardHeader>
            <CardTitle className="text-xl">Getting Started with DataSheet Pro</CardTitle>
            <CardDescription className="text-primary-foreground/80">
              Follow these steps to make the most of your data management platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">
                  1
                </div>
                <h3 className="font-semibold">Upload Your Data</h3>
                <p className="text-sm text-primary-foreground/80">
                  Upload Excel or CSV files to start managing your data
                </p>
              </div>
              <div className="space-y-2">
                <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">
                  2
                </div>
                <h3 className="font-semibold">Organize & Search</h3>
                <p className="text-sm text-primary-foreground/80">
                  Use powerful search and filtering tools to find what you need
                </p>
              </div>
              <div className="space-y-2">
                <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">
                  3
                </div>
                <h3 className="font-semibold">Collaborate</h3>
                <p className="text-sm text-primary-foreground/80">
                  Invite team members and manage access with role-based permissions
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Dashboard;