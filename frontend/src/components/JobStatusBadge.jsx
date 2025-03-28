import React from "react";
import { Badge } from "@/components/ui/badge";

export default function JobStatusBadge({ status }) {
  const getStatusConfig = (status) => {
    switch (status?.toLowerCase()) {
      case "running":
        return {
          className: "bg-blue-100 text-blue-800",
          label: "Running"
        };
      case "completed":
        return {
          className: "bg-green-100 text-green-800",
          label: "Completed"
        };
      case "failed":
        return {
          className: "bg-red-100 text-red-800",
          label: "Failed"
        };
      case "pending":
        return {
          className: "bg-yellow-100 text-yellow-800",
          label: "Pending"
        };
      default:
        return {
          className: "bg-gray-100 text-gray-800",
          label: status || "Unknown"
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <Badge className={config.className}>
      {config.label}
    </Badge>
  );
}