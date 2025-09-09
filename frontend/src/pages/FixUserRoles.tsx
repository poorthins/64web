import React, { useState } from 'react'
import { checkUserRoles, fixUserRoles, createMissingProfiles } from '../utils/fixUserRoles'

const FixUserRoles = () => {
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<string[]>([])

  const addResult = (message: string) => {
    setResults(prev => [...prev, message])
    console.log(message)
  }

  const handleCheckRoles = async () => {
    setLoading(true)
    setResults([])
    
    try {
      addResult('🔍 Checking user roles...')
      const profiles = await checkUserRoles()
      
      if (profiles && profiles.length > 0) {
        addResult(`✅ Found ${profiles.length} profiles:`)
        profiles.forEach(profile => {
          addResult(`  - ${profile.email}: ${profile.role} (active: ${profile.is_active})`)
        })
      } else {
        addResult('⚠️ No profiles found')
      }
    } catch (error) {
      addResult(`❌ Error: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const handleFixRoles = async () => {
    setLoading(true)
    setResults([])
    
    try {
      addResult('🔧 Fixing user roles...')
      await fixUserRoles()
      addResult('✅ Role fixing completed')
    } catch (error) {
      addResult(`❌ Error: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateProfiles = async () => {
    setLoading(true)
    setResults([])
    
    try {
      addResult('🔧 Creating missing profiles...')
      await createMissingProfiles()
      addResult('✅ Profile creation completed')
    } catch (error) {
      addResult(`❌ Error: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Fix User Roles</h1>
      
      <div className="space-y-4 mb-6">
        <button
          onClick={handleCheckRoles}
          disabled={loading}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {loading ? 'Checking...' : 'Check User Roles'}
        </button>
        
        <button
          onClick={handleCreateProfiles}
          disabled={loading}
          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50 ml-2"
        >
          {loading ? 'Creating...' : 'Create Missing Profiles'}
        </button>
        
        <button
          onClick={handleFixRoles}
          disabled={loading}
          className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded disabled:opacity-50 ml-2"
        >
          {loading ? 'Fixing...' : 'Fix User Roles'}
        </button>
      </div>

      <div className="bg-gray-100 p-4 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Results:</h2>
        <div className="space-y-1 font-mono text-sm">
          {results.length === 0 ? (
            <p className="text-gray-500">Click a button to see results...</p>
          ) : (
            results.map((result, index) => (
              <div key={index} className="whitespace-pre-wrap">
                {result}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h3 className="font-semibold text-yellow-800 mb-2">Instructions:</h3>
        <ol className="list-decimal list-inside space-y-1 text-yellow-700">
          <li>First click "Check User Roles" to see current state</li>
          <li>If profiles are missing, click "Create Missing Profiles"</li>
          <li>Then click "Fix User Roles" to set correct roles (a1=admin, b1=user)</li>
          <li>Finally check roles again to verify the fix</li>
        </ol>
      </div>
    </div>
  )
}

export default FixUserRoles
