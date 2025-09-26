import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  FileSpreadsheet, 
  Eye, 
  Edit, 
  Download, 
  Trash2,
  Calendar,
  User,
  Search,
  Filter,
  SortAsc,
  SortDesc
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface DataSheet {
  id: string;
  name: string;
  description: string | null;
  columns: any;
  total_rows: number;
  created_at: string;
  updated_at: string;
  uploaded_by: string;
}

const DataSheetSearch = () => {
  const [sheets, setSheets] = useState<DataSheet[]>([]);
  const [filteredSheets, setFilteredSheets] = useState<DataSheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [filterByRows, setFilterByRows] = useState("all");
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    fetchSheets();
  }, []);

  useEffect(() => {
    filterAndSortSheets();
  }, [sheets, searchTerm, sortBy, sortOrder, filterByRows]);

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

  const filterAndSortSheets = () => {
    let filtered = sheets;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(sheet => 
        sheet.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (sheet.description && sheet.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (Array.isArray(sheet.columns) && sheet.columns.some((col: string) => 
          col.toLowerCase().includes(searchTerm.toLowerCase())
        ))
      );
    }

    // Row count filter
    if (filterByRows !== "all") {
      switch (filterByRows) {
        case "small":
          filtered = filtered.filter(sheet => sheet.total_rows <= 100);
          break;
        case "medium":
          filtered = filtered.filter(sheet => sheet.total_rows > 100 && sheet.total_rows <= 1000);
          break;
        case "large":
          filtered = filtered.filter(sheet => sheet.total_rows > 1000);
          break;
      }
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case "name":
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case "total_rows":
          aValue = a.total_rows;
          bValue = b.total_rows;
          break;
        case "created_at":
        default:
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
          break;
      }

      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredSheets(filtered);
  };

  const handleDelete = async (sheetId: string, sheetName: string) => {
    if (!confirm(`Are you sure you want to delete "${sheetName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await supabase
        .from('sheet_data')
        .delete()
        .eq('sheet_id', sheetId);

      const { error } = await supabase
        .from('data_sheets')
        .delete()
        .eq('id', sheetId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `"${sheetName}" has been deleted`,
      });

      fetchSheets();
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

  const toggleSortOrder = () => {
    setSortOrder(prev => prev === "asc" ? "desc" : "asc");
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4">
          <h1 className="text-3xl font-bold bg-gradient-hero bg-clip-text text-transparent">
            Search Data Sheets
          </h1>
          <div className="h-10 bg-muted rounded animate-pulse"></div>
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
      <div className="space-y-4">
        <h1 className="text-3xl font-bold bg-gradient-hero bg-clip-text text-transparent">
          Search Data Sheets
        </h1>
        <p className="text-muted-foreground">
          Find and filter your uploaded Excel data sheets
        </p>

        {/* Search and Filter Controls */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, description, or column names..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <div className="flex gap-2">
                <Select value={filterByRows} onValueChange={setFilterByRows}>
                  <SelectTrigger className="w-40">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sizes</SelectItem>
                    <SelectItem value="small">≤ 100 rows</SelectItem>
                    <SelectItem value="medium">101-1000 rows</SelectItem>
                    <SelectItem value="large">&gt; 1000 rows</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="created_at">Date Created</SelectItem>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="total_rows">Row Count</SelectItem>
                  </SelectContent>
                </Select>

                <Button variant="outline" size="icon" onClick={toggleSortOrder}>
                  {sortOrder === "asc" ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Showing {filteredSheets.length} of {sheets.length} sheets</span>
              {searchTerm && (
                <Badge variant="secondary">
                  Search: "{searchTerm}"
                </Badge>
              )}
              {filterByRows !== "all" && (
                <Badge variant="secondary">
                  Filter: {filterByRows} sheets
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Results */}
      <div className="grid gap-6">
        {filteredSheets.map((sheet) => (
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
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => navigate(`/sheets/${sheet.id}/view`)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => navigate(`/sheets/${sheet.id}/edit`)}
                  >
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

                <div className="lg:col-span-2 space-y-3">
                  <h4 className="font-medium text-sm">
                    Columns ({Array.isArray(sheet.columns) ? sheet.columns.length : 0})
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {Array.isArray(sheet.columns) ? sheet.columns.map((column, index) => (
                      <Badge 
                        key={index} 
                        variant="outline" 
                        className={`text-xs ${
                          searchTerm && column.toLowerCase().includes(searchTerm.toLowerCase()) 
                            ? 'bg-primary/10 border-primary' 
                            : ''
                        }`}
                      >
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

      {filteredSheets.length === 0 && !loading && (
        <Card className="text-center py-12">
          <CardContent>
            <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No sheets found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || filterByRows !== "all" 
                ? "Try adjusting your search terms or filters" 
                : "No data sheets available"}
            </p>
            {(searchTerm || filterByRows !== "all") && (
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTerm("");
                  setFilterByRows("all");
                }}
              >
                Clear Filters
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DataSheetSearch;