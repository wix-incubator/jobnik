package main

import (
	"context"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"os"
	"sync"
	"time"

	_ "jobnik/docs" // Replace with your actual module name for Swagger docs

	"github.com/gin-gonic/gin"
	swaggerfiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"
	"k8s.io/client-go/util/retry"
)

// TriggerJobRequest defines the expected JSON body for triggering a job.
// swagger:parameters triggerJobRequest
type TriggerJobRequest struct {
	JobName   string `json:"jobName" example:"example-job"`
	Namespace string `json:"namespace" example:"default"`
}

// TriggerJobResponse defines the JSON response after triggering a job.
// swagger:response triggerJobResponse
type TriggerJobResponse struct {
	Message string `json:"message" example:"Job triggered successfully"`
}

// ErrorResponse defines the JSON error response.
// swagger:response errorResponse
type ErrorResponse struct {
	Error string `json:"error" example:"Invalid request body"`
}

// JobStatusResponse defines the JSON response for job status.
// swagger:response jobStatusResponse
type JobStatusResponse struct {
	Job    string `json:"job" example:"example-job"`
	Status string `json:"status" example:"succeeded"`
}

var clientset *kubernetes.Clientset

// loadK8sConfig loads the Kubernetes configuration from in-cluster or from local kubeconfig.
func loadK8sConfig() {
	var err error
	log.Println("Loading Kubernetes configuration...")
	// Check if we are running in a cluster.
	if _, err = os.Stat("/var/run/secrets/kubernetes.io/serviceaccount/token"); err == nil {
		config, err := rest.InClusterConfig()
		if err != nil {
			log.Fatalf("Failed to load in-cluster config: %v", err)
		}
		clientset, err = kubernetes.NewForConfig(config)
		if err != nil {
			log.Fatalf("Failed to create Kubernetes client: %v", err)
		}
		log.Println("Loaded in-cluster config.")
		return
	}

	// Otherwise, try loading local kubeconfig.
	kubeconfig := clientcmd.NewDefaultClientConfigLoadingRules().GetDefaultFilename()
	if _, err := os.Stat(kubeconfig); err == nil {
		config, err := clientcmd.BuildConfigFromFlags("", kubeconfig)
		if err != nil {
			log.Fatalf("Error loading kubeconfig: %v", err)
		}
		clientset, err = kubernetes.NewForConfig(config)
		if err != nil {
			log.Fatalf("Failed to create Kubernetes client: %v", err)
		}
		log.Println("Loaded kubeconfig from local environment.")
	} else {
		log.Fatalf("Error: Kubeconfig file not found. Ensure the file exists at %s.", kubeconfig)
	}
}

// generateUniqueJobName creates a unique job name by appending a timestamp and random number.
func generateUniqueJobName(jobName string) string {
	timestamp := fmt.Sprintf("%d", time.Now().Unix())
	randomSuffix := fmt.Sprintf("%d", rand.Intn(10000))
	return fmt.Sprintf("%s-run-%s-%s", jobName, timestamp, randomSuffix)
}

// monitorJobCompletion continuously checks the job status until it succeeds, then deletes the job.
func performTriggerJob(jobName, namespace string) (string, error) {
	jobClient := clientset.BatchV1().Jobs(namespace)
	log.Printf("Fetching job: %s from namespace: %s", jobName, namespace)
	job, err := jobClient.Get(context.Background(), jobName, metav1.GetOptions{})
	if err != nil {
		log.Printf("Error reading job: %v", err)
		return "", fmt.Errorf("error reading job: %v", err)
	}

	newJobName := generateUniqueJobName(jobName)
	log.Printf("Generated unique job name: %s", newJobName)

	// Reset metadata
	job.ResourceVersion = "" // Clear resource version to allow creation
	job.Name = newJobName
	job.ObjectMeta.UID = ""
	job.ObjectMeta.CreationTimestamp = metav1.Time{}
	job.ObjectMeta.ManagedFields = nil

	// Reset job labels to avoid conflicts
	job.ObjectMeta.Labels = map[string]string{
		"job-name": newJobName,
	}

	// Ensure template labels match the job name
	job.Spec.Template.ObjectMeta.Labels = map[string]string{
		"job-name": newJobName,
	}

	// Remove the immutable selector
	job.Spec.Selector = nil

	// Reset template metadata
	job.Spec.Template.ObjectMeta.Name = newJobName
	job.Spec.Template.ObjectMeta.GenerateName = ""

	log.Println("Attempting job creation with retry...")
	err = retry.OnError(
		retry.DefaultBackoff,
		func(err error) bool { return true },
		func() error {
			_, err := jobClient.Create(context.Background(), job, metav1.CreateOptions{})
			if err != nil {
				log.Printf("Job creation failed: %v", err)
			}
			return err
		},
	)
	if err != nil {
		log.Printf("Error creating job after retries: %v", err)
		return "", fmt.Errorf("error creating job after retries: %v", err)
	}

	log.Printf("Job '%s' triggered successfully.", newJobName)
	go monitorJobCompletion(namespace, newJobName)
	return newJobName, nil
}

func monitorJobCompletion(namespace, jobName string) {
	log.Printf("Monitoring job: %s in namespace: %s", jobName, namespace)
	for {
		job, err := clientset.BatchV1().Jobs(namespace).Get(context.Background(), jobName, metav1.GetOptions{})
		if err != nil {
			log.Printf("Error retrieving job %s: %s", jobName, err.Error())
			time.Sleep(5 * time.Second)
			continue
		}
		if job.Status.Succeeded > 0 {
			log.Printf("Job %s completed successfully.", jobName)
			time.Sleep(1 * time.Minute)
			err := clientset.BatchV1().Jobs(namespace).Delete(context.Background(), jobName, metav1.DeleteOptions{})
			if err != nil {
				log.Printf("Error deleting job %s: %s", jobName, err.Error())
			} else {
				log.Printf("Job %s deleted successfully.", jobName)
			}
			break
		}
		time.Sleep(5 * time.Second)
	}
}

// listJobs renders an HTML page listing all jobs in all namespaces along with a trigger button.
// This version fetches jobs concurrently for each namespace.
func listJobs(c *gin.Context) {
	log.Println("Fetching all namespaces...")

	// Get all namespaces.
	namespaces, err := clientset.CoreV1().Namespaces().List(context.Background(), metav1.ListOptions{})
	if err != nil {
		log.Printf("Error fetching namespaces: %v", err)
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: "Error fetching namespaces"})
		return
	}

	var (
		wg       sync.WaitGroup
		mu       sync.Mutex
		jobsList []map[string]string
	)

	// Fetch jobs in each namespace concurrently.
	for _, ns := range namespaces.Items {
		namespace := ns.Name
		wg.Add(1)
		go func(namespace string) {
			defer wg.Done()
			log.Printf("Fetching jobs in namespace: %s", namespace)
			jobs, err := clientset.BatchV1().Jobs(namespace).List(context.Background(), metav1.ListOptions{})
			if err != nil {
				log.Printf("Error fetching jobs in namespace %s: %v", namespace, err)
				return
			}

			var localJobs []map[string]string
			for _, job := range jobs.Items {
				status := "unknown"
				if job.Status.Active > 0 {
					status = "running"
				} else if job.Status.Succeeded > 0 {
					status = "succeeded"
				} else if job.Status.Failed > 0 {
					status = "failed"
				}

				localJobs = append(localJobs, map[string]string{
					"namespace": namespace,
					"jobName":   job.Name,
					"status":    status,
				})
			}

			mu.Lock()
			jobsList = append(jobsList, localJobs...)
			mu.Unlock()
		}(namespace)
	}

	// Wait for all goroutines to complete.
	wg.Wait()

	// Return JSON response.
	c.JSON(http.StatusOK, gin.H{"jobs": jobsList})
}

func jobHandler(c *gin.Context) {
	jobName := c.Query("job")
	if jobName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Job name is required"})
		return
	}

	namespace := c.Query("namespace")
	if namespace == "" {
		namespace = "default"
	}

	if c.Request.Method == http.MethodGet {
		job, err := clientset.BatchV1().Jobs(namespace).Get(context.Background(), jobName, metav1.GetOptions{})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Error fetching job status"})
			return
		}

		status := "unknown"
		if job.Status.Succeeded > 0 {
			status = "succeeded"
		} else if job.Status.Failed > 0 {
			status = "failed"
		} else if job.Status.Active > 0 {
			status = "running"
		}

		c.JSON(http.StatusOK, gin.H{"job": jobName, "status": status})
		return
	}

	if c.Request.Method == http.MethodPost {
		newJobName, err := performTriggerJob(jobName, namespace)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{
			"message":   fmt.Sprintf("Job '%s' triggered successfully", newJobName),
			"job":       newJobName,
			"namespace": namespace,
		})
	}
}

func main() {
	log.Println("Starting Kubernetes Job Trigger API...")
	loadK8sConfig()

	r := gin.Default()

	// The root route now shows the API endpoints.

	// Swagger documentation endpoint.
	r.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerfiles.Handler))

	// Health and readiness endpoints.
	r.GET("/healthz", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "healthy"})
	})
	r.GET("/readiness", func(c *gin.Context) {
		if clientset == nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{"status": "not ready"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"status": "ready"})
	})

	// Endpoint to check a job's status.

	r.GET("/job", jobHandler)
	r.POST("/job", jobHandler)

	// HTML page listing all jobs in all namespaces.
	r.GET("/jobs", listJobs)

	// Run the server on port 8080.
	r.Run(":8080")
}
