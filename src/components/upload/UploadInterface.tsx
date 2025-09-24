import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UploadZone } from "@/components/ui/upload-zone";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, AlertCircle, FileSpreadsheet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import * as XLSX from 'xlsx';

const UploadInterface = () => {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const { toast } = useToast();
  const { user } = useAuth();

  const processExcelFile = async (file: File) => {
    return new Promise<{name: string, columns: string[], data: any[]}>((resolve, reject) => {
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
            columns: columns,
            data: rows
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
    setUploadedFiles([]);

    try {
      const fileList = Array.from(files);
      const successfulUploads: string[] = [];

      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        setUploadProgress((i / fileList.length) * 50);

        // Process Excel file
        const fileData = await processExcelFile(file);
        
        // Create data sheet record
        const { data: sheet, error: sheetError } = await supabase
          .from('data_sheets')
          .insert({
            name: fileData.name,
            description: `Uploaded from ${file.name}`,
            columns: fileData.columns,
            total_rows: fileData.data.length,
            uploaded_by: user.id
          })
          .select()
          .single();

        if (sheetError) throw sheetError;

        // Insert sheet data in batches
        const batchSize = 100;
        for (let j = 0; j < fileData.data.length; j += batchSize) {
          const batch = fileData.data.slice(j, j + batchSize);
          const sheetDataRows = batch.map((row, index) => ({
            sheet_id: sheet.id,
            row_index: j + index,
            data: Object.fromEntries(
              fileData.columns.map((col, colIndex) => [col, row[colIndex] || null])
            )
          }));

          const { error: dataError } = await supabase
            .from('sheet_data')
            .insert(sheetDataRows);

          if (dataError) throw dataError;
        }

        successfulUploads.push(fileData.name);
        setUploadProgress(50 + ((i + 1) / fileList.length) * 50);
      }

      setUploadedFiles(successfulUploads);
      setUploadStatus('success');
      toast({
        title: "Upload Successful",
        description: `${successfulUploads.length} file(s) processed successfully`,
      });

    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus('error');
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "There was an error processing your files",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

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

          {uploadStatus === 'success' && (
            <Alert className="border-success text-success">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <div>
                  <p className="font-medium mb-2">Files uploaded successfully!</p>
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
                Upload failed. Please check your files and try again.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <Button variant="gradient" className="flex-1" disabled={isUploading}>
              Process Files
            </Button>
            <Button variant="outline" disabled={isUploading}>
              Clear Selection
            </Button>
          </div>
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
        </CardContent>
      </Card>
    </div>
  );
};

export default UploadInterface;