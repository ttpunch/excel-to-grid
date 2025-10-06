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
import { useEffect, useState } from "react";
import { formatDistanceToNow, format, startOfDay, endOfDay } from "date-fns";
import { useNavigate } from "react-router-dom";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";

const Dashboard = () => {
  const navigate = useNavigate();
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  
  const { data: recentActivity, refetch } = useQuery({
    queryKey: ['recent-activity', dateFrom, dateTo],
    queryFn: async () => {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (dateFrom) {
        query = query.gte('created_at', startOfDay(dateFrom).toISOString());
      }
      if (dateTo) {
        query = query.lte('created_at', endOfDay(dateTo).toISOString());
      }

      if (!dateFrom && !dateTo) {
        query = query.limit(5);
      }

      const { data: logs, error: logsError } = await query;
      
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
        const details = log.details as { 
          name?: string; 
          rows?: number; 
          cellsEdited?: number;
          changes?: Array<{
            row: number;
            column: string;
            oldValue: any;
            newValue: any;
          }>;
        } | null;
        
        let detailText = '';
        let detailsList: string[] = [];
        
        if (log.action === 'upload' && details?.rows) {
          detailText = `${details.rows} rows uploaded`;
        } else if (log.action === 'edit' && details?.changes && details.changes.length > 0) {
          detailText = `${details.cellsEdited} cell${details.cellsEdited !== 1 ? 's' : ''} modified`;
          detailsList = details.changes.map(change => 
            `Row ${change.row}, ${change.column}: "${change.oldValue}" → "${change.newValue}"`
          );
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
          detail: detailText,
          changesList: detailsList
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
            Data Store
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Your comprehensive data management platform
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
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" />
                    Recent Activity
                  </CardTitle>
                  <CardDescription>
                    Latest updates and changes to your data
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                          "justify-start text-left font-normal",
                          !dateFrom && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateFrom ? format(dateFrom, "PPP") : "From date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                      <Calendar
                        mode="single"
                        selected={dateFrom}
                        onSelect={setDateFrom}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                          "justify-start text-left font-normal",
                          !dateTo && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateTo ? format(dateTo, "PPP") : "To date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                      <Calendar
                        mode="single"
                        selected={dateTo}
                        onSelect={setDateTo}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  {(dateFrom || dateTo) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setDateFrom(undefined);
                        setDateTo(undefined);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="max-h-[500px] overflow-y-auto">
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
                        {activity.changesList && activity.changesList.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {activity.changesList.map((change, idx) => (
                              <p key={idx} className="text-xs text-muted-foreground bg-background/50 p-1.5 rounded font-mono">
                                {change}
                              </p>
                            ))}
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">{activity.time}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;