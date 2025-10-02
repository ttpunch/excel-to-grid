import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileSpreadsheet, Users, Search, Upload } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

const DashboardStats = () => {
  const { data: sheets, refetch: refetchSheets } = useQuery({
    queryKey: ['dashboard-sheets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('data_sheets')
        .select('total_rows');
      if (error) throw error;
      return data;
    }
  });

  const { data: users, refetch: refetchUsers } = useQuery({
    queryKey: ['dashboard-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role');
      if (error) throw error;
      return data;
    }
  });

  const { data: auditLogs, refetch: refetchAuditLogs } = useQuery({
    queryKey: ['dashboard-audit-logs'],
    queryFn: async () => {
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .gte('created_at', oneMonthAgo.toISOString());
      if (error) throw error;
      return data;
    }
  });

  // Realtime subscriptions
  useEffect(() => {
    const sheetsChannel = supabase
      .channel('dashboard-sheets-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'data_sheets' }, () => {
        refetchSheets();
      })
      .subscribe();

    const usersChannel = supabase
      .channel('dashboard-users-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_roles' }, () => {
        refetchUsers();
      })
      .subscribe();

    const auditChannel = supabase
      .channel('dashboard-audit-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'audit_logs' }, () => {
        refetchAuditLogs();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(sheetsChannel);
      supabase.removeChannel(usersChannel);
      supabase.removeChannel(auditChannel);
    };
  }, [refetchSheets, refetchUsers, refetchAuditLogs]);

  const totalSheets = sheets?.length || 0;
  const totalRecords = sheets?.reduce((sum, sheet) => sum + (sheet.total_rows || 0), 0) || 0;
  const totalUsers = users?.length || 0;
  
  const roleCount = users?.reduce((acc, user) => {
    acc[user.role] = (acc[user.role] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const uploadsThisMonth = auditLogs?.filter(log => log.action === 'upload').length || 0;

  const stats = [
    {
      title: "Total Sheets",
      value: totalSheets.toString(),
      icon: FileSpreadsheet,
      description: `${totalSheets} sheet${totalSheets !== 1 ? 's' : ''} in database`,
      gradient: "bg-gradient-primary"
    },
    {
      title: "Active Users",
      value: totalUsers.toString(),
      icon: Users,
      description: `${roleCount.admin || 0} admins, ${roleCount.editor || 0} editors, ${roleCount.viewer || 0} viewers`,
      gradient: "bg-gradient-secondary"
    },
    {
      title: "Total Records",
      value: totalRecords.toLocaleString(),
      icon: Search,
      description: "Across all sheets",
      gradient: "bg-gradient-accent"
    },
    {
      title: "Files Uploaded",
      value: uploadsThisMonth.toString(),
      icon: Upload,
      description: "This month",
      gradient: "bg-gradient-hero"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card key={index} className="transition-smooth hover:shadow-glow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-md ${stat.gradient}`}>
                <Icon className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default DashboardStats;