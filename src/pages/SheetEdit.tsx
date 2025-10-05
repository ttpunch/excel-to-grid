import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import Layout from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DataTable, DataTableHeader, DataTableBody, DataTableRow, DataTableCell } from "@/components/ui/data-table";
import { ArrowLeft, Save, Eye, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { createAuditLog } from "@/lib/auditLog";

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

const SheetEdit = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [sheet, setSheet] = useState<DataSheet | null>(null);
  const [sheetData, setSheetData] = useState<SheetData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Editable fields
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [editedData, setEditedData] = useState<Record<string, Record<string, any>>>({});

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
      const processedSheet = {
        ...sheetData,
        columns: Array.isArray(sheetData.columns) ? sheetData.columns : []
      };
      setSheet(processedSheet);
      setName(sheetData.name);
      setDescription(sheetData.description || "");

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

  const handleCellEdit = (rowId: string, column: string, value: any) => {
    setEditedData(prev => ({
      ...prev,
      [rowId]: {
        ...prev[rowId],
        [column]: value
      }
    }));
  };

  const getCellValue = (row: SheetData, column: string) => {
    if (editedData[row.id] && editedData[row.id].hasOwnProperty(column)) {
      return editedData[row.id][column];
    }
    return row.data[column] || '';
  };

  const handleSave = async () => {
    if (!sheet) return;
    
    setSaving(true);
    try {
      // Capture changes with old and new values
      const changes: Array<{
        row: number;
        column: string;
        oldValue: any;
        newValue: any;
      }> = [];

      // Update sheet metadata
      const { error: sheetError } = await supabase
        .from('data_sheets')
        .update({
          name,
          description: description || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', sheet.id);

      if (sheetError) throw sheetError;

      // Update edited cells
      for (const [rowId, cellChanges] of Object.entries(editedData)) {
        const originalRow = sheetData.find(row => row.id === rowId);
        if (originalRow) {
          // Track each cell change
          for (const [column, newValue] of Object.entries(cellChanges)) {
            const oldValue = originalRow.data[column];
            if (oldValue !== newValue) {
              changes.push({
                row: originalRow.row_index + 1,
                column,
                oldValue: oldValue || '(empty)',
                newValue: newValue || '(empty)'
              });
            }
          }

          const updatedData = { ...originalRow.data, ...cellChanges };
          
          const { error: dataError } = await supabase
            .from('sheet_data')
            .update({
              data: updatedData,
              updated_at: new Date().toISOString()
            })
            .eq('id', rowId);

          if (dataError) throw dataError;
        }
      }

      // Create audit log for edit with detailed changes
      await createAuditLog({
        action: 'edit',
        resourceType: 'sheet',
        resourceId: sheet.id,
        details: { 
          name, 
          cellsEdited: changes.length,
          changes: changes.slice(0, 10) // Store up to 10 changes to avoid huge payloads
        }
      });

      toast({
        title: "Success",
        description: "Sheet updated successfully",
      });

      // Clear edited data and refetch
      setEditedData({});
      fetchSheetDetails();
    } catch (error) {
      console.error('Error saving sheet:', error);
      toast({
        title: "Error",
        description: "Failed to save changes",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
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

  const hasChanges = name !== sheet.name || description !== (sheet.description || "") || Object.keys(editedData).length > 0;

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
                Edit Sheet
              </h1>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline"
              onClick={() => navigate(`/sheets/${sheet.id}/view`)}
            >
              <Eye className="h-4 w-4 mr-2" />
              View
            </Button>
            <Button 
              onClick={handleSave}
              disabled={!hasChanges || saving}
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>

        {/* Sheet Details */}
        <Card>
          <CardHeader>
            <CardTitle>Sheet Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Sheet name"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Description</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Sheet description (optional)"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Data Table */}
        <Card>
          <CardHeader>
            <CardTitle>Edit Data</CardTitle>
            <CardDescription>
              Click on any cell to edit its value. Changes are highlighted.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable>
              <DataTableHeader>
                <DataTableRow style={{ gridTemplateColumns: `50px repeat(${sheet.columns.length}, 1fr)` }}>
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
                    style={{ gridTemplateColumns: `50px repeat(${sheet.columns.length}, 1fr)` }}
                  >
                    <DataTableCell>{row.row_index + 1}</DataTableCell>
                    {sheet.columns.map((column, index) => {
                      const isEdited = editedData[row.id] && editedData[row.id].hasOwnProperty(column);
                      return (
                        <DataTableCell key={index}>
                          <Input
                            value={getCellValue(row, column)}
                            onChange={(e) => handleCellEdit(row.id, column, e.target.value)}
                            className={`border-0 bg-transparent p-1 h-auto focus:bg-background focus:border ${
                              isEdited ? 'bg-primary/5 border-primary' : ''
                            }`}
                          />
                        </DataTableCell>
                      );
                    })}
                  </DataTableRow>
                ))}
              </DataTableBody>
            </DataTable>
          </CardContent>
        </Card>

        {hasChanges && (
          <Card className="bg-primary/5 border-primary">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Unsaved Changes</h4>
                  <p className="text-sm text-muted-foreground">
                    You have unsaved changes. Make sure to save before leaving.
                  </p>
                </div>
                <Button onClick={handleSave} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "Saving..." : "Save Now"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default SheetEdit;