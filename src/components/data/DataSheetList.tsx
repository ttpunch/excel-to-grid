import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  FileSpreadsheet, 
  Eye, 
  Edit, 
  Download, 
  Trash2,
  Calendar,
  User
} from "lucide-react";

const DataSheetList = () => {
  // Mock data - will be replaced with actual Supabase data
  const sheets = [
    {
      id: 1,
      name: "Sales Data Q4 2024",
      description: "Quarterly sales performance data",
      columns: ["Date", "Product", "Revenue", "Quantity", "Region"],
      rowCount: 247,
      uploadedBy: "John Doe",
      uploadedAt: "2024-01-15",
      lastModified: "2024-01-20",
      status: "active"
    },
    {
      id: 2,
      name: "Employee Directory",
      description: "Current employee information and contacts",
      columns: ["Name", "Department", "Email", "Phone", "Start Date"],
      rowCount: 89,
      uploadedBy: "Sarah Wilson",
      uploadedAt: "2024-01-10",
      lastModified: "2024-01-18",
      status: "active"
    },
    {
      id: 3,
      name: "Inventory Tracking",
      description: "Product inventory levels and locations",
      columns: ["SKU", "Product Name", "Quantity", "Location", "Last Update"],
      rowCount: 456,
      uploadedBy: "Mike Chen",
      uploadedAt: "2024-01-08",
      lastModified: "2024-01-22",
      status: "processing"
    }
  ];

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "active": return "default";
      case "processing": return "secondary";
      case "error": return "destructive";
      default: return "outline";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-hero bg-clip-text text-transparent">
            Data Sheets
          </h1>
          <p className="text-muted-foreground">
            Manage and view your uploaded Excel data sheets
          </p>
        </div>
        <Button variant="gradient" className="sm:w-auto">
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Upload New Sheet
        </Button>
      </div>

      <div className="grid gap-6">
        {sheets.map((sheet) => (
          <Card key={sheet.id} className="transition-smooth hover:shadow-glow">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-xl">{sheet.name}</CardTitle>
                    <Badge variant={getStatusVariant(sheet.status)} className="capitalize">
                      {sheet.status}
                    </Badge>
                  </div>
                  <CardDescription>{sheet.description}</CardDescription>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </Button>
                  <Button variant="outline" size="sm">
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-1" />
                    Export
                  </Button>
                  <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Sheet Info */}
                <div className="space-y-3">
                  <h4 className="font-medium text-sm">Sheet Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <FileSpreadsheet className="h-4 w-4" />
                      <span>{sheet.rowCount} rows</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <User className="h-4 w-4" />
                      <span>Uploaded by {sheet.uploadedBy}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>Modified {sheet.lastModified}</span>
                    </div>
                  </div>
                </div>

                {/* Columns */}
                <div className="lg:col-span-2 space-y-3">
                  <h4 className="font-medium text-sm">Columns ({sheet.columns.length})</h4>
                  <div className="flex flex-wrap gap-2">
                    {sheet.columns.map((column, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {column}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {sheets.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Data Sheets</h3>
            <p className="text-muted-foreground mb-4">
              Upload your first Excel file to get started
            </p>
            <Button variant="gradient">
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Upload Excel File
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DataSheetList;