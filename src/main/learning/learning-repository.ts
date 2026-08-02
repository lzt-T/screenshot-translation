import { app } from 'electron'
import { createHash, randomUUID } from 'node:crypto'
import { join } from 'node:path'
import Database from 'better-sqlite3'
import { and, count, desc, eq, or, sql, type SQL } from 'drizzle-orm'
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import type {
  LearningItem,
  LearningItemIdentity,
  LearningItemListData,
  LearningItemQuery,
  SaveLearningItemInput
} from '../../type/learning'
import { learningItems } from './learning-schema'

// 收藏查询对外返回的字段
const LEARNING_ITEM_COLUMNS = {
  id: learningItems.id,
  kind: learningItems.kind,
  source: learningItems.source,
  originalText: learningItems.originalText,
  translatedText: learningItems.translatedText,
  translationResult: learningItems.translationResult,
  sentenceAnalysis: learningItems.sentenceAnalysis,
  createdAt: learningItems.createdAt,
  updatedAt: learningItems.updatedAt
}

/** SQLite 学习收藏仓储 */
class LearningRepository {
  // 当前 Drizzle 数据库连接
  private database: BetterSQLite3Database | null = null
  // 当前底层 SQLite 连接
  private sqliteConnection: Database.Database | null = null

  /** 初始化学习收藏数据库 */
  public initialize(): void {
    // 数据库文件路径
    const databasePath = join(app.getPath('userData'), 'bai-ze.db')
    // Drizzle 迁移目录
    const migrationsFolder = app.isPackaged
      ? join(process.resourcesPath, 'drizzle')
      : join(app.getAppPath(), 'drizzle')
    // 新建的底层 SQLite 连接
    const sqliteConnection = new Database(databasePath)
    // 新建的 Drizzle 数据库连接
    const database = drizzle(sqliteConnection)

    try {
      sqliteConnection.pragma('journal_mode = WAL')
      migrate(database, { migrationsFolder })
      this.database = database
      this.sqliteConnection = sqliteConnection
    } catch (error) {
      sqliteConnection.close()
      throw error
    }
  }

  /** 关闭学习收藏数据库 */
  public close(): void {
    this.sqliteConnection?.close()
    this.database = null
    this.sqliteConnection = null
  }

  /**
   * 查询学习收藏
   * @param query 查询条件
   * @returns 收藏列表及总数
   */
  public list(query: LearningItemQuery): LearningItemListData {
    // 可用数据库连接
    const database = this.getDatabase()
    // SQL 查询条件
    const conditions: SQL[] = []
    // 清理后的搜索词
    const normalizedQuery = query.query?.trim()

    if (normalizedQuery) {
      // 转义后的模糊搜索参数
      const searchPattern = `%${this.escapeLikePattern(normalizedQuery)}%`
      conditions.push(
        or(
          sql`${learningItems.originalText} LIKE ${searchPattern} ESCAPE '\\' COLLATE NOCASE`,
          sql`${learningItems.translatedText} LIKE ${searchPattern} ESCAPE '\\' COLLATE NOCASE`
        )!
      )
    }
    if (query.kind) {
      conditions.push(eq(learningItems.kind, query.kind))
    }

    // 最终查询条件
    const whereCondition = conditions.length > 0 ? and(...conditions) : undefined
    // 查询结果
    const rows = database
      .select(LEARNING_ITEM_COLUMNS)
      .from(learningItems)
      .where(whereCondition)
      .orderBy(desc(learningItems.updatedAt))
      .all()
    // 全部收藏数量
    const total = database.select({ value: count() }).from(learningItems).get()?.value ?? 0

    return {
      items: rows,
      total
    }
  }

  /**
   * 保存或更新学习收藏
   * @param input 学习收藏内容
   * @returns 保存后的收藏记录
   */
  public save(input: SaveLearningItemInput): LearningItem {
    // 可用数据库连接
    const database = this.getDatabase()
    // 清理后的原文
    const originalText = input.originalText.trim()
    // 清理后的译文
    const translatedText = input.translatedText.trim()
    if (!originalText || !translatedText) {
      throw new Error('原文或译文为空，无法收藏')
    }

    // 收藏去重键
    const dedupKey = this.createDedupKey({ ...input, originalText, translatedText })
    // 当前时间
    const currentTime = Date.now()
    // 新收藏记录 ID
    const itemId = randomUUID()
    // 保存后的收藏记录
    const savedItem = database
      .insert(learningItems)
      .values({
        id: itemId,
        dedupKey,
        kind: input.kind,
        source: input.source,
        originalText,
        translatedText,
        translationResult: input.translationResult ?? null,
        sentenceAnalysis: input.sentenceAnalysis ?? null,
        createdAt: currentTime,
        updatedAt: currentTime
      })
      .onConflictDoUpdate({
        target: learningItems.dedupKey,
        set: {
          originalText,
          translatedText,
          translationResult: input.translationResult ?? null,
          sentenceAnalysis: input.sentenceAnalysis ?? null,
          updatedAt: currentTime
        }
      })
      .returning(LEARNING_ITEM_COLUMNS)
      .get()
    return savedItem
  }

  /**
   * 查找指定学习收藏
   * @param identity 收藏身份信息
   * @returns 已收藏记录或空值
   */
  public find(identity: LearningItemIdentity): LearningItem | null {
    // 收藏去重键
    const dedupKey = this.createDedupKey(identity)
    // 匹配的数据库行
    const item = this.getDatabase()
      .select(LEARNING_ITEM_COLUMNS)
      .from(learningItems)
      .where(eq(learningItems.dedupKey, dedupKey))
      .get()
    return item ?? null
  }

  /**
   * 删除指定学习收藏
   * @param itemId 收藏记录 ID
   * @returns 是否删除了记录
   */
  public remove(itemId: string): boolean {
    // 被删除记录
    const removedItem = this.getDatabase()
      .delete(learningItems)
      .where(eq(learningItems.id, itemId))
      .returning({ id: learningItems.id })
      .get()
    return Boolean(removedItem)
  }

  /**
   * 获取可用数据库连接
   * @returns SQLite 数据库连接
   */
  private getDatabase(): BetterSQLite3Database {
    if (!this.database) {
      throw new Error('收藏数据暂不可用')
    }
    return this.database
  }

  /**
   * 生成收藏去重键
   * @param identity 收藏身份信息
   * @returns SHA-256 去重键
   */
  private createDedupKey(identity: LearningItemIdentity): string {
    // 规范化后的去重内容
    const normalizedContent = [
      identity.source,
      identity.kind,
      this.normalizeText(identity.originalText),
      this.normalizeText(identity.translatedText)
    ].join('\u0000')
    return createHash('sha256').update(normalizedContent).digest('hex')
  }

  /**
   * 规范化用于去重的文本
   * @param text 原始文本
   * @returns 规范化文本
   */
  private normalizeText(text: string): string {
    return text.trim().replace(/\s+/g, ' ').toLocaleLowerCase()
  }

  /**
   * 转义 LIKE 查询特殊字符
   * @param value 原始搜索词
   * @returns 可安全用于 LIKE 的搜索词
   */
  private escapeLikePattern(value: string): string {
    return value.replace(/[\\%_]/g, '\\$&')
  }
}

// 全局学习收藏仓储
export const learningRepository = new LearningRepository()
