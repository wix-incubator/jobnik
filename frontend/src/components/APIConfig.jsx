
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function APIConfig({ onTestConnection }) {
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionOk, setConnectionOk] = useState(false);
  const [error, setError] = useState("");

  // Relative path used for health check
  const backendHealthEndpoint = "/api/healthz";

  const testConnection = async () => {
    setIsTestingConnection(true);
    setConnectionOk(false);
    setError("");

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(backendHealthEndpoint, {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        if (data.status === "healthy" || data.status === "up") {
          setConnectionOk(true);
          if (onTestConnection) onTestConnection(true);
        } else {
          throw new Error("Backend service is not healthy");
        }
      } else {
        throw new Error(`Backend returned status: ${response.status}`);
      }
    } catch (error) {
      console.error("Connection test failed:", error);

      let errorMessage = "Connection failed: ";
      if (error.name === 'AbortError') {
        errorMessage += "Connection timed out. Please check if the server is running and accessible.";
      } else if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        errorMessage += "Could not connect to backend. Common issues:\n" +
          "• Backend server is not running\n" +
          "• CORS is not enabled on the backend\n" +
          "• Network/firewall blocking the connection";
      } else {
        errorMessage += error.message;
      }

      setError(errorMessage);
      if (onTestConnection) onTestConnection(false);
    } finally {
      setIsTestingConnection(false);
    }
  };

  // Optionally test on mount
  useEffect(() => {
    testConnection();
  }, []);

  return (
    <Card>
      {/* <CardHeader>
        <CardTitle className="flex items-center gap-2 width-full">
          API Configuration
          {connectionOk && <CheckCircle className="w-4 h-4 text-green-500" />}
        </CardTitle>
      </CardHeader> */}
      {/* <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Backend API URL</Label>
            <Input
              value={window.location.origin + backendHealthEndpoint.replace("/healthz", "")}
              disabled
              className="text-muted-foreground"
            />
            <Button 
              onClick={testConnection}
              disabled={isTestingConnection}
              className={connectionOk ? "bg-green-600 hover:bg-green-700" : ""}
            >
              {isTestingConnection ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : connectionOk ? (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Connected
                </>
              ) : (
                "Test Connection"
              )}
            </Button>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="whitespace-pre-line">{error}</AlertDescription>
            </Alert>
          )}

          {connectionOk && (
            <Alert className="bg-green-50 text-green-800 border-green-200">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Successfully connected to the backend API
              </AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent> */}
    </Card>
  );
}
