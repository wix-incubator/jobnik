<div align="center">
  <img src="jobnik-logo.webp" alt="Centered Logo" style="width: 250px;">
</div>

<!-- ![Jobnik Logo](smaller-logo.png) -->

# Jobnik: A Kubernetes native job triggering Service

Jobnik is a tiny web application that allows triggering and monitoring Kubernetes Jobs using standard Rest-API

## Features

- Trigger a Kubernetes job via an HTTP POST request.
- Automatically generates unique job names.
- Monitors job completion.
- Deletes the job 1 minute after it has successfully completed.

## Prerequisites

- Kubernetes Cluster with RBAC configured to allow job creation and deletion.
- Go application packaged into a Docker container.
- ArgoCD to manage deployments (optional).
- An HTTP client or curl for triggering jobs.

## Deployment

1. **Kubernetes Deployment**: The Go application is deployed as a Kubernetes Deployment using the provided `deployment.yaml` file.
2. **RBAC Configuration**: The Go application requires the `Role` and `RoleBinding` defined in `roles.yaml` to interact with Kubernetes jobs.
3. **ArgoCD Application**: Optionally, the application can be deployed and managed by ArgoCD using the `argocd-app.yaml`.

For complete deployment instructions, please refer to the Kubernetes YAML files provided.

------
## How It Works

### API Endpoints

### 1. `POST /job`

This endpoint triggers a new Kubernetes job.

#### Request

- **Method**: `POST`
- **URL**: `/job?job=<jobName>&namespace=<namespace>`

#### Example Request

```bash
curl -X POST "http://localhost:8080/job?job=aws-job&namespace=default" \
    -H "Accept: application/json"
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
curl -X GET "http://localhost:8080/job?job=aws-job-run-1234567890&namespace=default" \
    -H "Accept: application/json"
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
url = "http://job-service.default.svc.cluster.local:8080/job/trigger"

# Optional headers and payload
headers = {"Authorization": "Bearer YOUR_TOKEN", "Content-Type": "application/json"}
data = {"job_id": "12345"}

response = requests.post(url, json=data, headers=headers)

if response.status_code == 200:
    print("Job triggered successfully!")
else:
    print(f"Failed to trigger job: {response.status_code} - {response.text}")
```

---

### **Go Example**
```go
package main

import (
    "bytes"
    "encoding/json"
    "fmt"
    "net/http"
)

func main() {
    url := "http://job-service.default.svc.cluster.local:8080/job/trigger"
    payload := map[string]string{"job_id": "12345"}
    
    jsonData, err := json.Marshal(payload)
    if err != nil {
        fmt.Println("Error marshalling JSON:", err)
        return
    }

    req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
    if err != nil {
        fmt.Println("Error creating request:", err)
        return
    }

    req.Header.Set("Authorization", "Bearer YOUR_TOKEN")
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

---

### **cURL Example**
```sh
curl -X POST "http://job-service.default.svc.cluster.local:8080/job/trigger" \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"job_id": "12345"}'
```

---

These examples demonstrate how to send a **POST request** to trigger a job within a Kubernetes cluster using an internal service (`job-service.default.svc.cluster.local`). Ensure that your **service name, namespace, and port** match your actual deployment.

