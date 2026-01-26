import { defineConfig } from 'orval';

export default defineConfig({
  octane: {
    output: {
      mode: 'tags-split', // Separates logic by controller (Shifts, Auth, etc.)
      target: 'features/api/generated.ts',
      schemas: 'features/api/model',
      client: 'react-query',
      override: {
        mutator: {
          path: './lib/axios.ts', // Points to the file we just made
          name: 'customInstance',
        },
      },
    },
    input: {
      // Use the docs URL from your running Laravel backend
      target: 'http://petrol-integrity-system.test/docs/api.json', 
    },
  },
});