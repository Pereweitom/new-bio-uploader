"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem("token");

    if (token) {
      // Redirect to dashboard if logged in
      router.push("/dashboard");
    } else {
      // Redirect to login if not logged in
      router.push("/login");
    }
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-500"></div>
    </div>
  );
}
