import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { executeQuery } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: '请先登录' },
        { status: 401 }
      )
    }

    const userId = parseInt(session.user.id)    // 获取用户可用的存储策略
    const userStorageQuery = `
      SELECT 
        ss.id,
        ss.name,
        ss.type,
        ss.status,
        usa.is_default as is_user_default,
        ss.configs as config
      FROM strategies ss
      INNER JOIN user_storage_assignments usa ON ss.id = usa.strategy_id
      WHERE usa.user_id = ? AND ss.status = 'active'
      ORDER BY usa.is_default DESC, ss.created_at ASC
    `

    const strategies = await executeQuery(userStorageQuery, [userId])

    // 如果用户没有分配的存储策略，返回默认本地存储
    if (!strategies || strategies.length === 0) {      // 检查是否有默认的本地存储策略
      const defaultLocalQuery = `
        SELECT id, name, type, status
        FROM strategies 
        WHERE type = 'local' AND status = 'active'
        LIMIT 1
      `
      const defaultLocal = await executeQuery(defaultLocalQuery, [])
      
      if (defaultLocal && defaultLocal.length > 0) {
        return NextResponse.json({
          success: true,
          strategies: [
            {
              ...defaultLocal[0],
              is_user_default: true
            }
          ]
        })
      }
      
      // 如果没有任何存储策略，返回默认配置
      return NextResponse.json({
        success: true,
        strategies: [
          {
            id: 1,
            name: '本地存储',
            type: 'local',
            status: 'active',
            is_user_default: true
          }
        ]
      })
    }

    // 处理配置信息，移除敏感数据
    const sanitizedStrategies = strategies.map((strategy: any) => ({
      id: strategy.id,
      name: strategy.name,
      type: strategy.type,
      status: strategy.status,
      is_user_default: Boolean(strategy.is_user_default)
    }))

    return NextResponse.json({
      success: true,
      strategies: sanitizedStrategies
    })

  } catch (error) {
    console.error('获取存储策略失败:', error)
    return NextResponse.json(
      { success: false, error: '获取存储策略失败' },
      { status: 500 }
    )
  }
}
