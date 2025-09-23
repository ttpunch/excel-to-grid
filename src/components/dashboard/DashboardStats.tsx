import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileSpreadsheet, Users, Search, Upload } from "lucide-react";

const DashboardStats = () => {
  const stats = [
    {
      title: "Total Sheets",
      value: "12",
      icon: FileSpreadsheet,
      description: "+2 from last week",
      gradient: "bg-gradient-primary"
    },
    {
      title: "Active Users",
      value: "8",
      icon: Users,
      description: "2 admins, 3 editors, 3 viewers",
      gradient: "bg-gradient-secondary"
    },
    {
      title: "Total Records",
      value: "1,247",
      icon: Search,
      description: "Across all sheets",
      gradient: "bg-gradient-accent"
    },
    {
      title: "Files Uploaded",
      value: "24",
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