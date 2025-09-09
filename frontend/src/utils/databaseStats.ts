import { supabase } from '../lib/supabaseClient'

export interface TableStats {
  tableName: string
  count: number
  success: boolean
  error?: string
}

export interface DatabaseStats {
  totalTables: number
  totalRecords: number
  tables: TableStats[]
  timestamp: string
  success: boolean
}

/**
 * 查詢單一資料表的資料筆數
 */
async function getTableCount(tableName: string): Promise<TableStats> {
  try {
    const { count, error } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true })

    if (error) {
      console.error(`❌ Failed to count ${tableName}:`, error)
      return {
        tableName,
        count: 0,
        success: false,
        error: error.message
      }
    }

    return {
      tableName,
      count: count || 0,
      success: true
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知錯誤'
    return {
      tableName,
      count: 0,
      success: false,
      error: errorMessage
    }
  }
}

/**
 * 查詢所有主要資料表的統計資訊
 */
export async function getDatabaseStats(): Promise<DatabaseStats> {
  console.log('🔍 正在查詢資料庫統計資訊...')
  
  // 定義要查詢的資料表
  const tables = [
    'profiles',           // 用戶資料表
    'energy_entries',     // 能源填報記錄
    'entry_reviews',      // 審核記錄
    'evidence_files',     // 證明檔案
    'draft_data'          // 草稿資料
  ]

  try {
    // 並行查詢所有資料表
    const tableStatsPromises = tables.map(tableName => getTableCount(tableName))
    const tableStats = await Promise.all(tableStatsPromises)

    // 計算總計
    const successfulTables = tableStats.filter(stat => stat.success)
    const totalRecords = successfulTables.reduce((sum, stat) => sum + stat.count, 0)

    const result: DatabaseStats = {
      totalTables: tables.length,
      totalRecords,
      tables: tableStats,
      timestamp: new Date().toLocaleString('zh-TW'),
      success: successfulTables.length > 0
    }

    console.log('✅ 資料庫統計查詢完成')
    console.table(tableStats.map(stat => ({
      資料表: stat.tableName,
      筆數: stat.count,
      狀態: stat.success ? '✅' : '❌'
    })))

    return result
  } catch (error) {
    console.error('❌ 查詢資料庫統計時發生錯誤:', error)
    return {
      totalTables: 0,
      totalRecords: 0,
      tables: [],
      timestamp: new Date().toLocaleString('zh-TW'),
      success: false
    }
  }
}

/**
 * 查詢用戶相關的詳細統計
 */
export async function getUserStats(): Promise<{
  totalUsers: number
  activeUsers: number
  adminUsers: number
  usersWithEntries: number
  success: boolean
  error?: string
}> {
  try {
    console.log('🔍 正在查詢用戶統計...')

    // 查詢總用戶數
    const { count: totalUsers, error: totalError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })

    if (totalError) throw totalError

    // 查詢活躍用戶數
    const { count: activeUsers, error: activeError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)

    if (activeError) throw activeError

    // 查詢管理員用戶數
    const { count: adminUsers, error: adminError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'admin')

    if (adminError) throw adminError

    // 查詢有填報記錄的用戶數
    const { data: usersWithEntriesData, error: entriesError } = await supabase
      .from('energy_entries')
      .select('owner_id')

    if (entriesError) throw entriesError

    const uniqueUserIds = new Set(usersWithEntriesData?.map(entry => entry.owner_id) || [])
    const usersWithEntries = uniqueUserIds.size

    return {
      totalUsers: totalUsers || 0,
      activeUsers: activeUsers || 0,
      adminUsers: adminUsers || 0,
      usersWithEntries,
      success: true
    }
  } catch (error) {
    console.error('❌ 查詢用戶統計時發生錯誤:', error)
    return {
      totalUsers: 0,
      activeUsers: 0,
      adminUsers: 0,
      usersWithEntries: 0,
      success: false,
      error: error instanceof Error ? error.message : '未知錯誤'
    }
  }
}

/**
 * 查詢填報相關的詳細統計
 */
export async function getSubmissionStats(): Promise<{
  totalEntries: number
  draftEntries: number
  submittedEntries: number
  approvedEntries: number
  rejectedEntries: number
  totalReviews: number
  success: boolean
  error?: string
}> {
  try {
    console.log('🔍 正在查詢填報統計...')

    // 查詢總填報數
    const { count: totalEntries, error: totalError } = await supabase
      .from('energy_entries')
      .select('*', { count: 'exact', head: true })

    if (totalError) throw totalError

    // 查詢各狀態的填報數
    const statusCounts = await Promise.all([
      supabase.from('energy_entries').select('*', { count: 'exact', head: true }).eq('status', 'draft'),
      supabase.from('energy_entries').select('*', { count: 'exact', head: true }).eq('status', 'submitted'),
      supabase.from('energy_entries').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
      supabase.from('energy_entries').select('*', { count: 'exact', head: true }).eq('status', 'rejected')
    ])

    // 查詢總審核記錄數
    const { count: totalReviews, error: reviewsError } = await supabase
      .from('entry_reviews')
      .select('*', { count: 'exact', head: true })

    if (reviewsError) throw reviewsError

    return {
      totalEntries: totalEntries || 0,
      draftEntries: statusCounts[0].count || 0,
      submittedEntries: statusCounts[1].count || 0,
      approvedEntries: statusCounts[2].count || 0,
      rejectedEntries: statusCounts[3].count || 0,
      totalReviews: totalReviews || 0,
      success: true
    }
  } catch (error) {
    console.error('❌ 查詢填報統計時發生錯誤:', error)
    return {
      totalEntries: 0,
      draftEntries: 0,
      submittedEntries: 0,
      approvedEntries: 0,
      rejectedEntries: 0,
      totalReviews: 0,
      success: false,
      error: error instanceof Error ? error.message : '未知錯誤'
    }
  }
}

/**
 * 生成完整的資料庫報告
 */
export async function generateDatabaseReport(): Promise<{
  overview: DatabaseStats
  users: Awaited<ReturnType<typeof getUserStats>>
  submissions: Awaited<ReturnType<typeof getSubmissionStats>>
  timestamp: string
}> {
  console.log('📊 正在生成完整資料庫報告...')

  const [overview, users, submissions] = await Promise.all([
    getDatabaseStats(),
    getUserStats(),
    getSubmissionStats()
  ])

  return {
    overview,
    users,
    submissions,
    timestamp: new Date().toLocaleString('zh-TW')
  }
}
