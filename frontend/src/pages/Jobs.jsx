
import React, { useState, useEffect } from "react";
import Layout from "../components/Layout";
import JobsList from "../components/JobsList";
import TriggerJobForm from "../components/TriggerJobForm";
import APIConfig from "../components/APIConfig";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Info } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Jobs() {
  const [jobs, setJobs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingJobs, setIsLoadingJobs] = useState(false);
  const [apiUrl, setApiUrl] = useState(localStorage.getItem('k8sJobManagerApiUrl') || "http://localhost:8080");
  const [connectionStatus, setConnectionStatus] = useState(false);
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 10,
    offset: 0,
    count: 0
  });

  const fetchJobs = async (offset = 0) => {
    if (isLoadingJobs || !connectionStatus) {
      console.log('Skipping fetch: isLoadingJobs=', isLoadingJobs, 'connectionStatus=', connectionStatus);
      return;
    }

    setIsLoadingJobs(true);
    try {
      const url = `${apiUrl}/jobs?limit=${pagination.limit}&offset=${offset}`;
      console.log('Fetching jobs from:', url);

      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('API Response:', data);

      const jobsArray = Array.isArray(data.jobs) ? data.jobs : 
                       Array.isArray(data) ? data : 
                       [];

      console.log('Processed jobs array:', jobsArray);

      setJobs(jobsArray);
      setPagination({
        total: jobsArray.length * 2, // If server doesn't provide total, estimate it
        limit: pagination.limit,
        offset: offset,
        count: jobsArray.length
      });
    } catch (error) {
      console.error("Error fetching jobs:", error);
      setJobs([]);
      setPagination({
        total: 0,
        limit: 10,
        offset: 0,
        count: 0
      });
    } finally {
      setIsLoadingJobs(false);
    }
  };

  useEffect(() => {
    if (apiUrl) {
      localStorage.setItem('k8sJobManagerApiUrl', apiUrl);
    }
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
      const response = await fetch(`${apiUrl}/job`, {
        method: "POST",
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(jobData),
      });

      if (!response.ok) {
        const errText = await response.text();
        let errMsg = `HTTP error! status: ${response.status}`;
        try {
          const errData = JSON.parse(errText);
          errMsg = errData.error || errMsg;
        } catch (e) {
          if (errText) errMsg = errText;
        }
        throw new Error(errMsg);
      }

      const data = await response.json();
      console.log('Job triggered successfully:', data);
      fetchJobs(pagination.offset);
    } catch (error) {
      console.error("Failed to trigger job:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickTrigger = (jobName, namespace) => {
    console.log(`Triggering "${jobName}" in namespace "${namespace}"`);
    handleTriggerJob({
      jobName,
      namespace,
      envVars: {},
      args: []
    });
  };

  const handleConnectionTest = async (status) => {
    setConnectionStatus(status);
    if (status) {
      try {
        const response = await fetch(`${apiUrl}/healthz`, { method: "GET" });
        if (!response.ok) {
          throw new Error("Failed to connect to the backend API.");
        }
        console.log("Successfully connected to the backend API");
        fetchJobs();
      } catch (error) {
        console.error("Connection failed:", error);
        setJobs([]);
      }
    } else {
      setJobs([]);
    }
  };

  const handlePageChange = async (newOffset) => {
    console.log('Changing page to offset:', newOffset);
    await fetchJobs(newOffset);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Jobnik</h1>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon">
              <Info className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[200px]">
            <DropdownMenuItem className="flex flex-col items-start">
              <span className="font-medium">About</span>
              <span className="text-sm text-muted-foreground">Created by Pavel Zagalsky</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <APIConfig 
        apiUrl={apiUrl} 
        onApiUrlChange={setApiUrl} 
        onTestConnection={handleConnectionTest} 
      />
      
      <Tabs defaultValue="jobs" className="space-y-6">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="jobs">Running Jobs</TabsTrigger>
          <TabsTrigger value="trigger">Trigger New Job</TabsTrigger>
        </TabsList>

        <TabsContent value="jobs">
          <JobsList 
            jobs={jobs} 
            onTriggerJob={handleQuickTrigger}
            isLoading={isLoadingJobs}
            pagination={pagination}
            onPageChange={handlePageChange}
          />
        </TabsContent>

        <TabsContent value="trigger">
          <TriggerJobForm 
            onSubmit={handleTriggerJob} 
            isLoading={isLoading}
            disabled={!connectionStatus}
            existingJobs={jobs} 
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
