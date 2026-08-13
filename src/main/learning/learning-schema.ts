import { desc, sql } from 'drizzle-orm'
import { check, index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import type { LearningAnalysis, TranslateResponse } from '../../type/base'
import type { LearningItemKind, LearningItemSource } from '../../type/learning'

// Drizzle 学习收藏表结构
export const learningItems = sqliteTable(
  'learning_items',
  {
    id: text('id').primaryKey(),
    dedupKey: text('dedup_key').notNull().unique(),
    kind: text('kind').$type<LearningItemKind>().notNull(),
    source: text('source').$type<LearningItemSource>().notNull(),
    originalText: text('original_text').notNull(),
    translatedText: text('translated_text').notNull(),
    translationResult: text('translation_result_json', { mode: 'json' }).$type<TranslateResponse>(),
    sentenceAnalysis: text('sentence_analysis_json', { mode: 'json' }).$type<LearningAnalysis>(),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull()
  },
  (table) => [
    check('learning_items_kind_check', sql`${table.kind} IN ('word', 'sentence')`),
    check('learning_items_source_check', sql`${table.source} IN ('text', 'screenshot')`),
    index('learning_items_kind_index').on(table.kind),
    index('learning_items_updated_at_index').on(desc(table.updatedAt))
  ]
)
