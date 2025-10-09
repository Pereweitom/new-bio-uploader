"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import FileUpload from "@/components/FileUpload";
import ProgressTracker from "@/components/ProgressTracker";
import JobSummary from "@/components/JobSummary";

interface User {
  id: number;
  email: string;
  name: string;
  role: string;
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");

    if (!token || !userData) {
      router.push("/login");
      return;
    }

    try {
      setUser(JSON.parse(userData));
    } catch {
      console.error("Invalid user data");
      router.push("/login");
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/login");
  };

  const handleUploadStart = (jobId: string) => {
    console.log(`🆔 Dashboard received job ID: ${jobId}`);
    setCurrentJobId(jobId);
  };

  const handleJobComplete = () => {
    // Job completed
  };

  const handleNewUpload = () => {
    setCurrentJobId(null);
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Student Biodata Uploader
              </h1>
              <p className="text-sm text-gray-600">
                Welcome, {user.name} ({user.role})
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {!currentJobId ? (
            <div className="space-y-8">
              {/* Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-md p-6">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-5 w-5 text-blue-400"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">
                      CSV Upload Instructions
                    </h3>
                    <div className="mt-2 text-sm text-blue-700">
                      <ul className="list-disc list-inside space-y-1">
                        <li>Upload CSV files with student biodata</li>
                        <li>
                          Required columns: Matric Number, Last Name, First
                          Name, Gender, DoB, Year Of Entry, Department
                        </li>
                        <li>Maximum file size: 200MB</li>
                        <li>
                          Use dry-run mode to validate data before importing
                        </li>
                        <li>
                          Processing is done in batches for better performance
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* File Upload Component */}
              <FileUpload onUploadStart={handleUploadStart} />
            </div>
          ) : (
            <div className="space-y-8">
              {/* Progress Tracker */}
              <ProgressTracker
                jobId={currentJobId}
                onComplete={handleJobComplete}
              />

              {/* Job Summary */}
              <JobSummary jobId={currentJobId} onNewUpload={handleNewUpload} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
