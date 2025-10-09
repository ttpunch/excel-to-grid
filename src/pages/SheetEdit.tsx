import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import Layout from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DataTable, DataTableHeader, DataTableBody, DataTableRow, DataTableCell } from "@/components/ui/data-table";
import { ArrowLeft, Save, Eye, Trash2, Plus } from "lucide-react";
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
  
  // Add record functionality
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRecordData, setNewRecordData] = useState<Record<string, any>>({});

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

  const handleAddRecord = () => {
    setShowAddForm(true);
    // Initialize new record with empty values for all columns
    const initialData: Record<string, any> = {};
    if (sheet?.columns) {
      sheet.columns.forEach((column: string) => {
        initialData[column] = '';
      });
    }
    setNewRecordData(initialData);
  };

  const handleNewRecordFieldChange = (column: string, value: any) => {
    setNewRecordData(prev => ({
      ...prev,
      [column]: value
    }));
  };

  const handleSaveNewRecord = async () => {
    if (!sheet) return;

    try {
      // Get the next row index
      const nextRowIndex = sheetData.length > 0 ? Math.max(...sheetData.map(row => row.row_index)) + 1 : 0;

      // Insert new record
      const { data: newRow, error: insertError } = await supabase
        .from('sheet_data')
        .insert({
          sheet_id: sheet.id,
          row_index: nextRowIndex,
          data: newRecordData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Update total_rows count
      const { error: updateError } = await supabase
        .from('data_sheets')
        .update({
          total_rows: sheet.total_rows + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', sheet.id);

      if (updateError) throw updateError;

      // Create audit log
      await createAuditLog({
        action: 'add_record',
        resourceType: 'sheet',
        resourceId: sheet.id,
        details: { 
          name: sheet.name,
          newRowIndex: nextRowIndex,
          columnsWithData: Object.keys(newRecordData).filter(key => newRecordData[key] !== '')
        }
      });

      toast({
        title: "Success",
        description: "New record added successfully",
      });

      // Reset form and refresh data
      setShowAddForm(false);
      setNewRecordData({});
      fetchSheetDetails();
    } catch (error) {
      console.error('Error adding record:', error);
      toast({
        title: "Error",
        description: "Failed to add new record",
        variant: "destructive",
      });
    }
  };

  const handleCancelAddRecord = () => {
    setShowAddForm(false);
    setNewRecordData({});
  };

  const handleDeleteRow = async (rowId: string, rowIndex: number) => {
    if (!sheet) return;

    const confirmMessage = `Are you sure you want to delete row ${rowIndex + 1}? This action cannot be undone.`;
    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      // Delete the row from database
      const { error: deleteError } = await supabase
        .from('sheet_data')
        .delete()
        .eq('id', rowId);

      if (deleteError) throw deleteError;

      // Update total_rows count
      const { error: updateError } = await supabase
        .from('data_sheets')
        .update({
          total_rows: sheet.total_rows - 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', sheet.id);

      if (updateError) throw updateError;

      // Update row indices for remaining rows (shift down)
      const remainingRows = sheetData.filter(row => row.row_index > rowIndex);
      if (remainingRows.length > 0) {
        for (const row of remainingRows) {
          const { error: indexError } = await supabase
            .from('sheet_data')
            .update({
              row_index: row.row_index - 1,
              updated_at: new Date().toISOString()
            })
            .eq('id', row.id);

          if (indexError) throw indexError;
        }
      }

      // Create audit log
      await createAuditLog({
        action: 'delete_row',
        resourceType: 'sheet',
        resourceId: sheet.id,
        details: { 
          name: sheet.name,
          deletedRowIndex: rowIndex,
          newTotalRows: sheet.total_rows - 1
        }
      });

      toast({
        title: "Success",
        description: `Row ${rowIndex + 1} deleted successfully`,
      });

      // Refresh data
      fetchSheetDetails();
    } catch (error) {
      console.error('Error deleting row:', error);
      toast({
        title: "Error",
        description: "Failed to delete row",
        variant: "destructive",
      });
    }
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

  const hasChanges = name !== sheet.name || description !== (sheet.description || "") || Object.keys(editedData).length > 0 || showAddForm;

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
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Edit Data</CardTitle>
                <CardDescription>
                  Click on any cell to edit its value. Changes are highlighted.
                </CardDescription>
              </div>
              <Button 
                onClick={handleAddRecord}
                variant="outline"
                size="sm"
                disabled={showAddForm}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Record
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable>
              <DataTableHeader>
                <DataTableRow style={{ gridTemplateColumns: `50px repeat(${sheet.columns.length}, 1fr) 60px` }}>
                  <DataTableCell header>#</DataTableCell>
                  {sheet.columns.map((column, index) => (
                    <DataTableCell key={index} header>
                      {column}
                    </DataTableCell>
                  ))}
                  <DataTableCell header className="text-center">Action</DataTableCell>
                </DataTableRow>
              </DataTableHeader>
              <DataTableBody>
                {/* Add new record form */}
                {showAddForm && (
                  <DataTableRow 
                    style={{ gridTemplateColumns: `50px repeat(${sheet.columns.length}, 1fr) 60px` }}
                    className="bg-primary/5 border-primary"
                  >
                    <DataTableCell>
                      <span className="text-primary font-medium">New</span>
                    </DataTableCell>
                    {sheet.columns.map((column, index) => (
                      <DataTableCell key={index}>
                        <Input
                          value={newRecordData[column] || ''}
                          onChange={(e) => handleNewRecordFieldChange(column, e.target.value)}
                          placeholder={`Enter ${column}`}
                          className="border-primary bg-background focus:border-primary"
                        />
                      </DataTableCell>
                    ))}
                    <DataTableCell className="text-center">
                      <span className="text-muted-foreground text-xs">New</span>
                    </DataTableCell>
                  </DataTableRow>
                )}
                
                {sheetData.map((row) => (
                  <DataTableRow 
                    key={row.id}
                    style={{ gridTemplateColumns: `50px repeat(${sheet.columns.length}, 1fr) 60px` }}
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
                    <DataTableCell className="text-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteRow(row.id, row.row_index)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </DataTableCell>
                  </DataTableRow>
                ))}
              </DataTableBody>
            </DataTable>
          </CardContent>
          
          {/* Add record form actions */}
          {showAddForm && (
            <CardContent className="pt-4 border-t bg-primary/5">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-primary">Add New Record</h4>
                  <p className="text-sm text-muted-foreground">
                    Fill in the fields above and save to add a new record to this sheet.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleCancelAddRecord}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveNewRecord}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Record
                  </Button>
                </div>
              </div>
            </CardContent>
          )}
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