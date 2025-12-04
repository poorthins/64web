/**
 * 診斷滅火器匯出問題的測試腳本
 *
 * 用法：在瀏覽器 Console 執行此腳本，查看滅火器的 entry 和檔案資料
 */

// 1. 找到滅火器的 entry
const entries = window.__DEBUG_ENTRIES__ || []
const fireExtinguisherEntry = entries.find(e => e.page_key === 'fire_extinguisher')

if (!fireExtinguisherEntry) {
  console.warn('❌ 找不到滅火器的 entry')
} else {
  console.log('✅ 找到滅火器 entry:', fireExtinguisherEntry.id)
  console.log('📋 Payload:', JSON.stringify(fireExtinguisherEntry.payload, null, 2))
  console.log('📋 ExtraPayload:', JSON.stringify(fireExtinguisherEntry.extraPayload, null, 2))

  // 2. 檢查 records
  const records = fireExtinguisherEntry.payload?.fireExtinguisherData?.usageRecords ||
                  fireExtinguisherEntry.payload?.fireExtinguisherData?.records ||
                  []
  console.log(`📊 Records (${records.length} 筆):`)
  records.forEach((r, idx) => {
    console.log(`  [${idx}] id=${r.id}, date=${r.date}, quantity=${r.quantity}, specId=${r.specId}`)
  })

  // 3. 檢查 specs
  const specs = fireExtinguisherEntry.payload?.fireExtinguisherData?.specs || []
  console.log(`🏷️ Specs (${specs.length} 個):`)
  specs.forEach(s => {
    console.log(`  - id=${s.id}, name=${s.name}`)
  })

  // 4. 獲取檔案（需要 API 調用）
  fetch(`/api/entries/${fireExtinguisherEntry.id}/files`)
    .then(r => r.json())
    .then(files => {
      console.log(`📁 Files (${files.length} 個):`)
      files.forEach(f => {
        console.log(`  - ${f.file_name}`)
        console.log(`    file_type: ${f.file_type}`)
        console.log(`    record_id: ${f.record_id || 'null'}`)
        console.log(`    record_index: ${f.record_index ?? 'null'}`)
      })

      // 5. 分類檔案
      const inspectionFiles = files.filter(f =>
        (f.file_type === 'annual_evidence' || f.file_type === 'other') && !f.record_id
      )
      const specFiles = files.filter(f =>
        f.file_type === 'other' && f.record_id && specs.some(s => s.id === f.record_id)
      )
      const recordFiles = files.filter(f =>
        f.file_type === 'other' && f.record_id && records.some(r => r.id === f.record_id)
      )

      console.log(`\n📂 檔案分類:`)
      console.log(`  檢修表 (${inspectionFiles.length}):`, inspectionFiles.map(f => f.file_name))
      console.log(`  品項佐證 (${specFiles.length}):`, specFiles.map(f => f.file_name))
      console.log(`  數量佐證 (${recordFiles.length}):`, recordFiles.map(f => f.file_name))
    })
    .catch(err => console.error('❌ 無法取得檔案:', err))
}
