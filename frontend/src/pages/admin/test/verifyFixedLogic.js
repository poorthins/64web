// Test the actual fixed logic to understand expected behavior

const mockSmartFileRename = (originalFileName, categoryId) => {
  const categoryNameMap = {
    'employee_commute': '員工通勤',
    'electricity_bill': '電費單'
  }

  const fileTypeMap = {
    'bill': '帳單',
    'invoice': '發票',
    'receipt': '收據'
  }

  const categoryName = categoryNameMap[categoryId] || categoryId
  const extension = originalFileName.split('.').pop() || 'pdf'
  const lowerFileName = originalFileName.toLowerCase()

  // Year files should be detected first
  if (lowerFileName.includes('annual') || lowerFileName.includes('year') || lowerFileName.includes('年度')) {
    return `${categoryName}_年度統計報告.${extension}`
  }

  // General file type detection for non-month files
  let fileType = '資料'
  for (const [key, value] of Object.entries(fileTypeMap)) {
    if (lowerFileName.includes(key)) {
      fileType = value
      break
    }
  }

  return `${categoryName}_${fileType}.${extension}`
}

console.log('Testing specific cases:')
console.log('1. annual_summary_2024.pdf with employee_commute ->', mockSmartFileRename('annual_summary_2024.pdf', 'employee_commute'))
console.log('2. invoice_bill.pdf with electricity_bill ->', mockSmartFileRename('invoice_bill.pdf', 'electricity_bill'))
console.log('3. bill_invoice.pdf with electricity_bill ->', mockSmartFileRename('bill_invoice.pdf', 'electricity_bill'))
console.log('4. file_abc123.pdf with employee_commute ->', mockSmartFileRename('file_abc123.pdf', 'employee_commute'))