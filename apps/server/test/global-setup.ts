import type { TestProject } from 'vitest/node';

declare module 'vitest' {
  export interface ProvidedContext {
    mongoUri: string;
  }
}

/**
 * Uses MONGODB_TEST_URI when provided (e.g. a local Docker MongoDB); otherwise starts a
 * throwaway in-memory MongoDB. Each test file then works in its own database.
 */
export default async function setup(project: TestProject) {
  const externalUri = process.env.MONGODB_TEST_URI;
  if (externalUri) {
    project.provide('mongoUri', externalUri);
    return;
  }

  const { MongoMemoryServer } = await import('mongodb-memory-server');
  const server = await MongoMemoryServer.create();
  project.provide('mongoUri', server.getUri());
  return async () => {
    await server.stop();
  };
}
