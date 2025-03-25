export interface ClientConfig {
  serverUrl?: string;
  appId: string | number;
  env?: 'prod' | 'dev';
  token?: string;
  requiresAuth?: boolean;
}

export interface Entity {
  id: string;
  [key: string]: any;
}

export interface FilterOptions {
  sort?: string;
  limit?: number;
  skip?: number;
  fields?: string[] | string;
}

export interface EntityMethods {
  list(sort?: string, limit?: number, skip?: number, fields?: string[] | string): Promise<Entity[]>;
  filter(query: any, sort?: string, limit?: number, skip?: number, fields?: string[] | string): Promise<Entity[]>;
  get(id: string): Promise<Entity>;
  create(data: Record<string, any>): Promise<Entity>;
  update(id: string, data: Record<string, any>): Promise<Entity>;
  delete(id: string): Promise<void>;
  deleteMany(query: Record<string, any>): Promise<void>;
  bulkCreate(data: Record<string, any>[]): Promise<Entity[]>;
  importEntities(file: File): Promise<any>;
}

export interface EntitiesModule {
  [entityName: string]: EntityMethods;
}

export interface IntegrationEndpoint {
  (data: Record<string, any>): Promise<any>;
}

export interface IntegrationsPackage {
  [endpointName: string]: IntegrationEndpoint;
}

export interface IntegrationsModule {
  [packageName: string]: IntegrationsPackage;
}

export interface AuthModule {
  me(): Promise<Entity>;
  updateMe(data: Record<string, any>): Promise<Entity>;
  login(nextUrl?: string): void;
  logout(redirectUrl?: string): Promise<void>;
  setToken(token: string, saveToStorage?: boolean): void;
  isAuthenticated(): Promise<boolean>;
}

export interface Base44Client {
  entities: EntitiesModule;
  integrations: IntegrationsModule;
  auth: AuthModule;
  setToken(token: string): void;
  getConfig(): {
    serverUrl: string;
    appId: string | number;
    env: string;
    requiresAuth: boolean;
  };
}

export class Base44Error extends Error {
  status?: number;
  code?: string;
  data?: any;
  originalError?: Error;
  
  constructor(
    message: string,
    status?: number,
    code?: string,
    data?: any,
    originalError?: Error
  );
}

export function createClient(config: ClientConfig): Base44Client; 