package kubernetes

import (
	"context"

	batchv1 "k8s.io/api/batch/v1"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// JobInfo represents the simplified job information
type JobInfo struct {
	Name           string       `json:"name"`
	Namespace      string       `json:"namespace"`
	Status         string       `json:"status"`
	StartTime      *metav1.Time `json:"startTime,omitempty"`
	CompletionTime *metav1.Time `json:"completionTime,omitempty"`
	ContainerImage string       `json:"containerImage"`
	Command        []string     `json:"command"`
}

// ListJobs gets all jobs in the given namespace
func (c *Client) ListJobs(namespace string) ([]JobInfo, error) {
	// Use "" to list jobs from all namespaces
	if namespace == "" {
		namespace = metav1.NamespaceAll
	}

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
			Name:           job.Name,
			Namespace:      job.Namespace,
			Status:         status,
			StartTime:      job.Status.StartTime,
			CompletionTime: job.Status.CompletionTime,
			ContainerImage: containerImage,
			Command:        command,
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
			BackoffLimit: new(int32),
		},
	}

	createdJob, err := c.Clientset.BatchV1().Jobs(namespace).Create(context.TODO(), job, metav1.CreateOptions{})
	if err != nil {
		return nil, err
	}

	return &JobInfo{
		Name:           createdJob.Name,
		Namespace:      createdJob.Namespace,
		Status:         "Pending",
		ContainerImage: image,
		Command:        command,
	}, nil
}

// getJobStatus determines the status of a job
func getJobStatus(job batchv1.Job) string {
	if job.Status.CompletionTime != nil {
		return "Completed"
	}

	if job.Status.Active > 0 {
		return "Running"
	}

	if job.Status.Failed > 0 {
		return "Failed"
	}

	return "Pending"
}
