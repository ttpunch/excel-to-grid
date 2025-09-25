import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { UploadZone } from "@/components/ui/upload-zone";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, AlertCircle, FileSpreadsheet, ArrowRight, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import * as XLSX from 'xlsx';

interface ParsedFile {
  name: string;
  columns: string[];
  data: any[];
  originalFile: File;
}

const UploadInterface = () => {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState<'upload' | 'configure' | 'processing'>('upload');
  const [parsedFiles, setParsedFiles] = useState<ParsedFile[]>([]);
  const [selectedColumns, setSelectedColumns] = useState<Record<string, string[]>>({});
  const [customSheetNames, setCustomSheetNames] = useState<Record<string, string>>({});
  const { toast } = useToast();
  const { user } = useAuth();

  const processExcelFile = async (file: File): Promise<ParsedFile> => {
    return new Promise<ParsedFile>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          if (jsonData.length === 0) {
            reject(new Error('File is empty'));
            return;
          }
          
          const columns = jsonData[0] as string[];
          const rows = jsonData.slice(1);
          
          resolve({
            name: file.name.replace(/\.[^/.]+$/, ""),
            columns: columns.filter(col => col && col.toString().trim() !== ""),
            data: rows,
            originalFile: file
          });
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  };

  const handleFileSelect = async (files: FileList) => {
    if (files.length === 0) return;
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to upload files",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadStatus('idle');

    try {
      const fileList = Array.from(files);
      const parsed: ParsedFile[] = [];

      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        setUploadProgress((i / fileList.length) * 100);
        
        const fileData = await processExcelFile(file);
        parsed.push(fileData);
      }

      setParsedFiles(parsed);
      
      // Initialize selected columns (all selected by default) and custom names
      const initialSelectedColumns: Record<string, string[]> = {};
      const initialCustomNames: Record<string, string> = {};
      
      parsed.forEach(file => {
        initialSelectedColumns[file.name] = [...file.columns];
        initialCustomNames[file.name] = file.name;
      });
      
      setSelectedColumns(initialSelectedColumns);
      setCustomSheetNames(initialCustomNames);
      setCurrentStep('configure');
      setUploadProgress(100);

    } catch (error) {
      console.error('File parsing error:', error);
      setUploadStatus('error');
      toast({
        title: "File Parsing Failed",
        description: error instanceof Error ? error.message : "There was an error reading your files",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleColumnToggle = (fileName: string, columnName: string, checked: boolean) => {
    setSelectedColumns(prev => ({
      ...prev,
      [fileName]: checked 
        ? [...prev[fileName], columnName]
        : prev[fileName].filter(col => col !== columnName)
    }));
  };

  const handleSelectAllColumns = (fileName: string, checked: boolean) => {
    const file = parsedFiles.find(f => f.name === fileName);
    if (!file) return;
    
    setSelectedColumns(prev => ({
      ...prev,
      [fileName]: checked ? [...file.columns] : []
    }));
  };

  const handleSheetNameChange = (fileName: string, newName: string) => {
    setCustomSheetNames(prev => ({
      ...prev,
      [fileName]: newName
    }));
  };

  const handleUploadToDatabase = async () => {
    if (!user) return;

    setCurrentStep('processing');
    setIsUploading(true);
    setUploadProgress(0);
    setUploadStatus('idle');

    try {
      const successfulUploads: string[] = [];

      for (let i = 0; i < parsedFiles.length; i++) {
        const file = parsedFiles[i];
        const selectedCols = selectedColumns[file.name] || [];
        const customName = customSheetNames[file.name] || file.name;
        
        if (selectedCols.length === 0) {
          toast({
            title: "Warning",
            description: `Skipping "${file.name}" - no columns selected`,
            variant: "destructive",
          });
          continue;
        }

        setUploadProgress((i / parsedFiles.length) * 50);

        // Filter data to only include selected columns
        const filteredData = file.data.map(row => {
          const filteredRow: any = {};
          selectedCols.forEach((col, index) => {
            const colIndex = file.columns.indexOf(col);
            if (colIndex !== -1) {
              filteredRow[col] = row[colIndex] || null;
            }
          });
          return filteredRow;
        });

        // Create data sheet record
        const { data: sheet, error: sheetError } = await supabase
          .from('data_sheets')
          .insert({
            name: customName,
            description: `Uploaded from ${file.originalFile.name}`,
            columns: selectedCols,
            total_rows: filteredData.length,
            uploaded_by: user.id
          })
          .select()
          .single();

        if (sheetError) throw sheetError;

        // Insert sheet data in batches
        const batchSize = 100;
        for (let j = 0; j < filteredData.length; j += batchSize) {
          const batch = filteredData.slice(j, j + batchSize);
          const sheetDataRows = batch.map((row, index) => ({
            sheet_id: sheet.id,
            row_index: j + index,
            data: row
          }));

          const { error: dataError } = await supabase
            .from('sheet_data')
            .insert(sheetDataRows);

          if (dataError) throw dataError;
        }

        successfulUploads.push(customName);
        setUploadProgress(50 + ((i + 1) / parsedFiles.length) * 50);
      }

      setUploadedFiles(successfulUploads);
      setUploadStatus('success');
      toast({
        title: "Upload Successful",
        description: `${successfulUploads.length} sheet(s) uploaded successfully`,
      });

    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus('error');
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "There was an error uploading your data",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const resetUpload = () => {
    setCurrentStep('upload');
    setParsedFiles([]);
    setSelectedColumns({});
    setCustomSheetNames({});
    setUploadProgress(0);
    setUploadStatus('idle');
    setUploadedFiles([]);
  };

  if (currentStep === 'configure') {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold bg-gradient-hero bg-clip-text text-transparent">
            Configure Your Upload
          </h1>
          <p className="text-muted-foreground">
            Select columns and customize sheet names before uploading to database
          </p>
        </div>

        {parsedFiles.map((file, fileIndex) => (
          <Card key={fileIndex} className="shadow-elegant">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileSpreadsheet className="h-5 w-5 text-primary" />
                    {file.originalFile.name}
                  </CardTitle>
                  <CardDescription>
                    {file.columns.length} columns, {file.data.length} rows
                  </CardDescription>
                </div>
                <div className="text-right">
                  <Label htmlFor={`sheet-name-${fileIndex}`} className="text-sm font-medium">
                    Sheet Name:
                  </Label>
                  <Input
                    id={`sheet-name-${fileIndex}`}
                    value={customSheetNames[file.name] || file.name}
                    onChange={(e) => handleSheetNameChange(file.name, e.target.value)}
                    className="mt-1 w-48"
                    placeholder="Enter sheet name"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">Select Columns to Include:</Label>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={`select-all-${fileIndex}`}
                    checked={selectedColumns[file.name]?.length === file.columns.length}
                    onCheckedChange={(checked) => handleSelectAllColumns(file.name, checked as boolean)}
                  />
                  <Label 
                    htmlFor={`select-all-${fileIndex}`} 
                    className="text-sm font-medium cursor-pointer"
                  >
                    Select All ({selectedColumns[file.name]?.length || 0}/{file.columns.length})
                  </Label>
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-64 overflow-y-auto border rounded-lg p-4">
                {file.columns.map((column, colIndex) => (
                  <div key={colIndex} className="flex items-center space-x-2">
                    <Checkbox
                      id={`col-${fileIndex}-${colIndex}`}
                      checked={selectedColumns[file.name]?.includes(column) || false}
                      onCheckedChange={(checked) => handleColumnToggle(file.name, column, checked as boolean)}
                    />
                    <Label 
                      htmlFor={`col-${fileIndex}-${colIndex}`}
                      className="text-sm cursor-pointer truncate"
                      title={column}
                    >
                      {column}
                    </Label>
                  </div>
                ))}
              </div>

              {selectedColumns[file.name]?.length === 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Please select at least one column to include in your data sheet.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        ))}

        <div className="flex justify-between">
          <Button variant="outline" onClick={resetUpload}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Upload
          </Button>
          <Button 
            variant="gradient" 
            onClick={handleUploadToDatabase}
            disabled={parsedFiles.every(file => (selectedColumns[file.name]?.length || 0) === 0)}
          >
            Upload to Database
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    );
  }

  if (currentStep === 'processing') {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold bg-gradient-hero bg-clip-text text-transparent">
            Uploading to Database
          </h1>
          <p className="text-muted-foreground">
            Processing and saving your selected data...
          </p>
        </div>

        <Card className="shadow-elegant">
          <CardContent className="p-6 space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Uploading data...</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="w-full" />
            </div>

            {uploadStatus === 'success' && (
              <Alert className="border-success text-success">
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <div>
                    <p className="font-medium mb-2">Upload completed successfully!</p>
                    {uploadedFiles.map((fileName, index) => (
                      <p key={index} className="text-sm">• {fileName}</p>
                    ))}
                    <p className="text-sm mt-2">Your data is now available in the Data Sheets section.</p>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {uploadStatus === 'error' && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Upload failed. Please try again or contact support if the problem persists.
                </AlertDescription>
              </Alert>
            )}

            {uploadStatus === 'success' && (
              <Button variant="gradient" onClick={resetUpload} className="w-full">
                Upload More Files
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold bg-gradient-hero bg-clip-text text-transparent">
          Upload Excel Data
        </h1>
        <p className="text-muted-foreground">
          Upload your Excel files to start managing and analyzing your data
        </p>
      </div>

      <Card className="shadow-elegant">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            File Upload
          </CardTitle>
          <CardDescription>
            Select Excel files (.xlsx, .xls) or CSV files to upload. Maximum file size is 10MB.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <UploadZone
            onFileSelect={handleFileSelect}
            multiple
            acceptedTypes=".xlsx,.xls,.csv"
            maxSize={10}
          />

          {isUploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Processing files...</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="w-full" />
            </div>
          )}

          {uploadStatus === 'error' && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                File processing failed. Please check your files and try again.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* File Requirements */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">File Requirements</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium mb-2">Supported Formats:</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Excel (.xlsx, .xls)</li>
                <li>• CSV (.csv)</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">File Limits:</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Maximum size: 10MB per file</li>
                <li>• Multiple files supported</li>
              </ul>
            </div>
          </div>
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <h4 className="font-medium mb-2">Upload Process:</h4>
            <ol className="space-y-1 text-sm text-muted-foreground">
              <li>1. Select and upload your Excel files</li>
              <li>2. Choose which columns to include in your database</li>
              <li>3. Customize sheet names (optional)</li>
              <li>4. Upload selected data to database</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UploadInterface;