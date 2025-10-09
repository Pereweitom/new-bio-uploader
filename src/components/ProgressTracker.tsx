"use client";

import { useState, useEffect } from "react";

interface JobProgress {
  jobId: string;
  progress: number;
  totalRecords: number;
  processedRecords: number;
  insertedRecords: number;
  failedRecordsCount: number;
  currentRow: number;
  message: string;
  isComplete: boolean;
  startTime: string;
  endTime?: string;
}

interface ProgressTrackerProps {
  jobId: string;
  onComplete: () => void;
}

export default function ProgressTracker({
  jobId,
  onComplete,
}: ProgressTrackerProps) {
  const [progress, setProgress] = useState<JobProgress | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (!jobId) return;

    console.log(`📡 ProgressTracker connecting to job: ${jobId}`);

    // Create EventSource for SSE
    const es = new EventSource(`/api/progress?jobId=${jobId}`);

    es.onopen = () => {
      console.log(`✅ ProgressTracker connected to SSE for job: ${jobId}`);
      setConnected(true);
      setError("");
    };

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log(`📨 ProgressTracker received message:`, data);

        if (data.type === "connected") {
          console.log(`✅ SSE connection confirmed for job: ${jobId}`);
          setConnected(true);
        } else if (data.type === "waiting") {
          setConnected(true);
          // Show waiting message - create minimal progress object if none exists
          setProgress((prev) =>
            prev
              ? { ...prev, message: data.message }
              : {
                  jobId,
                  progress: 0,
                  totalRecords: 0,
                  processedRecords: 0,
                  insertedRecords: 0,
                  failedRecordsCount: 0,
                  currentRow: 0,
                  message: data.message,
                  isComplete: false,
                  startTime: new Date().toISOString(),
                }
          );
        } else if (data.type === "progress" || data.type === "complete") {
          setProgress(data);

          if (data.isComplete) {
            onComplete();
            es.close();
          }
        } else if (data.type === "error") {
          setError(data.message);
          es.close();
        }
      } catch (err) {
        console.error("Failed to parse SSE data:", err);
      }
    };

    es.onerror = () => {
      setError("Connection lost. Retrying...");
      setConnected(false);
    };

    // Cleanup on unmount
    return () => {
      es.close();
    };
  }, [jobId, onComplete]);

  const handleCancel = async () => {
    if (!progress || progress.isComplete) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/cancel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ jobId }),
      });

      if (!response.ok) {
        throw new Error("Failed to cancel job");
      }
    } catch {
      setError("Failed to cancel job");
    }
  };

  const handleDownloadErrors = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Authentication required");
        return;
      }

      const response = await fetch(`/api/download-errors?jobId=${jobId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `failed-records-${jobId}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const errorData = await response.json();
        setError(`Download failed: ${errorData.error}`);
      }
    } catch {
      console.error("Download failed");
      setError("Download failed. Please try again.");
    }
  };

  const formatDuration = (start: string, end?: string) => {
    const startTime = new Date(start);
    const endTime = end ? new Date(end) : new Date();
    const duration = Math.floor(
      (endTime.getTime() - startTime.getTime()) / 1000
    );

    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;

    return `${minutes}m ${seconds}s`;
  };

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center">
          <svg
            className="h-5 w-5 text-red-400 mr-2"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
          <h3 className="text-sm font-medium text-red-800">Error</h3>
        </div>
        <div className="mt-2 text-sm text-red-700">{error}</div>
      </div>
    );
  }

  if (!connected || !progress) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mr-3"></div>
          <span className="text-gray-600">
            {!connected
              ? "Connecting to progress stream..."
              : progress?.message || "Preparing to process file..."}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-medium text-gray-900">
          Processing Progress
        </h2>
        <div className="flex items-center space-x-2">
          <div
            className={`h-3 w-3 rounded-full ${
              connected ? "bg-green-400" : "bg-red-400"
            }`}
          ></div>
          <span className="text-sm text-gray-600">
            {connected ? "Connected" : "Disconnected"}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            Overall Progress
          </span>
          <span className="text-sm text-gray-600">
            {Math.round(progress.progress)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress.progress}%` }}
          ></div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900">
            {progress.totalRecords.toLocaleString()}
          </p>
          <p className="text-sm text-gray-600">Total Records</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-blue-600">
            {progress.processedRecords.toLocaleString()}
          </p>
          <p className="text-sm text-gray-600">Processed</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-green-600">
            {progress.insertedRecords.toLocaleString()}
          </p>
          <p className="text-sm text-gray-600">Inserted</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-red-600">
            {progress.failedRecordsCount.toLocaleString()}
          </p>
          <p className="text-sm text-gray-600">Failed</p>
        </div>
      </div>

      {/* Status Message */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <div className="flex items-center">
          {progress.isComplete ? (
            <svg
              className="h-5 w-5 text-green-500 mr-2"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
          ) : (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-500 mr-2"></div>
          )}
          <span className="text-sm text-gray-700">{progress.message}</span>
        </div>
      </div>

      {/* Timing Info */}
      <div className="flex items-center justify-between text-sm text-gray-600 mb-6">
        <span>Started: {new Date(progress.startTime).toLocaleString()}</span>
        <span>
          Duration: {formatDuration(progress.startTime, progress.endTime)}
        </span>
        {progress.endTime && (
          <span>Completed: {new Date(progress.endTime).toLocaleString()}</span>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-3">
        {!progress.isComplete && (
          <button
            onClick={handleCancel}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            Cancel Processing
          </button>
        )}

        {progress.isComplete && progress.failedRecordsCount > 0 && (
          <button
            onClick={handleDownloadErrors}
            className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            Download Failed Records
          </button>
        )}
      </div>
    </div>
  );
}
