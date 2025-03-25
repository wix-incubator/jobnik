import { createClient } from '@base44/sdk';
// import { getAccessToken } from '@base44/sdk/utils/auth-utils';

// Create a client with authentication required
export const base44 = createClient({
  appId: "67e12bed4d84aa18a99d4af8", 
  requiresAuth: true // Ensure authentication is required for all operations
});
