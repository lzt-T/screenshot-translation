import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect: 'sqlite',
  schema: './src/main/learning/learning-schema.ts',
  out: './drizzle'
})
