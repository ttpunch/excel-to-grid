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

const Dashboard = () => {
  // Mock recent activity data
  const recentActivity = [
    {
      id: 1,
      action: "Uploaded",
      item: "Sales Data Q4 2024.xlsx",
      user: "John Doe",
      time: "2 hours ago",
      type: "upload"
    },
    {
      id: 2,
      action: "Edited",
      item: "Employee Directory",
      user: "Sarah Wilson",
      time: "5 hours ago",
      type: "edit"
    },
    {
      id: 3,
      action: "Downloaded",
      item: "Inventory Tracking.csv",
      user: "Mike Chen",
      time: "1 day ago",
      type: "download"
    }
  ];

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
              <Button variant="gradient" className="w-full justify-start">
                <Upload className="h-4 w-4 mr-2" />
                Upload New File
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                View All Sheets
              </Button>
              <Button variant="outline" className="w-full justify-start">
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
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center gap-4 p-3 rounded-lg border bg-muted/20">
                    <div className="flex-shrink-0">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">
                        <span className="text-primary">{activity.user}</span> {activity.action.toLowerCase()} 
                        <span className="font-semibold"> {activity.item}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">{activity.time}</p>
                    </div>
                  </div>
                ))}
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