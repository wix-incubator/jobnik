
<div align="center">
  <img src="jobnik-logo.webp" alt="Centered Logo" style="width: 250px;">
</div>

# Jobnik: A Kubernetes-Native Job Triggering Service

**Jobnik** is a lightweight web service that enables triggering, listing, monitoring, and retrieving logs from Kubernetes Jobs via a REST API. Ideal for event-driven workflows, CI/CD pipelines, and custom job execution needs.

---

<div align="center">
  <img src="documentation/Screenshot 2025-03-28 at 9.10.02.png" alt="Centered Logo" style="width: 1000px;">
</div>

<div align="center">
  <img src="documentation/Screenshot 2025-03-28 at 9.10.23.png" alt="Centered Logo" style="width: 1000px;">
</div>

---
## 🚀 Features

- ✅ Trigger Kubernetes jobs with **custom environment variables and arguments**
- 🆕 Jobnik UI. TBD
- 🆕 List jobs with **pagination and metadata**
- 🆕 Fetch **logs from job pods**
- 🔁 Automatically generates unique job names
- 🧼 Cleans up completed jobs 30 seconds after success

---

## 🧱 Prerequisites

- ✅ A Kubernetes cluster with appropriate **RBAC permissions** to create, list, and delete jobs
- ✅ A base **Job template** deployed in your cluster
- ✅ Docker image for your job logic
- ✅ Optionally, use **ArgoCD** for managing Jobnik deployments

---

## 📦 Installation (Helm)

```bash
helm install jobnik ./helm/jobnik
```

### Default Configuration

- 1 replica
- RBAC enabled
- Resource requests: 128Mi memory, 64m CPU
- Exposed as a ClusterIP service on port `80` targeting port `8080`

---

## 📚 API Endpoints

### 1. **Trigger a Job**  
`POST /api/job`

Creates and runs a new Kubernetes job based on an existing template.

#### Request Body

| Field       | Type              | Required | Description                             |
|-------------|-------------------|----------|-----------------------------------------|
| `jobName`   | string            | ✅ Yes   | Base Job name to clone and trigger      |
| `namespace` | string            | ✅ Yes   | Namespace where job will run            |
| `envVars`   | object (string)   | ❌ No    | Key-value pairs of environment variables |
| `args`      | array of strings  | ❌ No    | Command-line arguments to pass to job   |

#### Example Request (cURL)
```bash
curl -X POST http://localhost:8080/api/job   -H "Content-Type: application/json"   -d '{
    "jobName": "test-job",
    "namespace": "default",
    "envVars": {
      "LOG_LEVEL": "debug",
      "TIMEOUT": "30s"
    },
    "args": ["--export", "--dry-run"]
  }'
```

#### Response
```json
{
  "message": "Job test-job-run-1712345678-1234 triggered successfully",
  "jobName": "test-job-run-1712345678-1234",
  "namespace": "default"
}
```

---

### 2. **List Jobs**  
`GET /api/jobs`

Fetches jobs with optional pagination and namespace filtering.

#### Query Parameters

| Field       | Type   | Required | Description                             |
|-------------|--------|----------|-----------------------------------------|
| `namespace` | string | ❌ No    | Namespace to list jobs from (or `all`)  |
| `limit`     | int    | ❌ No    | Max number of jobs to return (default: 10) |
| `offset`    | int    | ❌ No    | Pagination offset (default: 0)          |

#### Example Request
```bash
curl "http://localhost:8080/api/jobs?namespace=default&limit=5&offset=0"
```

#### Response Headers
```
X-Total-Count: 25
X-Limit: 5
X-Offset: 0
```

#### JSON Response
```json
{
  "total": 25,
  "limit": 5,
  "offset": 0,
  "count": 5,
  "jobs": [
    {
      "name": "test-job-run-1712345678-0001",
      "status": "succeeded"
    }
  ]
}
```

---

### 3. **Get Job Logs**  
`GET /api/job/logs`

Fetch logs from a pod belonging to a Kubernetes job.

#### Query Parameters

| Field       | Type   | Required | Description                                |
|-------------|--------|----------|--------------------------------------------|
| `jobName`   | string | ✅ Yes   | Name of the job                            |
| `namespace` | string | ❌ No    | Namespace (default: `default`)             |
| `container` | string | ❌ No    | Container name (if job has multiple)       |

#### Example Request
```bash
curl "http://localhost:8080/api/job/logs?jobName=test-job-run-1712345678&namespace=default"
```

#### JSON Response
```json
{
  "jobName": "test-job-run-1712345678",
  "namespace": "default",
  "logs": "Starting job...
Step 1 done...
Job completed."
}
```

---

## 🧪 Sample Usage

### 🔧 Inside Kubernetes (Internal Cluster Access)

Replace `job-service.default.svc.cluster.local` with your actual service name.

### ✅ Python
```python
import requests

url = "http://job-service.default.svc.cluster.local:8080/api/job"
payload = {
  "jobName": "test-job",
  "namespace": "default",
  "envVars": {
    "LOG_LEVEL": "debug"
  },
  "args": ["--export"]
}
headers = {"Content-Type": "application/json"}
response = requests.post(url, json=payload, headers=headers)
print(response.json())
```

---

### ✅ Go
```go
package main

import (
  "bytes"
  "encoding/json"
  "fmt"
  "net/http"
)

func main() {
  data := map[string]interface{}{
    "jobName":   "test-job",
    "namespace": "default",
    "envVars": map[string]string{
      "LOG_LEVEL": "debug",
    },
    "args": []string{"--dry-run"},
  }

  jsonData, _ := json.Marshal(data)
  req, _ := http.NewRequest("POST", "http://job-service.default.svc.cluster.local:8080/api/job", bytes.NewBuffer(jsonData))
  req.Header.Set("Content-Type", "application/json")

  client := &http.Client{}
  resp, _ := client.Do(req)
  fmt.Println("Status:", resp.StatusCode)
}
```

---

### ✅ cURL
```bash
curl -X POST "http://job-service.default.svc.cluster.local:8080/api/job"      -H "Content-Type: application/json"      -d '{
        "jobName": "test-job",
        "namespace": "default",
        "envVars": {
            "LOG_LEVEL": "debug"
        },
        "args": ["--dry-run"]
     }'
```

---

## 📌 Notes

- Make sure the base job you're cloning is **pre-created** in the target namespace.
- Jobs are monitored in the background and deleted **30 seconds after successful completion**.
- You can extend Jobnik to support more features like retries, notifications, or parallel jobs.

