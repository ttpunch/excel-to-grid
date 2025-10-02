import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import Layout from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable, DataTableHeader, DataTableBody, DataTableRow, DataTableCell } from "@/components/ui/data-table";
import { ArrowLeft, Edit, Download, FileSpreadsheet, Calendar, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

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

interface SheetData {
  id: string;
  row_index: number;
  data: any;
}

const SheetView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [sheet, setSheet] = useState<DataSheet | null>(null);
  const [sheetData, setSheetData] = useState<SheetData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchSheetDetails();
    }
  }, [id]);

  const fetchSheetDetails = async () => {
    try {
      // Fetch sheet metadata
      const { data: sheetData, error: sheetError } = await supabase
        .from('data_sheets')
        .select('*')
        .eq('id', id)
        .single();

      if (sheetError) throw sheetError;
      setSheet({
        ...sheetData,
        columns: Array.isArray(sheetData.columns) ? sheetData.columns : []
      });

      // Fetch sheet data
      const { data: rowData, error: rowError } = await supabase
        .from('sheet_data')
        .select('*')
        .eq('sheet_id', id)
        .order('row_index');

      if (rowError) throw rowError;
      setSheetData(rowData?.map(row => ({
        ...row,
        data: typeof row.data === 'object' ? row.data : {}
      })) || []);
    } catch (error) {
      console.error('Error fetching sheet:', error);
      toast({
        title: "Error",
        description: "Failed to load sheet data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-muted rounded w-1/2 mb-8"></div>
            <div className="h-64 bg-muted rounded"></div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!sheet) {
    return (
      <Layout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-4">Sheet not found</h2>
          <Button onClick={() => navigate('/search')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Search
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-4">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate('/search')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <h1 className="text-3xl font-bold bg-gradient-hero bg-clip-text text-transparent">
                {sheet.name}
              </h1>
            </div>
            <p className="text-muted-foreground">
              {sheet.description || "No description provided"}
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline"
              onClick={() => navigate(`/sheets/${sheet.id}/edit`)}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Sheet Information */}
        <Card>
          <CardHeader>
            <CardTitle>Sheet Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                <span>{sheet.total_rows} rows</span>
              </div>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>Uploaded by User</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>Created {formatDate(sheet.created_at)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Table */}
        <Card>
          <CardHeader>
            <CardTitle>Data Preview</CardTitle>
            <CardDescription>
              Showing all {sheetData.length} rows
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable>
              <DataTableHeader>
                <DataTableRow style={{ gridTemplateColumns: `80px repeat(${sheet.columns.length}, minmax(150px, 1fr))` }}>
                  <DataTableCell header>#</DataTableCell>
                  {sheet.columns.map((column, index) => (
                    <DataTableCell key={index} header>
                      {column}
                    </DataTableCell>
                  ))}
                </DataTableRow>
              </DataTableHeader>
              <DataTableBody>
                {sheetData.map((row) => (
                  <DataTableRow 
                    key={row.id}
                    style={{ gridTemplateColumns: `80px repeat(${sheet.columns.length}, minmax(150px, 1fr))` }}
                  >
                    <DataTableCell>{row.row_index + 1}</DataTableCell>
                    {sheet.columns.map((column, index) => (
                      <DataTableCell key={index}>
                        {row.data[column] || '—'}
                      </DataTableCell>
                    ))}
                  </DataTableRow>
                ))}
              </DataTableBody>
            </DataTable>
          </CardContent>
        </Card>

        {sheetData.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No data available</h3>
              <p className="text-muted-foreground">
                This sheet appears to be empty.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default SheetView;