package api

import (
	"context"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"time"

	"k8s-job-manager/kubernetes"

	"github.com/gin-gonic/gin"
	_ "k8s.io/api/batch/v1"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/util/retry"
)

// RegisterHandlers sets up all API routes
func RegisterHandlers(r *gin.Engine, k8sClient *kubernetes.Client) {
	// Health check endpoint
	r.GET("/healthz", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status": "healthy",
		})
	})

	// List jobs endpoint
	// List jobs endpoint with pagination and metadata
	r.GET("/jobs", func(c *gin.Context) {
		namespace := c.DefaultQuery("namespace", "")
		if namespace == "all" {
			namespace = ""
		}

		// Parse limit and offset query parameters
		limit := 10 // default limit
		offset := 0 // default offset

		if l := c.Query("limit"); l != "" {
			fmt.Sscanf(l, "%d", &limit)
		}
		if o := c.Query("offset"); o != "" {
			fmt.Sscanf(o, "%d", &offset)
		}

		// Fetch all jobs
		jobs, err := k8sClient.ListJobs(namespace)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": fmt.Sprintf("Failed to list jobs: %v", err),
			})
			return
		}

		total := len(jobs)

		// Pagination bounds
		start := offset
		end := offset + limit
		if start > total {
			start = total
		}
		if end > total {
			end = total
		}
		paginatedJobs := jobs[start:end]

		// Set metadata headers
		c.Header("X-Total-Count", fmt.Sprintf("%d", total))
		c.Header("X-Limit", fmt.Sprintf("%d", limit))
		c.Header("X-Offset", fmt.Sprintf("%d", offset))

		// JSON response with metadata
		c.JSON(http.StatusOK, gin.H{
			"total":  total,
			"limit":  limit,
			"offset": offset,
			"count":  len(paginatedJobs),
			"jobs":   paginatedJobs,
		})
	})

	// Trigger job from base template
	r.POST("/job", func(c *gin.Context) {
		var req struct {
			JobName   string            `json:"jobName" binding:"required"`
			Namespace string            `json:"namespace" binding:"required"`
			EnvVars   map[string]string `json:"envVars"`
			Args      []string          `json:"args"`
		}

		if err := c.BindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": fmt.Sprintf("Invalid request: %v", err),
			})
			return
		}

		jobClient := k8sClient.Clientset.BatchV1().Jobs(req.Namespace)

		// Fetch the base job
		baseJob, err := jobClient.Get(context.TODO(), req.JobName, metav1.GetOptions{})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": fmt.Sprintf("Failed to get base job: %v", err),
			})
			return
		}

		// Generate unique job name
		newJobName := fmt.Sprintf("%s-run-%d-%d", req.JobName, time.Now().Unix(), rand.Intn(10000))

		// Reset metadata and modify fields
		baseJob.ResourceVersion = ""
		baseJob.UID = ""
		baseJob.Name = newJobName
		baseJob.CreationTimestamp = metav1.Time{}
		baseJob.ManagedFields = nil
		baseJob.Spec.Selector = nil

		baseJob.Labels = map[string]string{"job-name": newJobName}
		baseJob.Spec.Template.ObjectMeta.Labels = map[string]string{"job-name": newJobName}
		baseJob.Spec.Template.ObjectMeta.Name = newJobName
		baseJob.Spec.Template.ObjectMeta.GenerateName = ""

		// Set env vars
		if len(req.EnvVars) > 0 {
			var envs []corev1.EnvVar
			for k, v := range req.EnvVars {
				envs = append(envs, corev1.EnvVar{Name: k, Value: v})
			}
			baseJob.Spec.Template.Spec.Containers[0].Env = envs
		}

		// Set args
		if len(req.Args) > 0 {
			baseJob.Spec.Template.Spec.Containers[0].Args = req.Args
		}

		// Create new job with retries
		err = retry.OnError(retry.DefaultBackoff, func(err error) bool { return true }, func() error {
			_, err := jobClient.Create(context.TODO(), baseJob, metav1.CreateOptions{})
			return err
		})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": fmt.Sprintf("Failed to create job: %v", err),
			})
			return
		}

		go monitorJob(k8sClient, req.Namespace, newJobName)

		c.JSON(http.StatusOK, gin.H{
			"message":   fmt.Sprintf("Job %s triggered successfully", newJobName),
			"jobName":   newJobName,
			"namespace": req.Namespace,
		})
	})
	// Get logs for a job's container
	r.GET("/job/logs", func(c *gin.Context) {
		jobName := c.Query("jobName")
		namespace := c.DefaultQuery("namespace", "default")
		container := c.Query("container") // Optional: container name if multiple containers

		if jobName == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Missing required query parameter: jobName"})
			return
		}

		// Find pods with the job-name label
		podClient := k8sClient.Clientset.CoreV1().Pods(namespace)
		podList, err := podClient.List(context.TODO(), metav1.ListOptions{
			LabelSelector: fmt.Sprintf("job-name=%s", jobName),
		})
		if err != nil || len(podList.Items) == 0 {
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to find pods for job %s: %v", jobName, err)})
			return
		}

		// Pick the first pod (assuming one pod per job unless parallelism > 1)
		pod := podList.Items[0]

		// Set up log options
		logOptions := &corev1.PodLogOptions{}
		if container != "" {
			logOptions.Container = container
		}

		req := podClient.GetLogs(pod.Name, logOptions)
		logs, err := req.Stream(context.TODO())
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to stream logs: %v", err)})
			return
		}
		defer logs.Close()

		// Read logs into string
		buf := make([]byte, 2000)
		n, _ := logs.Read(buf)
		logContent := string(buf[:n])

		c.JSON(http.StatusOK, gin.H{
			"jobName":   jobName,
			"namespace": namespace,
			"logs":      logContent,
		})
	})

}

// monitorJob checks job status and deletes it once completed
func monitorJob(k8sClient *kubernetes.Client, namespace, jobName string) {
	jobClient := k8sClient.Clientset.BatchV1().Jobs(namespace)

	for {
		time.Sleep(5 * time.Second)

		job, err := jobClient.Get(context.TODO(), jobName, metav1.GetOptions{})
		if err != nil {
			log.Printf("[Monitor] Failed to get job %s: %v", jobName, err)
			continue
		}

		if job.Status.Succeeded > 0 {
			log.Printf("[Monitor] Job %s succeeded. Cleaning up...", jobName)
			time.Sleep(30 * time.Second)
			if err := jobClient.Delete(context.TODO(), jobName, metav1.DeleteOptions{}); err != nil {
				log.Printf("[Monitor] Failed to delete job %s: %v", jobName, err)
			} else {
				log.Printf("[Monitor] Job %s deleted.", jobName)
			}
			break
		}
	}
}
