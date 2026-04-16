"use client";

import { ProtectedRoute } from "@/components/protected-route";

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <div className="flex flex-1 items-center justify-center p-6">
        <p className="text-muted-foreground">
          Dashboard Page Placeholder
        </p>
      </div>
    </ProtectedRoute>
  );
}
