"use client";

import { useState, useEffect } from "react";

interface JobSummaryProps {
  jobId: string;
  onNewUpload: () => void;
}

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

export default function JobSummary({ jobId, onNewUpload }: JobSummaryProps) {
  const [progress] = useState<JobProgress | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch final job progress
    const fetchProgress = async () => {
      try {
        const response = await fetch(`/api/progress?jobId=${jobId}`);
        if (response.ok) {
          // For completed jobs, we might need to get the final state differently
          // This is a simplified version - in production you might store final states
        }
      } catch (error) {
        console.error("Failed to fetch job progress:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProgress();
  }, [jobId]);

  const calculateSuccessRate = (inserted: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((inserted / total) * 100);
  };

  const formatDuration = (start: string, end?: string) => {
    const startTime = new Date(start);
    const endTime = end ? new Date(end) : new Date();
    const duration = Math.floor(
      (endTime.getTime() - startTime.getTime()) / 1000
    );

    const hours = Math.floor(duration / 3600);
    const minutes = Math.floor((duration % 3600) / 60);
    const seconds = duration % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    }
    return `${minutes}m ${seconds}s`;
  };

  const handleDownloadErrors = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        alert("Authentication required");
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
        const error = await response.json();
        alert(`Download failed: ${error.error}`);
      }
    } catch (error) {
      console.error("Download failed:", error);
      alert("Download failed. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-medium text-gray-900">
          Processing Summary
        </h2>
        <button
          onClick={onNewUpload}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
        >
          New Upload
        </button>
      </div>

      {progress ? (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg
                    className="h-8 w-8 text-green-600"
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
                <div className="ml-4">
                  <p className="text-sm font-medium text-green-800">
                    Successfully Inserted
                  </p>
                  <p className="text-2xl font-bold text-green-900">
                    {progress.insertedRecords.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg
                    className="h-8 w-8 text-red-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.864-.833-2.634 0L4.168 15.5c-.77.833.192 2.5 1.732 2.5z"
                    />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-red-800">
                    Failed Records
                  </p>
                  <p className="text-2xl font-bold text-red-900">
                    {progress.failedRecordsCount.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg
                    className="h-8 w-8 text-blue-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                    />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-blue-800">
                    Success Rate
                  </p>
                  <p className="text-2xl font-bold text-blue-900">
                    {calculateSuccessRate(
                      progress.insertedRecords,
                      progress.totalRecords
                    )}
                    %
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Stats */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-md font-medium text-gray-900 mb-3">
              Processing Details
            </h3>
            <dl className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-gray-500">Job ID</dt>
                <dd className="text-sm text-gray-900 font-mono">
                  {progress.jobId}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  Total Records
                </dt>
                <dd className="text-sm text-gray-900">
                  {progress.totalRecords.toLocaleString()}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  Processing Duration
                </dt>
                <dd className="text-sm text-gray-900">
                  {formatDuration(progress.startTime, progress.endTime)}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Status</dt>
                <dd className="text-sm text-gray-900">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      progress.isComplete
                        ? "bg-green-100 text-green-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {progress.isComplete ? "Completed" : "In Progress"}
                  </span>
                </dd>
              </div>
            </dl>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            {progress.failedRecordsCount > 0 && (
              <button
                onClick={handleDownloadErrors}
                className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-md text-sm font-medium inline-flex items-center"
              >
                <svg
                  className="h-4 w-4 mr-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                Download Failed Records
              </button>
            )}

            <button
              onClick={() => window.print()}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium inline-flex items-center"
            >
              <svg
                className="h-4 w-4 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                />
              </svg>
              Print Summary
            </button>
          </div>

          {/* Recommendations */}
          {progress.failedRecordsCount > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-yellow-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">
                    Failed Records Found
                  </h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>
                      {progress.failedRecordsCount} records failed to process.
                      Common reasons include:
                    </p>
                    <ul className="list-disc list-inside mt-1 space-y-1">
                      <li>Missing required fields</li>
                      <li>Invalid data formats</li>
                      <li>Duplicate matric numbers</li>
                      <li>Database lookup failures</li>
                    </ul>
                    <p className="mt-2">
                      Download the failed records file to review and correct the
                      data, then re-upload.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-8">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            No processing data available
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Unable to load job summary information.
          </p>
        </div>
      )}
    </div>
  );
}
