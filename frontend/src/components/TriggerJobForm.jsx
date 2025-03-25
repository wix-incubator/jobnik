import React from "react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AlertCircle, Plus, Trash } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function TriggerJobForm({ onSubmit, isLoading, disabled, existingJobs }) {
  const [jobName, setJobName] = React.useState("");
  const [namespace, setNamespace] = React.useState("default");
  const [envVars, setEnvVars] = React.useState([{ key: "", value: "" }]);
  const [args, setArgs] = React.useState([""]);
  const [error, setError] = React.useState("");

  // Get unique list of namespaces from existing jobs
  const availableNamespaces = React.useMemo(() => {
    if (!existingJobs) return ["default"];
    return [...new Set(existingJobs.map(job => job.namespace))];
  }, [existingJobs]);

  // Get jobs for the selected namespace
  const jobsInNamespace = React.useMemo(() => {
    if (!existingJobs) return [];
    return existingJobs.filter(job => job.namespace === namespace);
  }, [existingJobs, namespace]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    if (!jobName.trim()) {
      setError("Job name is required");
      return;
    }

    // Filter out empty env vars
    const filteredEnvVars = envVars
      .filter(env => env.key.trim() && env.value.trim())
      .reduce((acc, env) => {
        acc[env.key.trim()] = env.value.trim();
        return acc;
      }, {});

    // Filter out empty args
    const filteredArgs = args.filter(arg => arg.trim());

    onSubmit({
      jobName: jobName.trim(),
      namespace: namespace.trim(),
      envVars: filteredEnvVars,
      args: filteredArgs
    });
  };

  const addEnvVar = () => {
    setEnvVars([...envVars, { key: "", value: "" }]);
  };

  const removeEnvVar = (index) => {
    setEnvVars(envVars.filter((_, i) => i !== index));
  };

  const addArg = () => {
    setArgs([...args, ""]);
  };

  const removeArg = (index) => {
    setArgs(args.filter((_, i) => i !== index));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Trigger New Job</CardTitle>
      </CardHeader>
      <CardContent>
        {disabled && (
          <Alert className="mb-6 bg-yellow-50 text-yellow-800 border-yellow-200">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please connect to the backend API before triggering jobs
            </AlertDescription>
          </Alert>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="namespace">Namespace</Label>
              <Select 
                value={namespace} 
                onValueChange={setNamespace}
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select namespace" />
                </SelectTrigger>
                <SelectContent>
                  {availableNamespaces.map((ns) => (
                    <SelectItem key={ns} value={ns}>
                      {ns}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="jobName">Job Template</Label>
              <Select 
                value={jobName} 
                onValueChange={setJobName}
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a job template" />
                </SelectTrigger>
                <SelectContent>
                  {jobsInNamespace.map((job) => (
                    <SelectItem key={job.name} value={job.name}>
                      {job.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Environment Variables</Label>
              {envVars.map((env, index) => (
                <div key={index} className="flex gap-2 mt-2">
                  <Input
                    placeholder="Key"
                    value={env.key}
                    onChange={(e) => {
                      const newEnvVars = [...envVars];
                      newEnvVars[index].key = e.target.value;
                      setEnvVars(newEnvVars);
                    }}
                    disabled={disabled}
                  />
                  <Input
                    placeholder="Value"
                    value={env.value}
                    onChange={(e) => {
                      const newEnvVars = [...envVars];
                      newEnvVars[index].value = e.target.value;
                      setEnvVars(newEnvVars);
                    }}
                    disabled={disabled}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeEnvVar(index)}
                    disabled={disabled}
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addEnvVar}
                className="mt-2"
                disabled={disabled}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Environment Variable
              </Button>
            </div>

            <div className="space-y-2">
              <Label>Command Arguments</Label>
              {args.map((arg, index) => (
                <div key={index} className="flex gap-2 mt-2">
                  <Input
                    placeholder="Argument"
                    value={arg}
                    onChange={(e) => {
                      const newArgs = [...args];
                      newArgs[index] = e.target.value;
                      setArgs(newArgs);
                    }}
                    disabled={disabled}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeArg(index)}
                    disabled={disabled}
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addArg}
                className="mt-2"
                disabled={disabled}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Argument
              </Button>
            </div>
          </div>

          <CardFooter className="px-0">
            <Button 
              type="submit" 
              disabled={isLoading || disabled || !jobName} 
              className="w-full"
            >
              {isLoading ? "Triggering..." : "Trigger Job"}
            </Button>
          </CardFooter>
        </form>
      </CardContent>
    </Card>
  );
}