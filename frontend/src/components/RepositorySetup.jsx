
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, Github, GitBranch, GitCommit } from "lucide-react";

export default function RepositorySetup() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Github className="h-5 w-5" />
          Repository Setup Instructions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <h3 className="text-lg font-medium">Setting Up Your Repository</h3>
          <p className="text-gray-600">
            Follow these steps to set up your repository with the backend and frontend code:
          </p>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border p-4">
            <h4 className="flex items-center gap-2 font-medium">
              <GitBranch className="h-4 w-4 text-gray-500" />
              Step 1: Create the repository structure
            </h4>
            <div className="mt-2 text-sm">
              <pre className="bg-gray-100 p-3 rounded-md overflow-x-auto">
{`mkdir -p k8s-job-manager/{backend/{kubernetes,api},frontend/{src/{components,pages},public}}`}
              </pre>
            </div>
          </div>

          <div className="rounded-lg border p-4">
            <h4 className="flex items-center gap-2 font-medium">
              <GitBranch className="h-4 w-4 text-gray-500" />
              Step 2: Create backend files
            </h4>
            <Tabs defaultValue="main" className="mt-3">
              <TabsList>
                <TabsTrigger value="main">main.go</TabsTrigger>
                <TabsTrigger value="client">kubernetes/client.go</TabsTrigger>
                <TabsTrigger value="jobs">kubernetes/jobs.go</TabsTrigger>
                <TabsTrigger value="handlers">api/handlers.go</TabsTrigger>
                <TabsTrigger value="go-mod">go.mod</TabsTrigger>
                <TabsTrigger value="dockerfile">Dockerfile</TabsTrigger>
              </TabsList>
              
              <TabsContent value="main" className="mt-3">
                <pre className="bg-gray-100 p-3 rounded-md overflow-x-auto text-xs">
{`package main

import (
	"log"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"k8s-job-manager/backend/api"
	"k8s-job-manager/backend/kubernetes"
)

func main() {
	// Initialize Kubernetes client
	k8sClient, err := kubernetes.NewClient()
	if err != nil {
		log.Fatalf("Failed to create Kubernetes client: %v", err)
	}

	// Create router
	r := gin.Default()

	// Configure CORS
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"*"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	// Setup API handlers
	api.RegisterHandlers(r, k8sClient)

	// Start server
	if err := r.Run(":8080"); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}`}
                </pre>
              </TabsContent>
              
              <TabsContent value="client" className="mt-3">
                <pre className="bg-gray-100 p-3 rounded-md overflow-x-auto text-xs">
{`package kubernetes

import (
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"
	"os"
	"path/filepath"
)

// Client wraps Kubernetes clientset
type Client struct {
	Clientset *kubernetes.Clientset
}

// NewClient creates a new Kubernetes client
func NewClient() (*Client, error) {
	var config *rest.Config
	var err error

	// Try in-cluster config first
	config, err = rest.InClusterConfig()
	if err != nil {
		// Fall back to kubeconfig
		kubeconfig := os.Getenv("KUBECONFIG")
		if kubeconfig == "" {
			home := os.Getenv("HOME")
			kubeconfig = filepath.Join(home, ".kube", "config")
		}
		
		config, err = clientcmd.BuildConfigFromFlags("", kubeconfig)
		if err != nil {
			return nil, err
		}
	}

	// Create the clientset
	clientset, err := kubernetes.NewForConfig(config)
	if err != nil {
		return nil, err
	}

	return &Client{
		Clientset: clientset,
	}, nil
}`}
                </pre>
              </TabsContent>
              
              <TabsContent value="jobs" className="mt-3">
                <pre className="bg-gray-100 p-3 rounded-md overflow-x-auto text-xs">
{`package kubernetes

import (
	"context"
	"fmt"
	batchv1 "k8s.io/api/batch/v1"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// JobInfo represents the simplified job information
type JobInfo struct {
	Name        string    \`json:"name"\`
	Namespace   string    \`json:"namespace"\`
	Status      string    \`json:"status"\`
	StartTime   *metav1.Time \`json:"startTime,omitempty"\`
	CompletionTime *metav1.Time \`json:"completionTime,omitempty"\`
	ContainerImage string \`json:"containerImage"\`
	Command     []string  \`json:"command"\`
}

// ListJobs gets all jobs in the given namespace
func (c *Client) ListJobs(namespace string) ([]JobInfo, error) {
	jobs, err := c.Clientset.BatchV1().Jobs(namespace).List(context.TODO(), metav1.ListOptions{})
	if err != nil {
		return nil, err
	}

	var jobInfos []JobInfo
	for _, job := range jobs.Items {
		containerImage := ""
		var command []string
		
		if len(job.Spec.Template.Spec.Containers) > 0 {
			containerImage = job.Spec.Template.Spec.Containers[0].Image
			command = job.Spec.Template.Spec.Containers[0].Command
		}
		
		status := getJobStatus(job)
		
		jobInfos = append(jobInfos, JobInfo{
			Name:        job.Name,
			Namespace:   job.Namespace,
			Status:      status,
			StartTime:   job.Status.StartTime,
			CompletionTime: job.Status.CompletionTime,
			ContainerImage: containerImage,
			Command:     command,
		})
	}

	return jobInfos, nil
}

// CreateJob creates a new Kubernetes job
func (c *Client) CreateJob(namespace, name, image string, command []string, env []corev1.EnvVar) (*JobInfo, error) {
	job := &batchv1.Job{
		ObjectMeta: metav1.ObjectMeta{
			Name: name,
		},
		Spec: batchv1.JobSpec{
			Template: corev1.PodTemplateSpec{
				Spec: corev1.PodSpec{
					Containers: []corev1.Container{
						{
							Name:    "job",
							Image:   image,
							Command: command,
							Env:     env,
						},
					},
					RestartPolicy: corev1.RestartPolicyNever,
				},
			},
			BackoffLimit: new(int32), // 0 retries
		},
	}

	result, err := c.Clientset.BatchV1().Jobs(namespace).Create(context.TODO(), job, metav1.CreateOptions{})
	if err != nil {
		return nil, err
	}

	return &JobInfo{
		Name:      result.Name,
		Namespace: result.Namespace,
		Status:    "Created",
		ContainerImage: image,
		Command:   command,
	}, nil
}

// DeleteJob deletes a job
func (c *Client) DeleteJob(namespace, name string) error {
	propagationPolicy := metav1.DeletePropagationForeground
	return c.Clientset.BatchV1().Jobs(namespace).Delete(context.TODO(), name, metav1.DeleteOptions{
		PropagationPolicy: &propagationPolicy,
	})
}

// GetJobLogs gets logs for a job
func (c *Client) GetJobLogs(namespace, jobName string) (string, error) {
	// Get pods for the job
	pods, err := c.Clientset.CoreV1().Pods(namespace).List(context.TODO(), metav1.ListOptions{
		LabelSelector: fmt.Sprintf("job-name=%s", jobName),
	})
	if err != nil {
		return "", err
	}

	if len(pods.Items) == 0 {
		return "No pods found for job", nil
	}

	// Get logs from the first pod
	podName := pods.Items[0].Name
	logs, err := c.Clientset.CoreV1().Pods(namespace).GetLogs(podName, &corev1.PodLogOptions{}).Do(context.TODO()).Raw()
	if err != nil {
		return "", err
	}

	return string(logs), nil
}

// Helper function to get job status
func getJobStatus(job batchv1.Job) string {
	if job.Status.CompletionTime != nil {
		return "Completed"
	}
	
	if job.Status.Failed > 0 {
		return "Failed"
	}
	
	if job.Status.Active > 0 {
		return "Running"
	}
	
	return "Pending"
}`}
                </pre>
              </TabsContent>
              
              <TabsContent value="handlers" className="mt-3">
                <pre className="bg-gray-100 p-3 rounded-md overflow-x-auto text-xs">
{`package api

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"k8s-job-manager/backend/kubernetes"
	corev1 "k8s.io/api/core/v1"
)

// JobRequest is the request format for creating a job
type JobRequest struct {
	Name      string            \`json:"name" binding:"required"\`
	Namespace string            \`json:"namespace" binding:"required"\`
	Image     string            \`json:"image" binding:"required"\`
	Command   []string          \`json:"command"\`
	EnvVars   map[string]string \`json:"envVars"\`
}

// RegisterHandlers sets up all the API routes
func RegisterHandlers(r *gin.Engine, k8sClient *kubernetes.Client) {
	// Health check endpoint
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "up"})
	})

	// API endpoints
	api := r.Group("/api")
	{
		// Jobs endpoints
		api.GET("/jobs/:namespace", listJobs(k8sClient))
		api.POST("/jobs", createJob(k8sClient))
		api.DELETE("/jobs/:namespace/:name", deleteJob(k8sClient))
		api.GET("/jobs/:namespace/:name/logs", getJobLogs(k8sClient))
	}
}

// Handler for listing jobs
func listJobs(client *kubernetes.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		namespace := c.Param("namespace")
		if namespace == "" {
			namespace = "default"
		}

		jobs, err := client.ListJobs(namespace)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, jobs)
	}
}

// Handler for creating a job
func createJob(client *kubernetes.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req JobRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		// Convert map to env vars
		var envVars []corev1.EnvVar
		for key, value := range req.EnvVars {
			envVars = append(envVars, corev1.EnvVar{
				Name:  key,
				Value: value,
			})
		}

		job, err := client.CreateJob(req.Namespace, req.Name, req.Image, req.Command, envVars)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusCreated, job)
	}
}

// Handler for deleting a job
func deleteJob(client *kubernetes.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		namespace := c.Param("namespace")
		name := c.Param("name")

		err := client.DeleteJob(namespace, name)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"status": "deleted"})
	}
}

// Handler for getting job logs
func getJobLogs(client *kubernetes.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		namespace := c.Param("namespace")
		name := c.Param("name")

		logs, err := client.GetJobLogs(namespace, name)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"logs": logs})
	}
}`}
                </pre>
              </TabsContent>
              
              <TabsContent value="go-mod" className="mt-3">
                <pre className="bg-gray-100 p-3 rounded-md overflow-x-auto text-xs">
{`module k8s-job-manager/backend

go 1.19

require (
	github.com/gin-contrib/cors v1.4.0
	github.com/gin-gonic/gin v1.9.1
	k8s.io/api v0.28.3
	k8s.io/apimachinery v0.28.3
	k8s.io/client-go v0.28.3
)

require (
	github.com/bytedance/sonic v1.9.1 // indirect
	github.com/chenzhuoyu/base64x v0.0.0-20221115062448-fe3a3abad311 // indirect
	github.com/davecgh/go-spew v1.1.1 // indirect
	github.com/emicklei/go-restful/v3 v3.10.1 // indirect
	github.com/gabriel-vasile/mimetype v1.4.2 // indirect
	github.com/gin-contrib/sse v0.1.0 // indirect
	github.com/go-logr/logr v1.2.4 // indirect
	github.com/go-openapi/jsonpointer v0.19.6 // indirect
	github.com/go-openapi/jsonreference v0.20.2 // indirect
	github.com/go-openapi/swag v0.22.3 // indirect
	github.com/go-playground/locales v0.14.1 // indirect
	github.com/go-playground/universal-translator v0.18.1 // indirect
	github.com/go-playground/validator/v10 v10.14.0 // indirect
	github.com/goccy/go-json v0.10.2 // indirect
	github.com/gogo/protobuf v1.3.2 // indirect
	github.com/golang/protobuf v1.5.3 // indirect
	github.com/google/gnostic-models v0.6.8 // indirect
	github.com/google/go-cmp v0.5.9 // indirect
	github.com/google/gofuzz v1.2.0 // indirect
	github.com/google/uuid v1.3.0 // indirect
	github.com/imdario/mergo v0.3.6 // indirect
	github.com/josharian/intern v1.0.0 // indirect
	github.com/json-iterator/go v1.1.12 // indirect
	github.com/klauspost/cpuid/v2 v2.2.4 // indirect
	github.com/leodido/go-urn v1.2.4 // indirect
	github.com/mailru/easyjson v0.7.7 // indirect
	github.com/mattn/go-isatty v0.0.19 // indirect
	github.com/modern-go/concurrent v0.0.0-20180306012644-bacd9c7ef1dd // indirect
	github.com/modern-go/reflect2 v1.0.2 // indirect
	github.com/munnerz/goautoneg v0.0.0-20191010083416-a7dc8b61c822 // indirect
	github.com/pelletier/go-toml/v2 v2.0.8 // indirect
	github.com/spf13/pflag v1.0.5 // indirect
	github.com/twitchyliquid64/golang-asm v0.15.1 // indirect
	github.com/ugorji/go/codec v1.2.11 // indirect
	golang.org/x/arch v0.3.0 // indirect
	golang.org/x/crypto v0.14.0 // indirect
	golang.org/x/net v0.17.0 // indirect
	golang.org/x/oauth2 v0.8.0 // indirect
	golang.org/x/sys v0.13.0 // indirect
	golang.org/x/term v0.13.0 // indirect
	golang.org/x/text v0.13.0 // indirect
	golang.org/x/time v0.3.0 // indirect
	google.golang.org/appengine v1.6.7 // indirect
	google.golang.org/protobuf v1.30.0 // indirect
	gopkg.in/inf.v0 v0.9.1 // indirect
	gopkg.in/yaml.v2 v2.4.0 // indirect
	gopkg.in/yaml.v3 v3.0.1 // indirect
	k8s.io/klog/v2 v2.100.1 // indirect
	k8s.io/kube-openapi v0.0.0-20230717233707-2695361300d9 // indirect
	k8s.io/utils v0.0.0-20230406110748-d93618cff8a2 // indirect
	sigs.k8s.io/json v0.0.0-20221116044647-bc3834ca7abd // indirect
	sigs.k8s.io/structured-merge-diff/v4 v4.2.3 // indirect
	sigs.k8s.io/yaml v1.3.0 // indirect
)`}
                </pre>
              </TabsContent>
              
              <TabsContent value="dockerfile" className="mt-3">
                <pre className="bg-gray-100 p-3 rounded-md overflow-x-auto text-xs">
{`FROM golang:1.19-alpine AS builder

WORKDIR /app
COPY . .

RUN go mod download
RUN CGO_ENABLED=0 GOOS=linux go build -o k8s-job-manager .

FROM alpine:latest

RUN apk --no-cache add ca-certificates
WORKDIR /app
COPY --from=builder /app/k8s-job-manager .

EXPOSE 8080
CMD ["./k8s-job-manager"]`}
                </pre>
              </TabsContent>
            </Tabs>
          </div>

          <div className="rounded-lg border p-4">
            <h4 className="flex items-center gap-2 font-medium">
              <GitBranch className="h-4 w-4 text-gray-500" />
              Step 3: Create deployment files
            </h4>
            <Tabs defaultValue="backend" className="mt-3">
              <TabsList>
                <TabsTrigger value="backend">backend.yaml</TabsTrigger>
                <TabsTrigger value="frontend">frontend.yaml</TabsTrigger>
                <TabsTrigger value="rbac">rbac.yaml</TabsTrigger>
                <TabsTrigger value="compose">docker-compose.yaml</TabsTrigger>
              </TabsList>
              
              <TabsContent value="backend" className="mt-3">
                <pre className="bg-gray-100 p-3 rounded-md overflow-x-auto text-xs">
{`apiVersion: apps/v1
kind: Deployment
metadata:
  name: job-manager-backend
spec:
  replicas: 1
  selector:
    matchLabels:
      app: job-manager-backend
  template:
    metadata:
      labels:
        app: job-manager-backend
    spec:
      serviceAccountName: job-manager-sa
      containers:
      - name: backend
        image: k8s-job-manager-backend:latest
        imagePullPolicy: IfNotPresent
        ports:
        - containerPort: 8080
        resources:
          limits:
            cpu: 500m
            memory: 512Mi
          requests:
            cpu: 100m
            memory: 128Mi
---
apiVersion: v1
kind: Service
metadata:
  name: job-manager-backend
spec:
  selector:
    app: job-manager-backend
  ports:
  - port: 80
    targetPort: 8080
  type: ClusterIP`}
                </pre>
              </TabsContent>
              
              <TabsContent value="frontend" className="mt-3">
                <pre className="bg-gray-100 p-3 rounded-md overflow-x-auto text-xs">
{`apiVersion: apps/v1
kind: Deployment
metadata:
  name: job-manager-frontend
spec:
  replicas: 1
  selector:
    matchLabels:
      app: job-manager-frontend
  template:
    metadata:
      labels:
        app: job-manager-frontend
    spec:
      containers:
      - name: frontend
        image: k8s-job-manager-frontend:latest
        imagePullPolicy: IfNotPresent
        ports:
        - containerPort: 80
        env:
        - name: API_URL
          value: "http://job-manager-backend"
        resources:
          limits:
            cpu: 200m
            memory: 256Mi
          requests:
            cpu: 100m
            memory: 128Mi
---
apiVersion: v1
kind: Service
metadata:
  name: job-manager-frontend
spec:
  selector:
    app: job-manager-frontend
  ports:
  - port: 80
    targetPort: 80
  type: ClusterIP
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: job-manager-ingress
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  rules:
  - host: k8s-job-manager.local
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: job-manager-frontend
            port:
              number: 80
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: job-manager-backend
            port:
              number: 80`}
                </pre>
              </TabsContent>
              
              <TabsContent value="rbac" className="mt-3">
                <pre className="bg-gray-100 p-3 rounded-md overflow-x-auto text-xs">
{`apiVersion: v1
kind: ServiceAccount
metadata:
  name: job-manager-sa
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: job-manager-role
rules:
- apiGroups: ["batch"]
  resources: ["jobs"]
  verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
- apiGroups: [""]
  resources: ["pods", "pods/log"]
  verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: job-manager-binding
subjects:
- kind: ServiceAccount
  name: job-manager-sa
  namespace: default
roleRef:
  kind: ClusterRole
  name: job-manager-role
  apiGroup: rbac.authorization.k8s.io`}
                </pre>
              </TabsContent>
              
              <TabsContent value="compose" className="mt-3">
                <pre className="bg-gray-100 p-3 rounded-md overflow-x-auto text-xs">
{`version: '3'

services:
  backend:
    build:
      context: ./backend
    ports:
      - "8080:8080"
    volumes:
      - \${HOME}/.kube:/root/.kube
    environment:
      - KUBECONFIG=/root/.kube/config

  frontend:
    build:
      context: ./frontend
    ports:
      - "3000:80"
    depends_on:
      - backend
    environment:
      - API_URL=http://localhost:8080`}
                </pre>
              </TabsContent>
            </Tabs>
          </div>

          <div className="rounded-lg border p-4">
            <h4 className="flex items-center gap-2 font-medium">
              <GitCommit className="h-4 w-4 text-gray-500" />
              Step 4: Initialize Git repository and commit files
            </h4>
            <div className="mt-2 text-sm">
              <pre className="bg-gray-100 p-3 rounded-md overflow-x-auto">
{`cd k8s-job-manager
git init
git add .
git commit -m "Initial commit of Kubernetes Job Manager"
git branch -M main

# Add your remote repository
git remote add origin https://github.com/yourusername/k8s-job-manager.git
git push -u origin main`}
              </pre>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-lg bg-green-50 border border-green-200 p-4">
          <h3 className="flex items-center gap-2 text-green-800 font-medium">
            <Check className="h-5 w-5 text-green-600" />
            Repository Structure Complete
          </h3>
          <p className="mt-2 text-green-700">
            Your repository will now contain both the frontend and backend code, along with deployment configuration files.
            This structure is ready for local development, containerization, and deployment to a Kubernetes cluster.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
