# Base44 JavaScript SDK

A modern JavaScript SDK for interacting with the Base44 API. Designed to work with both JavaScript and TypeScript projects.

## Installation

```bash
npm install @base44/sdk
# or
yarn add @base44/sdk
```

## Usage

### Basic Setup

```javascript
import { createClient } from '@base44/sdk';

// Create a client instance
const base44 = createClient({
  serverUrl: 'https://base44.app', // Optional, defaults to 'https://base44.app'
  appId: 'your-app-id',  // Required
  env: 'prod',           // Optional, defaults to 'prod'
  token: 'your-token',   // Optional
  autoInitAuth: true,    // Optional, defaults to true - auto-detects tokens from URL or localStorage
});
```

### Working with Entities

```javascript
// List all products
const products = await base44.entities.Product.list();

// Filter products by category
const filteredProducts = await base44.entities.Product.filter({
  category: ['electronics', 'computers']
});

// Get a specific product
const product = await base44.entities.Product.get('product-id');

// Create a new product
const newProduct = await base44.entities.Product.create({
  name: 'New Product',
  price: 99.99,
  category: 'electronics'
});

// Update a product
const updatedProduct = await base44.entities.Product.update('product-id', {
  price: 89.99
});

// Delete a product
await base44.entities.Product.delete('product-id');

// Bulk create products
const newProducts = await base44.entities.Product.bulkCreate([
  { name: 'Product 1', price: 19.99 },
  { name: 'Product 2', price: 29.99 }
]);
```

### Working with Integrations

```javascript
// Send an email using the Core integration
const emailResult = await base44.integrations.Core.SendEmail({
  to: 'user@example.com',
  subject: 'Hello from Base44',
  body: 'This is a test email sent via the Base44 SDK'
});

// Use a custom integration
const result = await base44.integrations.CustomPackage.CustomEndpoint({
  param1: 'value1',
  param2: 'value2'
});

// Upload a file
const fileInput = document.querySelector('input[type="file"]');
const file = fileInput.files[0];
const uploadResult = await base44.integrations.Core.UploadFile({
  file,
  metadata: { type: 'profile-picture' }
});
```

## Authentication

The SDK provides comprehensive authentication capabilities to help you build secure applications.

### Creating an Authenticated Client

To create a client with authentication:

```javascript
import { createClient } from '@base44/sdk';
import { getAccessToken } from '@base44/sdk/utils/auth-utils';

// Create a client with authentication
const base44 = createClient({
  appId: 'your-app-id',
  accessToken: getAccessToken() // Automatically retrieves token from localStorage or URL
});

// Check authentication status
const isAuthenticated = await base44.auth.isAuthenticated();
console.log('Authenticated:', isAuthenticated);

// Get current user information (requires authentication)
if (isAuthenticated) {
  const user = await base44.auth.me();
  console.log('Current user:', user);
}
```

### Login and Logout

```javascript
import { createClient } from '@base44/sdk';
import { getAccessToken, saveAccessToken, removeAccessToken } from '@base44/sdk/utils/auth-utils';

const base44 = createClient({ appId: 'your-app-id' });

// Redirect to the login page
// This will redirect to: base44.app/login?from_url=http://your-app.com/dashboard&app_id=your-app-id
function handleLogin() {
  base44.auth.login('/dashboard');
}

// Handle successful login (on return from Base44 login)
function handleLoginReturn() {
  const token = getAccessToken();
  if (token) {
    console.log('Successfully logged in with token:', token);
    // The token is automatically saved to localStorage and removed from URL
  }
}

// Logout
function handleLogout() {
  removeAccessToken();
  window.location.href = '/login';
}
```

### Real-World Authentication Example (React)

Here's a complete example of implementing Base44 authentication in a React application:

```jsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { createClient } from '@base44/sdk';
import { getAccessToken, removeAccessToken } from '@base44/sdk/utils/auth-utils';

// Create AuthContext
const AuthContext = createContext(null);

// Auth Provider Component
function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [client] = useState(() => 
    createClient({ 
      appId: 'your-app-id', 
      accessToken: getAccessToken()
    })
  );

  useEffect(() => {
    async function loadUser() {
      try {
        const isAuth = await client.auth.isAuthenticated();
        if (isAuth) {
          const userData = await client.auth.me();
          setUser(userData);
        }
      } catch (error) {
        console.error('Authentication error:', error);
      } finally {
        setLoading(false);
      }
    }
    
    loadUser();
  }, [client]);

  const login = () => {
    client.auth.login(window.location.pathname);
  };

  const logout = () => {
    removeAccessToken();
    setUser(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, loading, client, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use auth context
function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Protected Route Component
function ProtectedRoute() {
  const { user, loading, login } = useAuth();
  const location = useLocation();

  // Check if we're returning from login with a token in URL
  useEffect(() => {
    const token = getAccessToken(); // This will save token from URL if present
    if (token && !user && !loading) {
      window.location.reload(); // Reload to apply the new token
    }
  }, [location, user, loading]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    // If not authenticated, redirect to login
    login();
    return <div>Redirecting to login...</div>;
  }

  // If authenticated, render the child routes
  return <Outlet />;
}

// Dashboard Component (protected)
function Dashboard() {
  const { user, client, logout } = useAuth();
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTodos() {
      try {
        // Load user-specific data using the SDK
        const items = await client.entities.Todo.filter({ 
          assignee: user.id 
        });
        setTodos(items);
      } catch (error) {
        console.error('Failed to load todos:', error);
      } finally {
        setLoading(false);
      }
    }

    loadTodos();
  }, [client, user]);

  return (
    <div>
      <h1>Welcome, {user.name}!</h1>
      <button onClick={logout}>Logout</button>
      
      <h2>Your Todos</h2>
      {loading ? (
        <div>Loading todos...</div>
      ) : (
        <ul>
          {todos.map(todo => (
            <li key={todo.id}>{todo.title}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Login Page
function LoginPage() {
  const { login, user } = useAuth();
  
  if (user) {
    return <Navigate to="/dashboard" />;
  }
  
  return (
    <div>
      <h1>Login Required</h1>
      <button onClick={login}>Login with Base44</button>
    </div>
  );
}

// App Component
function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile" element={<ProfilePage />} />
          {/* Add more protected routes here */}
        </Route>
        <Route path="/" element={<Navigate to="/dashboard" />} />
      </Routes>
    </AuthProvider>
  );
}
```

## TypeScript Support

This SDK includes TypeScript definitions out of the box:

```typescript
import { createClient, Base44Error } from '@base44/sdk';
import type { Entity, Base44Client, AuthModule } from '@base44/sdk';

// Create a typed client
const base44: Base44Client = createClient({
  appId: 'your-app-id'
});

// Using the entities module with type safety
async function fetchProducts() {
  try {
    const products: Entity[] = await base44.entities.Product.list();
    console.log(products.map(p => p.name));
    
    const product: Entity = await base44.entities.Product.get('product-id');
    console.log(product.name);
  } catch (error) {
    if (error instanceof Base44Error) {
      console.error(`Error ${error.status}: ${error.message}`);
    }
  }
}

// Authentication with TypeScript
async function handleAuth(auth: AuthModule) {
  // Check authentication
  const isAuthenticated: boolean = await auth.isAuthenticated();
  
  if (isAuthenticated) {
    // Get user info
    const user: Entity = await auth.me();
    console.log(`Logged in as: ${user.name}, Role: ${user.role}`);
    
    // Update user
    const updatedUser: Entity = await auth.updateMe({
      preferences: { theme: 'dark' }
    });
  } else {
    // Redirect to login
    auth.login('/dashboard');
  }
}

// Execute with proper typing
handleAuth(base44.auth);
```

### Advanced TypeScript Usage

You can define your own entity interfaces for better type safety:

```typescript
// Define custom entity interfaces
interface User extends Entity {
  name: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
  preferences?: {
    theme: 'light' | 'dark';
    notifications: boolean;
  };
}

interface Product extends Entity {
  name: string;
  price: number;
  category: string;
  inStock: boolean;
}

// Use your custom interfaces with the SDK
async function getLoggedInUser(): Promise<User | null> {
  const base44 = createClient({ appId: 'your-app-id' });
  
  try {
    const user = await base44.auth.me() as User;
    return user;
  } catch (error) {
    console.error('Failed to get user:', error);
    return null;
  }
}

// Use with React hooks
function useBase44User() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  
  useEffect(() => {
    const base44 = createClient({ appId: 'your-app-id' });
    
    async function fetchUser() {
      try {
        const userData = await base44.auth.me() as User;
        setUser(userData);
      } catch (error) {
        console.error('Auth error:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchUser();
  }, []);
  
  return { user, loading };
}
```

## Error Handling

The SDK provides a custom `Base44Error` class for error handling:

```javascript
import { createClient, Base44Error } from '@base44/sdk';

const base44 = createClient({ appId: 'your-app-id' });

try {
  const result = await base44.entities.NonExistentEntity.list();
} catch (error) {
  if (error instanceof Base44Error) {
    console.error(`Status: ${error.status}`);
    console.error(`Message: ${error.message}`);
    console.error(`Code: ${error.code}`);
    console.error(`Data: ${JSON.stringify(error.data)}`);
  } else {
    console.error('Unexpected error:', error);
  }
}
```

## Testing

The SDK includes comprehensive tests to ensure reliability.

### Running Tests

```bash
# Run all tests
npm test

# Run unit tests only (no API calls)
npm run test:unit

# Run end-to-end tests (requires API access)
npm run test:e2e

# Run tests with coverage report
npm run test:coverage
```

### Setting Up E2E Tests

E2E tests require access to a Base44 API. To run these tests:

1. Copy `tests/.env.example` to `tests/.env`
2. Fill in your Base44 API credentials in the `.env` file:
   ```
   BASE44_SERVER_URL=https://base44.app
   BASE44_APP_ID=your_app_id_here
   BASE44_AUTH_TOKEN=your_auth_token_here
   ```

3. Optionally, set `SKIP_E2E_TESTS=true` to skip E2E tests.

### Writing Your Own Tests

You can use the provided test utilities for writing your own tests:

```javascript
const { createClient } = require('@base44/sdk');
const { getTestConfig } = require('@base44/sdk/tests/utils/test-config');

describe('My Tests', () => {
  let base44;
  
  beforeAll(() => {
    const config = getTestConfig();
    base44 = createClient({
      serverUrl: config.serverUrl,
      appId: config.appId,
    });
    
    if (config.token) {
      base44.setToken(config.token);
    }
  });
  
  test('My test', async () => {
    const todos = await base44.entities.Todo.filter({}, 10);
    expect(Array.isArray(todos)).toBe(true);
    expect(todos.length).toBeGreaterThan(0);
  });
});
```

## License

MIT 