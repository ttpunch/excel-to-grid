import { useEffect, useState } from "react";
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
  User,
  Plus
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface DataSheet {
  id: string;
  name: string;
  description: string | null;
  columns: any; // JSON columns from database
  total_rows: number;
  created_at: string;
  updated_at: string;
  uploaded_by: string;
}

const DataSheetList = () => {
  const [sheets, setSheets] = useState<DataSheet[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    fetchSheets();
  }, []);

  const fetchSheets = async () => {
    try {
      const { data, error } = await supabase
        .from('data_sheets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSheets(data || []);
    } catch (error) {
      console.error('Error fetching sheets:', error);
      toast({
        title: "Error",
        description: "Failed to load data sheets",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (sheetId: string, sheetName: string) => {
    if (!confirm(`Are you sure you want to delete "${sheetName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      // Delete sheet data first (due to foreign key constraint)
      await supabase
        .from('sheet_data')
        .delete()
        .eq('sheet_id', sheetId);

      // Delete the sheet
      const { error } = await supabase
        .from('data_sheets')
        .delete()
        .eq('id', sheetId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `"${sheetName}" has been deleted`,
      });

      fetchSheets(); // Refresh the list
    } catch (error) {
      console.error('Error deleting sheet:', error);
      toast({
        title: "Error",
        description: "Failed to delete the data sheet",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
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
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-muted rounded w-1/3"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-20 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

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
        <Button 
          variant="gradient" 
          className="sm:w-auto"
          onClick={() => navigate('/upload')}
        >
          <Plus className="h-4 w-4 mr-2" />
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
                    <Badge variant="default" className="capitalize">
                      Active
                    </Badge>
                  </div>
                  <CardDescription>{sheet.description || "No description provided"}</CardDescription>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => navigate(`/sheets/${sheet.id}/view`)}>
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => navigate(`/sheets/${sheet.id}/edit`)}>
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-1" />
                    Export
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDelete(sheet.id, sheet.name)}
                  >
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
                      <span>{sheet.total_rows} rows</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <User className="h-4 w-4" />
                      <span>Uploaded by User</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>Created {formatDate(sheet.created_at)}</span>
                    </div>
                  </div>
                </div>

                {/* Columns */}
                <div className="lg:col-span-2 space-y-3">
                  <h4 className="font-medium text-sm">
                    Columns ({Array.isArray(sheet.columns) ? sheet.columns.length : 0})
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {Array.isArray(sheet.columns) ? sheet.columns.map((column, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {column}
                      </Badge>
                    )) : (
                      <span className="text-sm text-muted-foreground">No columns available</span>
                    )}
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
            <Button variant="gradient" onClick={() => navigate('/upload')}>
              <Plus className="h-4 w-4 mr-2" />
              Upload Excel File
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DataSheetList;