import React, { useState, useEffect } from "react";
import Layout from "../components/Layout";
import JobsList from "../components/JobsList";
import TriggerJobForm from "../components/TriggerJobForm";
import APIConfig from "../components/APIConfig";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Info, Copy } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';  // Import toast styles

export default function Jobs() {
  const [jobs, setJobs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingJobs, setIsLoadingJobs] = useState(false);
  const [apiUrl, setApiUrl] = useState(localStorage.getItem('k8sJobManagerApiUrl') || "http://localhost:8080");
  const [connectionStatus, setConnectionStatus] = useState(false);
  const [pagination, setPagination] = useState({ total: 0, limit: 10, offset: 0, count: 0 });
  const [copied, setCopied] = useState("");
  const [jobSearch, setJobSearch] = useState("");

  const handleCopy = (text, label) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    toast.success('Command copied successfully!');
  };

  const filteredJobs = jobs.filter(job => job.name?.toLowerCase().includes(jobSearch.toLowerCase()));

  const jobnikBackendCommand = `kubectl apply -f - <<EOF
apiVersion: v1
kind: Service
metadata:
  name: jobnik-svc
  namespace: default
spec:
  selector:
    app: jobnik
  ports:
    - port: 8080
      targetPort: 8080
      name: http-backend
  type: ClusterIP
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: jobnik
  namespace: default
  labels:
    app: jobnik
    version: "1.0.0"
spec:
  replicas: 2
  selector:
    matchLabels:
      app: jobnik
  template:
    metadata:
      labels:
        app: jobnik
        version: "1.0.0"
    spec:
      containers:
        - name: jobnik
          image: pavelzagalsky/jobnik:latest
          imagePullPolicy: Always
          ports:
            - containerPort: 8080
          securityContext:
            runAsUser: 1001
            runAsGroup: 1001
            allowPrivilegeEscalation: false
          resources:
            requests:
              memory: "128Mi"
              cpu: "64m"
            limits:
              memory: "256Mi"
              cpu: "128m"
          livenessProbe:
            httpGet:
              path: /api/healthz
              port: 8080
            initialDelaySeconds: 20
            periodSeconds: 10
            timeoutSeconds: 3
          readinessProbe:
            httpGet:
              path: /api/healthz
              port: 8080
            initialDelaySeconds: 10
            periodSeconds: 10
            timeoutSeconds: 3
          env:
            - name: SERVICE_NAME
              value: "jobnik"
            - name: PORT
              value: "8080"
EOF`;

  const jobnikUICommand =`kubectl apply -f - <<EOF
apiVersion: v1
kind: Service
metadata:
  name: jobnik-ui-svc
  namespace: default
spec:
  selector:
    app: jobnik-ui
  ports:
    - port: 3000
      targetPort: 3000
      name: http-ui
  type: ClusterIP
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: jobnik-ui
  namespace: default
  labels:
    app: jobnik-ui
    version: "1.0.0"
spec:
  replicas: 1
  selector:
    matchLabels:
      app: jobnik-ui
  template:
    metadata:
      labels:
        app: jobnik-ui
        version: "1.0.0"
    spec:
      containers:
        - name: jobnik-ui
          image: pavelzagalsky/jobnik-ui:latest
          imagePullPolicy: Always
          securityContext:
            runAsUser: 1001
            runAsGroup: 1001
            allowPrivilegeEscalation: false
          resources:
            requests:
              memory: "128Mi"
              cpu: "64m"
            limits:
              memory: "256Mi"
              cpu: "128m"
EOF`;

  const fetchJobs = async (offset = 0) => {
    if (isLoadingJobs || !connectionStatus) return;
    setIsLoadingJobs(true);
    try {
      const response = await fetch(`/api/jobs?limit=${pagination.limit}&offset=${offset}`, {
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      const jobsArray = Array.isArray(data.jobs) ? data.jobs : (Array.isArray(data) ? data : []);
      setJobs(jobsArray);
      setPagination({ total: jobsArray.length * 2, limit: pagination.limit, offset, count: jobsArray.length });
    } catch {
      setJobs([]);
      setPagination({ total: 0, limit: 10, offset: 0, count: 0 });
    } finally {
      setIsLoadingJobs(false);
    }
  };

  useEffect(() => {
    if (apiUrl) localStorage.setItem('k8sJobManagerApiUrl', apiUrl);
  }, [apiUrl]);

  useEffect(() => {
    if (connectionStatus) {
      fetchJobs();
      const interval = setInterval(() => fetchJobs(pagination.offset), 60000);
      return () => clearInterval(interval);
    }
  }, [connectionStatus, apiUrl]);

  const handleTriggerJob = async (jobData) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/job`, {
        method: "POST",
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(jobData),
      });
      if (!response.ok) throw new Error("Failed to trigger job");
      await response.json();
      fetchJobs(pagination.offset);
      toast.success('Job triggered successfully!');
    } catch (error) {
      toast.error('Failed to trigger job!');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickTrigger = (jobName, namespace) => {
    handleTriggerJob({ jobName, namespace, envVars: {}, args: [] });
    toast.info(`Triggering job: ${jobName}`);
  };

  const handleConnectionTest = async (status) => {
    setConnectionStatus(status);
    if (status) {
      try {
        const response = await fetch(`/api/healthz`, { method: "GET" });
        if (!response.ok) throw new Error("Connection failed");
        fetchJobs();
      } catch {
        setJobs([]);
      }
    } else {
      setJobs([]);
    }
  };

  const handlePageChange = async (newOffset) => {
    await fetchJobs(newOffset);
  };

  return (
    <div className="space-y-4 px-4 py-2 max-w-screen-xl mx-auto">
      {/* Toast Notifications Container */}
      <ToastContainer />

      {/* Centered Title */}
      <div className="w-full flex justify-center">
        <h1 className="text-xl font-semibold tracking-tight">Jobnik - Kubernetes Jobs Manager</h1>
      </div>

      {/* Right-aligned info button */}
      <div className="flex justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon">
              <Info className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem className="flex flex-col items-start">
              <span className="font-medium">About</span>
              <span className="text-xs text-muted-foreground">Created by Pavel Zagalsky</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <APIConfig apiUrl={apiUrl} onApiUrlChange={setApiUrl} onTestConnection={handleConnectionTest} />

      <Tabs defaultValue="jobs" className="space-y-4">
        <TabsList className="flex gap-2">
          <TabsTrigger value="jobs">Jobs</TabsTrigger>
          <TabsTrigger value="trigger">Trigger</TabsTrigger>
          <TabsTrigger value="install">Install</TabsTrigger>
        </TabsList>

        <TabsContent value="jobs">
          <div className="space-y-2">
            <input
              type="text"
              placeholder="Search jobs..."
              value={jobSearch}
              onChange={(e) => setJobSearch(e.target.value)}
              className="w-full border px-3 py-2 rounded-md text-sm shadow-sm"
            />
            <JobsList
              jobs={filteredJobs}
              onTriggerJob={handleQuickTrigger}
              isLoading={isLoadingJobs}
              pagination={pagination}
              onPageChange={handlePageChange}
            />
          </div>
        </TabsContent>

        <TabsContent value="trigger">
          <TriggerJobForm
            onSubmit={handleTriggerJob}
            isLoading={isLoading}
            disabled={!connectionStatus}
            existingJobs={jobs}
          />
        </TabsContent>

        <TabsContent value="install">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-gray-50 border rounded-lg p-4 space-y-2">
              <h2 className="text-md font-semibold">Install Backend</h2>
              <p className="text-xs text-muted-foreground">Apply this command to install Jobnik backend:</p>
              <div className="flex items-start gap-2">
                <Textarea
                  readOnly
                  value={jobnikBackendCommand}
                  className="resize-none font-mono text-xs p-2 rounded-md border h-[250px]"
                />
                <Button size="icon" variant="outline" onClick={() => handleCopy(jobnikBackendCommand, "Backend")}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="bg-gray-50 border rounded-lg p-4 space-y-2">
              <h2 className="text-md font-semibold">Install UI</h2>
              <p className="text-xs text-muted-foreground">Apply this command to install Jobnik UI:</p>
              <div className="flex items-start gap-2">
                <Textarea
                  readOnly
                  value={jobnikUICommand}
                  className="resize-none font-mono text-xs p-2 rounded-md border h-[250px]"
                />
                <Button size="icon" variant="outline" onClick={() => handleCopy(jobnikUICommand, "UI")}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
