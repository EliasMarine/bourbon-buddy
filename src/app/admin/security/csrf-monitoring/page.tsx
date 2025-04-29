import { getRecentSecurityEvents } from '@/lib/security-monitoring'
import { supabase } from '@/lib/supabase'
import { formatDistanceToNow } from 'date-fns'
import { CsrfClientTest } from './client-test'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface SecurityEvent {
  id: string
  type: string
  severity: string
  timestamp: Date
  userId: string | null
  ip: string | null
  userAgent: string | null
  metadata: string | null
  createdAt: Date
}

export default async function CsrfMonitoringPage() {
  // Get recent CSRF validation failures
  const csrfEvents = await getRecentSecurityEvents({
    types: ['csrf_validation_failure'],
    limit: 50
  })
  
  // Get potential attack events
  const attackEvents = await getRecentSecurityEvents({
    types: ['suspicious_activity'],
    minSeverity: 'high',
    limit: 20
  })
  
  // Get stats for the dashboard
  const stats = await getSecurityStats()
  
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">CSRF Security Monitoring</h1>
      
      {/* Client Side CSRF Test */}
      <CsrfClientTest />
      
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <StatCard 
          label="Total CSRF Failures" 
          value={stats.totalCsrfFailures} 
          change={stats.csrfFailureChange}
          changeLabel="vs prev period"
        />
        <StatCard 
          label="Unique IPs" 
          value={stats.uniqueIps} 
        />
        <StatCard 
          label="Potential Attacks" 
          value={stats.potentialAttacks}
          isNegative={true} 
        />
        <StatCard 
          label="Success Rate" 
          value={`${stats.successRate}%`}
          isPositive={stats.successRate > 95}
          isNegative={stats.successRate < 90}
        />
      </div>
      
      {/* Attack Alerts */}
      {attackEvents.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4 text-red-600">⚠️ Potential Attack Alerts</h2>
          <div className="bg-red-50 border border-red-200 rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-red-200">
              <thead className="bg-red-100">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-red-800 uppercase tracking-wider">Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-red-800 uppercase tracking-wider">IP Address</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-red-800 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-red-800 uppercase tracking-wider">Details</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-red-200">
                {attackEvents.map((event: SecurityEvent) => {
                  const metadata = event.metadata ? JSON.parse(event.metadata) : {}
                  return (
                    <tr key={event.id} className="hover:bg-red-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {event.ip || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {event.type}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {metadata.reason === 'multiple_csrf_failures' && (
                          <span>
                            {metadata.failureCount} failures in {metadata.timeWindow} on {metadata.endpoint || 'unknown endpoint'}
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {/* Recent CSRF Failures */}
      <div>
        <h2 className="text-xl font-bold mb-4">Recent CSRF Validation Failures</h2>
        <div className="bg-white shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IP Address</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Endpoint</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User Agent</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {csrfEvents.map((event: SecurityEvent) => {
                const metadata = event.metadata ? JSON.parse(event.metadata) : {}
                return (
                  <tr key={event.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {event.ip || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {metadata.endpoint || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 truncate max-w-xs">
                      {event.userAgent ? (
                        <span title={event.userAgent}>
                          {event.userAgent.substring(0, 50)}...
                        </span>
                      ) : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {metadata.reason || 'Unknown reason'}
                    </td>
                  </tr>
                )
              })}
              
              {csrfEvents.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                    No CSRF validation failures recorded. That's good news!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// Stat card component for the dashboard
function StatCard({ 
  label, 
  value, 
  change, 
  changeLabel = 'change',
  isPositive = false,
  isNegative = false
}: { 
  label: string, 
  value: string | number, 
  change?: number,
  changeLabel?: string,
  isPositive?: boolean,
  isNegative?: boolean
}) {
  let changeColor = 'text-gray-500'
  if (isPositive || (change !== undefined && change > 0)) changeColor = 'text-green-600'
  if (isNegative || (change !== undefined && change < 0)) changeColor = 'text-red-600'

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <p className="text-sm font-medium text-gray-500 truncate">{label}</p>
      <p className="mt-1 text-3xl font-semibold text-gray-900">{value}</p>
      {change !== undefined && (
        <p className={`mt-1 text-sm ${changeColor} flex items-center`}>
          {change > 0 ? '↑' : '↓'} {Math.abs(change)}% {changeLabel}
        </p>
      )}
    </div>
  )
}

// Get statistics for the security dashboard
async function getSecurityStats() {
  const now = new Date()
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)
  
  // Count CSRF failures in the last day
  const { count: totalCsrfFailures } = await supabase
    .from('SecurityEvent')
    .select('*', { count: 'exact', head: true })
    .eq('type', 'csrf_validation_failure')
    .gte('timestamp', oneDayAgo.toISOString())
  
  // Count CSRF failures in the previous day
  const { count: previousCsrfFailures } = await supabase
    .from('SecurityEvent')
    .select('*', { count: 'exact', head: true })
    .eq('type', 'csrf_validation_failure')
    .gte('timestamp', twoDaysAgo.toISOString())
    .lt('timestamp', oneDayAgo.toISOString())
  
  // Calculate % change
  const csrfFailureChange = !previousCsrfFailures || previousCsrfFailures === 0 
    ? 0 
    : Math.round(((totalCsrfFailures || 0) - (previousCsrfFailures || 0)) / previousCsrfFailures * 100)
  
  // Count unique IPs with CSRF failures
  const { data: uniqueIpsResult } = await supabase
    .from('SecurityEvent')
    .select('ip')
    .eq('type', 'csrf_validation_failure')
    .gte('timestamp', oneDayAgo.toISOString())
    .is('ip', 'not.null')
  
  // Count unique IPs (we need to manually count as Supabase doesn't have COUNT DISTINCT)
  const uniqueIpSet = new Set<string>()
  if (uniqueIpsResult) {
    uniqueIpsResult.forEach(row => {
      if (row.ip) uniqueIpSet.add(row.ip)
    })
  }
  const uniqueIps = uniqueIpSet.size
  
  // Count potential attacks
  const { count: potentialAttacks } = await supabase
    .from('SecurityEvent')
    .select('*', { count: 'exact', head: true })
    .eq('type', 'suspicious_activity')
    .ilike('metadata', '%csrf_failures%')
    .gte('timestamp', oneDayAgo.toISOString())
  
  // Estimate success rate (if we don't track successful validations)
  // In a real implementation, you'd want to track successful CSRF validations too
  const totalRequests = (totalCsrfFailures || 0) + 10000 // Assuming a baseline of requests
  const successRate = Math.round((totalRequests - (totalCsrfFailures || 0)) / totalRequests * 100)
  
  return {
    totalCsrfFailures: totalCsrfFailures || 0,
    csrfFailureChange,
    uniqueIps,
    potentialAttacks: potentialAttacks || 0,
    successRate
  }
} 