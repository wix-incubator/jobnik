import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Play, RefreshCw, Loader2 } from "lucide-react";
import JobStatusBadge from "./JobStatusBadge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function JobDetailModal({ job, isOpen, onClose, onTriggerJob }) {
  const [logs, setLogs] = useState("");
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [logsError, setLogsError] = useState("");
  const [activeTab, setActiveTab] = useState("details");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setLogs("");
      setLogsError("");
      setSearchQuery("");
      setActiveTab("details");
    }
  }, [isOpen]);

  const fetchLogs = async () => {
    if (!job || !job.name) return;

    setIsLoadingLogs(true);
    setLogsError("");

    try {
      const url = `/api/job/logs?jobName=${encodeURIComponent(job.name)}&namespace=${encodeURIComponent(job.namespace)}`;

      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      });

      const isPodsCleanedUp = async (errorResponse) => {
        try {
          const errorData = await errorResponse.clone().json();
          return errorData.error && (
            errorData.error.includes("Failed to find pods") ||
            errorData.error.includes("pod has been cleaned up")
          );
        } catch (e) {
          return false;
        }
      };

      if (!response.ok) {
        if (await isPodsCleanedUp(response)) {
          let message;
          if (job.status === "Completed" || job.status === "Succeeded") {
            message = "Logs are no longer available as the job has completed and its pod has been cleaned up.";
          } else if (job.status === "Failed") {
            message = "Logs are no longer available as the job has failed and its pod has been cleaned up.";
          } else {
            message = "Logs are no longer available as the job's pod has been cleaned up.";
          }
          setLogs("");
          setLogsError("info:" + message);
          setIsLoadingLogs(false);
          return;
        }

        let errorMessage;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || `Failed to fetch logs (${response.status})`;
        } catch (e) {
          errorMessage = `Failed to fetch logs: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();

      if (data.logs) {
        setLogs(data.logs);
      } else if (data.error) {
        throw new Error(data.error);
      } else {
        setLogs("No logs available for this job yet");
      }
    } catch (error) {
      console.error("Error fetching logs:", error);
      setLogsError("error:" + error.message);
      setLogs("");
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const handleTabChange = (value) => {
    setActiveTab(value);
    if (value === "logs" && !logs && !isLoadingLogs) {
      fetchLogs();
    }
  };

  const isInfoMessage = logsError && logsError.startsWith("info:");
  const getLogsMessage = () =>
    logsError ? logsError.substring(logsError.indexOf(":") + 1) : "";

  const filteredLogs = logs
    .split("\n")
    .filter((line) =>
      line.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .join("\n");
  
    const highlightedLogs = logs
    .split("\n")
    .filter(line => line.toLowerCase().includes(searchQuery.toLowerCase()))
    .map(line => {
      if (!searchQuery) return line;
      const regex = new RegExp(`(${searchQuery})`, "gi");
      return line.replace(regex, "<mark>$1</mark>");
    })
    .join("\n");
  
  const formatDate = (dateString) =>
    dateString ? new Date(dateString).toLocaleString() : "N/A";

  const formatDuration = (startTime, completionTime) => {
    if (!startTime || !completionTime) return "N/A";
    const start = new Date(startTime);
    const end = new Date(completionTime);
    const durationMs = end - start;
    const minutes = Math.floor(durationMs / 60000);
    const seconds = Math.floor((durationMs % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  if (!job) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex justify-between items-center">
            <span className="truncate font-mono">{job.name}</span>
            <JobStatusBadge status={job.status} />
          </DialogTitle>
          <DialogDescription>
            Namespace: <span className="font-semibold">{job.namespace}</span>
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="logs">
              Logs
              {activeTab === "logs" && isLoadingLogs && (
                <Loader2 className="ml-2 h-3 w-3 animate-spin" />
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details">
            <ScrollArea className="max-h-[50vh]">
              <div className="space-y-6 py-2">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Status</h3>
                    <p className="mt-1">{job.status || "Unknown"}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Image</h3>
                    <p className="mt-1 font-mono text-sm truncate">
                      {job.containerImage || job.image || "default"}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Start Time</h3>
                    <p className="mt-1">{formatDate(job.startTime)}</p>
                  </div>
                  {job.completionTime && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Completion Time</h3>
                      <p className="mt-1">{formatDate(job.completionTime)}</p>
                    </div>
                  )}
                  {job.startTime && job.completionTime && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Duration</h3>
                      <p className="mt-1">{formatDuration(job.startTime, job.completionTime)}</p>
                    </div>
                  )}
                </div>

                {job.command && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Command</h3>
                    <pre className="mt-1 bg-gray-100 p-2 rounded font-mono text-sm overflow-auto">
                      {job.command}
                    </pre>
                  </div>
                )}

                {job.labels && Object.keys(job.labels).length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Labels</h3>
                    <div className="mt-1 grid grid-cols-2 gap-2">
                      {Object.entries(job.labels).map(([key, value]) => (
                        <div key={key} className="bg-gray-100 px-2 py-1 rounded text-sm">
                          <span className="font-medium">{key}:</span> {value}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {job.restarts !== undefined && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Restarts</h3>
                    <p className="mt-1">{job.restarts}</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="logs">
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <input
                  type="text"
                  placeholder="Search logs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="text-sm border px-2 py-1 rounded w-full focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchLogs}
                  disabled={isLoadingLogs}
                >
                  {isLoadingLogs ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-1" />
                  )}
                  Refresh
                </Button>
              </div>

              {logsError ? (
                <div className={`${isInfoMessage ? 'bg-blue-50 border-blue-200 text-blue-800' : 'bg-amber-50 border-amber-200 text-amber-800'} border p-4 rounded-md text-sm space-y-2`}>
                  <div className="flex items-start gap-2">
                    <div className="shrink-0 mt-0.5">{isInfoMessage ? 'ℹ️' : '⚠️'}</div>
                    <div>
                      <p className="font-medium mb-1">
                        {isInfoMessage ? 'Log Information' : 'Log Availability'}
                      </p>
                      <p>{getLogsMessage()}</p>
                      {job.completionTime && (
                        <p className="mt-2 text-sm">
                          Job completed at: {formatDate(job.completionTime)}
                        </p>
                      )}
                      {(job.status === "Completed" || job.status === "Succeeded" || job.status === "Failed") && (
                        <p className="mt-2 text-xs text-gray-600">
                          Note: Kubernetes automatically cleans up job pods after completion
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
<ScrollArea className="h-[40vh] border rounded-md">
  <pre
    className="p-4 font-mono text-sm whitespace-pre-wrap"
    dangerouslySetInnerHTML={{ __html: highlightedLogs }}
  />
</ScrollArea>

              )}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex justify-between items-center gap-2">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button
            onClick={() => {
              onTriggerJob(job.name, job.namespace);
              onClose();
            }}
            className="flex items-center gap-2"
          >
            <Play className="w-4 h-4" />
            Run Again
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
