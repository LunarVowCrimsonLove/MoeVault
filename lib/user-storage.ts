import { executeQuery, executeQuerySingle } from "./database"

/**
 * 为新用户自动分配默认存储策略
 * @param userId 用户ID
 */
export async function assignDefaultStorageToUser(userId: string): Promise<void> {
  try {
    // 获取所有活跃的默认存储策略
    const defaultStrategies = await executeQuery(
      `SELECT id, name, type, configs 
       FROM strategies 
       WHERE status = 'active' AND (is_default = 1 OR type = 'local')
       ORDER BY is_default DESC, id ASC`
    )

    if (defaultStrategies.length === 0) {
      console.warn('No default storage strategies found for new user:', userId)
      return
    }

    // 为用户分配默认存储策略
    for (const strategy of defaultStrategies) {
      // 检查是否已经分配过
      const existingAssignment = await executeQuerySingle(
        "SELECT id FROM user_storage_assignments WHERE user_id = ? AND strategy_id = ?",
        [userId, strategy.id]
      )

      if (!existingAssignment) {
        // 分配存储策略
        const isDefault = strategy.is_default || strategy.type === 'local'
        const quota = getDefaultQuotaForStrategy(strategy.type)

        await executeQuery(
          `INSERT INTO user_storage_assignments 
           (user_id, strategy_id, is_default, quota, is_active, created_at, updated_at) 
           VALUES (?, ?, ?, ?, 1, NOW(), NOW())`,
          [userId, strategy.id, isDefault ? 1 : 0, quota]
        )

        console.log(`✅ Assigned storage strategy '${strategy.name}' to user ${userId}`)
      }
    }

    // 确保至少有一个默认存储
    await ensureUserHasDefaultStorage(userId)

  } catch (error) {
    console.error('Error assigning default storage to user:', error)
    throw error
  }
}

/**
 * 确保用户至少有一个默认存储
 * @param userId 用户ID
 */
async function ensureUserHasDefaultStorage(userId: string): Promise<void> {
  const defaultAssignment = await executeQuerySingle(
    `SELECT id FROM user_storage_assignments 
     WHERE user_id = ? AND is_default = 1 AND is_active = 1`,
    [userId]
  )

  if (!defaultAssignment) {
    // 如果没有默认存储，将第一个活跃的分配设为默认
    const firstAssignment = await executeQuerySingle(
      `SELECT id FROM user_storage_assignments 
       WHERE user_id = ? AND is_active = 1 
       ORDER BY created_at ASC LIMIT 1`,
      [userId]
    )

    if (firstAssignment) {
      await executeQuery(
        "UPDATE user_storage_assignments SET is_default = 1 WHERE id = ?",
        [firstAssignment.id]
      )
      console.log(`✅ Set first storage assignment as default for user ${userId}`)
    }
  }
}

/**
 * 根据存储类型获取默认配额
 * @param storageType 存储类型
 * @returns 配额(GB)
 */
function getDefaultQuotaForStrategy(storageType: string): number {
  switch (storageType) {
    case 'local':
      return 0.1 // 100MB
    case 'github':
      return 1 // 1GB
    case 'onedrive':
      return 5 // 5GB
    case 'aliyun':
    case 'tencent':
    case 's3':
      return 10 // 10GB
    default:
      return 0.1 // 100MB 默认
  }
}

/**
 * 获取用户的可用存储策略
 * @param userId 用户ID
 * @returns 存储策略列表
 */
export async function getUserAvailableStorages(userId: string) {
  const assignments = await executeQuery(
    `SELECT usa.*, s.name, s.type, s.configs 
     FROM user_storage_assignments usa
     JOIN strategies s ON usa.strategy_id = s.id
     WHERE usa.user_id = ? AND usa.is_active = 1 AND s.status = 'active'
     ORDER BY usa.is_default DESC, s.name ASC`,
    [userId]
  )

  return assignments.map((assignment: any) => ({
    id: assignment.strategy_id,
    strategyId: assignment.strategy_id,
    name: assignment.name,
    type: assignment.type,
    isDefault: !!assignment.is_default,
    quota: assignment.quota,
    configs: typeof assignment.configs === 'string' 
      ? JSON.parse(assignment.configs) 
      : assignment.configs
  }))
}

/**
 * 检查用户是否有权限使用指定的存储策略
 * @param userId 用户ID
 * @param strategyId 存储策略ID
 * @returns 是否有权限
 */
export async function checkUserStoragePermission(userId: string, strategyId: number): Promise<boolean> {
  const assignment = await executeQuerySingle(
    `SELECT id FROM user_storage_assignments usa
     JOIN strategies s ON usa.strategy_id = s.id
     WHERE usa.user_id = ? AND usa.strategy_id = ? 
     AND usa.is_active = 1 AND s.status = 'active'`,
    [userId, strategyId]
  )

  return !!assignment
}
