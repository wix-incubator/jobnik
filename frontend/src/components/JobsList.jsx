import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Play, ChevronLeft, ChevronRight } from "lucide-react";
import JobStatusBadge from "./JobStatusBadge";
import JobDetailModal from "./JobDetailModal";

export default function JobsList({ jobs, onTriggerJob, isLoading, pagination, onPageChange }) {
  const [selectedJob, setSelectedJob] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString();
  };

  const { total = 0, limit = 10, offset = 0, count = 0 } = pagination || {};
  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(total / limit);
  const hasNextPage = offset + limit < total;
  const hasPrevPage = offset > 0;

  const handleJobClick = (job) => {
    setSelectedJob(job);
    setIsModalOpen(true);
  };

  console.log("Pagination state:", { 
    total, limit, offset, count, 
    currentPage, totalPages, 
    hasNextPage, hasPrevPage 
  });

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Running Jobs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job Name</TableHead>
                  <TableHead>Namespace</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Start Time</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
                        <span className="ml-2">Loading jobs...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : !jobs || jobs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                      No jobs found in the cluster
                    </TableCell>
                  </TableRow>
                ) : (
                  jobs.map((job, index) => (
                    <TableRow 
                      key={index} 
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleJobClick(job)}
                    >
                      <TableCell className="font-medium">{job.name || job.jobName}</TableCell>
                      <TableCell>{job.namespace}</TableCell>
                      <TableCell>
                        <JobStatusBadge status={job.status} />
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(job.startTime)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onTriggerJob(job.name || job.jobName, job.namespace);
                          }}
                          className="flex items-center gap-2"
                        >
                          <Play className="w-4 h-4" />
                          Trigger
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        <CardFooter className="flex items-center justify-between px-6">
          <div className="text-sm text-gray-600">
            {total > 0 ? (
              `Showing ${offset + 1}-${Math.min(offset + count, total)} of ${total} jobs`
            ) : (
              'No jobs found'
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              disabled={!hasPrevPage || isLoading}
              onClick={() => onPageChange(Math.max(0, offset - limit))}
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>
            <span className="text-sm mx-2">
              Page {currentPage} of {totalPages || 1}
            </span>
            <Button 
              variant="outline" 
              size="sm"
              disabled={!hasNextPage || isLoading}
              onClick={() => onPageChange(offset + limit)}
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </CardFooter>
      </Card>

      <JobDetailModal 
        job={selectedJob}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onTriggerJob={onTriggerJob}
      />
    </>
  );
}