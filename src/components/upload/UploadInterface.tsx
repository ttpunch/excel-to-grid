import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UploadZone } from "@/components/ui/upload-zone";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, AlertCircle, FileSpreadsheet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const UploadInterface = () => {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const { toast } = useToast();

  const handleFileSelect = async (files: FileList) => {
    if (files.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);
    setUploadStatus('idle');

    try {
      // Simulate file processing
      for (let i = 0; i <= 100; i += 10) {
        setUploadProgress(i);
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // Simulate successful upload
      setUploadStatus('success');
      toast({
        title: "Upload Successful",
        description: `${files.length} file(s) processed successfully`,
      });

    } catch (error) {
      setUploadStatus('error');
      toast({
        title: "Upload Failed",
        description: "There was an error processing your files",
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
                Files uploaded successfully! Your data is now available in the dashboard.
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