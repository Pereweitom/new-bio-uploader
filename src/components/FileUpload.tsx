"use client";

import { useState, useRef } from "react";

interface FileUploadProps {
  onUploadStart: (jobId: string) => void;
}

interface DryRunResult {
  success: boolean;
  summary: {
    totalRows: number;
    previewRows: number;
    validPreviewRows: number;
    invalidPreviewRows: number;
    hasMoreRows: boolean;
  };
  preview: Array<{
    rowNumber: number;
    data: Record<string, string>;
    errors: string[];
    isValid: boolean;
  }>;
  fileInfo: {
    name: string;
    size: number;
    type: string;
  };
}

export default function FileUpload({ onUploadStart }: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dryRun, setDryRun] = useState(true);
  const [batchSize, setBatchSize] = useState(500);
  const [loading, setLoading] = useState(false);
  const [dryRunResult, setDryRunResult] = useState<DryRunResult | null>(null);
  const [error, setError] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelection(files[0]);
    }
  };

  const handleFileSelection = (file: File) => {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("Please select a CSV file");
      return;
    }

    setSelectedFile(file);
    setError("");
    setDryRunResult(null);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelection(files[0]);
    }
  };

  const handleDryRun = async () => {
    if (!selectedFile) return;

    setLoading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("csvFile", selectedFile);
      formData.append("previewRows", "10");

      const token = localStorage.getItem("token");
      const response = await fetch("/api/dry-run", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Dry run failed");
        return;
      }

      setDryRunResult(data);
    } catch {
      setError("Network error during dry run");
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setLoading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("csvFile", selectedFile);
      formData.append("dryRun", dryRun.toString());
      formData.append("batchSize", batchSize.toString());

      const token = localStorage.getItem("token");
      console.log("🔑 Upload token check:", {
        hasToken: !!token,
        tokenPreview: token ? token.substring(0, 20) + "..." : "null",
        localStorage:
          typeof localStorage !== "undefined" ? "available" : "unavailable",
      });

      if (!token) {
        setError("No authentication token found. Please log in again.");
        setLoading(false);
        return;
      }

      // First test if API is reachable
      console.log("🏥 Testing API health...");
      try {
        const healthResponse = await fetch("/api/health");
        console.log("🏥 Health check:", {
          status: healthResponse.status,
          ok: healthResponse.ok
        });
      } catch (healthError) {
        console.error("❌ API health check failed:", healthError);
      }

      console.log("📡 Making upload request to /api/upload...");
      console.log("📦 FormData details:", {
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        dryRun,
        batchSize
      });
      
      // Add timeout to catch hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        console.error("❌ Request timed out after 60 seconds");
      }, 60000); // 60 second timeout
      
      const response = await fetch("/api/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      console.log("📡 Upload response received:", {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      });

      let data;
      try {
        data = await response.json();
        console.log("📊 Response data:", data);
      } catch (jsonError) {
        console.error("❌ Failed to parse response as JSON:", jsonError);
        setError(`Server returned invalid response. Status: ${response.status}`);
        return;
      }

      if (!response.ok) {
        console.error("❌ Upload request failed:", {
          status: response.status,
          error: data.error,
          details: data.details
        });
        setError(data.error || `Upload failed with status ${response.status}`);
        return;
      }

      console.log(`📤 FileUpload received response:`, data);
      console.log(`🆔 Starting job with ID: ${data.jobId}`);
      onUploadStart(data.jobId);
    } catch (error) {
      console.error("❌ Network/fetch error during upload:", error);
      
      let errorMessage = 'Unknown error';
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = 'Request timed out. Please try again with a smaller file.';
        } else if (error.message.includes('fetch')) {
          errorMessage = `Network error: ${error.message}`;
        } else {
          errorMessage = error.message;
        }
      }
      
      setError(`Upload failed: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    setDryRunResult(null);
    setError("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-lg font-medium text-gray-900 mb-6">
        Upload CSV File
      </h2>

      {/* File Drop Zone */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragOver
            ? "border-indigo-500 bg-indigo-50"
            : "border-gray-300 hover:border-gray-400"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {selectedFile ? (
          <div className="space-y-4">
            <div className="flex items-center justify-center">
              <svg
                className="h-12 w-12 text-green-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">
                {selectedFile.name}
              </p>
              <p className="text-sm text-gray-500">
                {formatFileSize(selectedFile.size)}
              </p>
            </div>
            <button
              onClick={clearFile}
              className="text-sm text-red-600 hover:text-red-700"
            >
              Remove file
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-center">
              <svg
                className="h-12 w-12 text-gray-400"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 48 48"
              >
                <path
                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div>
              <p className="text-lg font-medium text-gray-900">
                Drop your CSV file here
              </p>
              <p className="text-sm text-gray-500">or click to browse</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileInputChange}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Choose File
            </button>
          </div>
        )}
      </div>

      {/* Upload Options */}
      {selectedFile && (
        <div className="mt-6 space-y-4">
          <div className="flex items-center space-x-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={dryRun}
                onChange={(e) => setDryRun(e.target.checked)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">
                Dry run (validate only)
              </span>
            </label>

            <div className="flex items-center space-x-2">
              <label htmlFor="batchSize" className="text-sm text-gray-700">
                Batch size:
              </label>
              <input
                id="batchSize"
                type="number"
                min="100"
                max="2000"
                value={batchSize}
                onChange={(e) => setBatchSize(parseInt(e.target.value) || 500)}
                className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
              />
            </div>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={handleDryRun}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
            >
              {loading ? "Validating..." : "Validate CSV"}
            </button>

            <button
              onClick={handleUpload}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
            >
              {loading
                ? "Processing..."
                : dryRun
                ? "Start Dry Run"
                : "Start Upload"}
            </button>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Dry Run Results */}
      {dryRunResult && (
        <div className="mt-6 bg-gray-50 rounded-lg p-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Validation Results
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">
                {dryRunResult.summary.totalRows}
              </p>
              <p className="text-sm text-gray-600">Total Rows</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {dryRunResult.summary.validPreviewRows}
              </p>
              <p className="text-sm text-gray-600">Valid (Preview)</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">
                {dryRunResult.summary.invalidPreviewRows}
              </p>
              <p className="text-sm text-gray-600">Invalid (Preview)</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-600">
                {dryRunResult.summary.previewRows}
              </p>
              <p className="text-sm text-gray-600">Previewed</p>
            </div>
          </div>

          {dryRunResult.summary.invalidPreviewRows > 0 && (
            <div className="mt-4">
              <h4 className="text-md font-medium text-red-800 mb-2">
                Sample Validation Errors:
              </h4>
              <div className="max-h-40 overflow-y-auto">
                {dryRunResult.preview
                  .filter((row) => !row.isValid)
                  .slice(0, 5)
                  .map((row, index) => (
                    <div
                      key={index}
                      className="bg-red-50 border border-red-200 rounded p-2 mb-2"
                    >
                      <p className="text-sm font-medium text-red-800">
                        Row {row.rowNumber}:
                      </p>
                      <ul className="text-sm text-red-700 list-disc list-inside">
                        {row.errors.map((error, errorIndex) => (
                          <li key={errorIndex}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
