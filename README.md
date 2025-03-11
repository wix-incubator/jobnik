<div align="center">
  <img src="jobnik-logo.webp" alt="Centered Logo" style="width: 250px;">
</div>

<!-- ![Jobnik Logo](smaller-logo.png) -->

# Jobnik: A Kubernetes native job triggering Service

Jobnik is a tiny web application that allows triggering and monitoring Kubernetes Jobs using standard Rest-API

## Features

- Trigger a Kubernetes job via an HTTP `POST` request with **custom environment variables**.
- Automatically generates unique job names.
- Monitors job completion.
- Deletes the job 1 minute after it has successfully completed.

## Prerequisites

- A **Kubernetes cluster** with RBAC permissions for job creation and deletion.
- Go application packaged into a Docker container.
- ArgoCD to manage deployments (optional).
- An HTTP client or curl for triggering jobs.

## Installation Using Helm

```sh
helm install jobnik ./helm/jobnik
```
By default, Jobnik is deployed with:
* 1 replica
* RBAC enabled
* Memory requests: 128Mi, CPU requests: 64m
* ClusterIP service on port 80 targeting port 8080

------
## API Endpoints

### **1. Trigger a Job** (`POST /job`)

This endpoint **creates and runs** a new Kubernetes job with optional **custom environment variables**.

#### **Request**
- **Method**: `POST`
- **URL**: `/job`
- **Body**: JSON payload specifying the job name, namespace, and optional environment variables.

#### **Request Parameters**
| Parameter  | Type   | Required | Description |
|------------|--------|----------|-------------|
| `jobName`  | string | ✅ Yes   | Name of the Kubernetes Job to trigger. |
| `namespace` | string | ✅ Yes   | Namespace where the Job should be created. |
| `envVars`  | object | ❌ No    | Key-value pairs of environment variables to inject into the Job. |

#### **Example Request (cURL)**

```sh
curl -X POST "http://localhost:8080/job" \
    -H "Accept: application/json" \
    -H "Content-Type: application/json" \
    -d '{
        "jobName": "test-job",
        "namespace": "default",
        "envVars": {
            "AWS_REGION": "us-west-2",
            "S3_BUCKET": "my-data-bucket",
            "DATABASE_URL": "postgres://user:password@db:5432/app",
            "REDIS_HOST": "redis-service",
            "LOG_LEVEL": "debug",
            "SERVICE_NAME": "test-service",
            "MAX_RETRIES": "5",
            "TIMEOUT": "30s",
            "ENABLE_FEATURE_X": "true",
            "INSTANCE_ID": "test-instance-12345"
        }
    }'
```

### Response:
```json
{
  "message": "Job 'aws-job-run-1234567890' triggered successfully",
  "job": "aws-job-run-1234567890",
  "namespace": "default"
}
```

### 2. `GET /job`

This endpoint retrieves the status of an existing job.

#### Request

- **Method**: `GET`
- **URL**: `/job?job=<jobName>&namespace=<namespace>`

#### Example Request

```bash
curl -X GET "http://localhost:8080/job?job=aws-job-run-1234567890&namespace=default"
```

### Response:
```json
{
  "job": "aws-job-run-1234567890",
  "status": "running"
}
```


### 2. `GET /job`
This endpoint fetches the status of a triggered Kubernetes job.
- **Method**: `GET`
- **URL**: `/job`
- **Request params** (job, namespace):

### Request Parameters
``` bash
job?job=aws-job-run-1735642406-9319&namespace=default
```

### Response:
``` bash
"job":"aws-run-1735745566-9081","status":"succeeded"
```
----------
## **Triggering a Job via Web Request**

You can trigger a job using a simple HTTP request within a **Kubernetes cluster**. Below are examples in **Python**, **Go**, and **cURL** using an internal Kubernetes service.

### **Python Example**
```python
import requests

# Replace with your internal service name and namespace
url = "http://job-service.default.svc.cluster.local:8080/job"

# Request body containing job details and environment variables
data = {
    "jobName": "test-job",
    "namespace": "default",
    "envVars": {
        "AWS_REGION": "us-west-2",
        "S3_BUCKET": "my-data-bucket",
        "DATABASE_URL": "postgres://user:password@db:5432/app",
        "REDIS_HOST": "redis-service",
        "LOG_LEVEL": "debug",
        "SERVICE_NAME": "test-service",
        "MAX_RETRIES": "5",
        "TIMEOUT": "30s",
        "ENABLE_FEATURE_X": "true",
        "INSTANCE_ID": "test-instance-12345"
    }
}

headers = {"Content-Type": "application/json"}

response = requests.post(url, json=data, headers=headers)

if response.status_code == 200:
    print("Job triggered successfully:", response.json())
else:
    print("Failed to trigger job:", response.text)
```
---

### **Go Example**
```
package main

import (
    "bytes"
    "encoding/json"
    "fmt"
    "net/http"
)

func main() {
    url := "http://job-service.default.svc.cluster.local:8080/job"

    // Request body containing job details and environment variables
    data := map[string]interface{}{
        "jobName":   "test-job",
        "namespace": "default",
        "envVars": map[string]string{
            "AWS_REGION": "us-west-2",
            "S3_BUCKET":  "my-data-bucket",
            "DATABASE_URL": "postgres://user:password@db:5432/app",
            "REDIS_HOST": "redis-service",
            "LOG_LEVEL": "debug",
            "SERVICE_NAME": "test-service",
            "MAX_RETRIES": "5",
            "TIMEOUT": "30s",
            "ENABLE_FEATURE_X": "true",
            "INSTANCE_ID": "test-instance-12345",
        },
    }

    jsonData, err := json.Marshal(data)
    if err != nil {
        fmt.Println("Error marshalling JSON:", err)
        return
    }

    req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
    if err != nil {
        fmt.Println("Error creating request:", err)
        return
    }

    req.Header.Set("Content-Type", "application/json")

    client := &http.Client{}
    resp, err := client.Do(req)
    if err != nil {
        fmt.Println("Error sending request:", err)
        return
    }
    defer resp.Body.Close()

    if resp.StatusCode == http.StatusOK {
        fmt.Println("Job triggered successfully!")
    } else {
        fmt.Printf("Failed to trigger job: %d\n", resp.StatusCode)
    }
}
```

### **cURL Example**
```sh
curl -X POST "http://job-service.default.svc.cluster.local:8080/job" \
     -H "Content-Type: application/json" \
     -d '{
        "jobName": "test-job",
        "namespace": "default",
        "envVars": {
            "AWS_REGION": "us-west-2",
            "S3_BUCKET": "my-data-bucket",
            "DATABASE_URL": "postgres://user:password@db:5432/app",
            "REDIS_HOST": "redis-service",
            "LOG_LEVEL": "debug",
            "SERVICE_NAME": "test-service",
            "MAX_RETRIES": "5",
            "TIMEOUT": "30s",
            "ENABLE_FEATURE_X": "true",
            "INSTANCE_ID": "test-instance-12345"
        }
    }'

```

---

These examples demonstrate how to send a **POST request** to trigger a job within a Kubernetes cluster using an internal service (`job-service.default.svc.cluster.local`). Ensure that your **service name, namespace, and port** match your actual deployment.

