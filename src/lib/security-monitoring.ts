import { prisma } from '@/lib/prisma'
import { randomUUID } from 'crypto'

export type SecurityEventSeverity = 'low' | 'medium' | 'high' | 'critical'
export type SecurityEventType = 
  | 'csrf_validation_failure'
  | 'auth_failure'
  | 'rate_limit_exceeded'
  | 'suspicious_activity'
  | 'user_created'
  | 'permission_violation'

interface SecurityEventBase {
  id?: string
  type: SecurityEventType
  severity: SecurityEventSeverity
  timestamp?: Date
  userId?: string | null
  ip?: string | null
  userAgent?: string | null
  message?: string
  metadata?: any
}

/**
 * Log a security event to the database and optionally to external monitoring
 */
export async function logSecurityEvent(
  type: SecurityEventType,
  metadata: any = {},
  severity: SecurityEventSeverity = 'medium',
  req?: Request
): Promise<void> {
  try {
    const timestamp = new Date()
    const eventId = randomUUID()
    
    // Extract IP and user agent from request if available
    let ip: string | null = null
    let userAgent: string | null = null
    
    if (req) {
      ip = req.headers.get('x-forwarded-for') || 
           req.headers.get('x-real-ip') || null
      userAgent = req.headers.get('user-agent')
    }
    
    // Create the security event record
    const event: SecurityEventBase = {
      id: eventId,
      type,
      severity,
      timestamp,
      ip,
      userAgent,
      metadata
    }
    
    // Log to console for debugging
    console.log(`[SECURITY_EVENT] ${severity.toUpperCase()} ${type}:`, 
      JSON.stringify({ ...event, metadata }, null, 2)
    )
    
    // Store in database - try/catch to prevent failures from breaking the app
    try {
      await prisma.securityEvent.create({
        data: {
          id: eventId,
          type,
          severity,
          timestamp,
          userId: metadata.userId || null,
          ip: ip || null,
          userAgent: userAgent || null,
          metadata: JSON.stringify(metadata)
        }
      })
    } catch (dbError) {
      console.error('Failed to log security event to database:', dbError)
    }

    // CSRF-specific monitoring for attack patterns
    if (type === 'csrf_validation_failure') {
      await detectCsrfAttackPatterns(ip, metadata.endpoint)
    }
  } catch (error) {
    // Fail gracefully - security logging should never break the application
    console.error('Failed to log security event:', error)
  }
}

/**
 * Detect potential CSRF attack patterns based on failure frequency
 */
async function detectCsrfAttackPatterns(ip: string | null, endpoint: string | null): Promise<void> {
  if (!ip) return
  
  try {
    // Count recent failures from this IP
    const recentFailures = await prisma.securityEvent.count({
      where: {
        type: 'csrf_validation_failure',
        ip,
        timestamp: {
          gte: new Date(Date.now() - 1000 * 60 * 10) // Last 10 minutes
        }
      }
    })
    
    // Threshold for alerting
    if (recentFailures >= 5) {
      // Log a higher severity event for potential attack
      const attackEvent: SecurityEventBase = {
        type: 'suspicious_activity',
        severity: 'high',
        timestamp: new Date(),
        ip,
        metadata: {
          reason: 'multiple_csrf_failures',
          failureCount: recentFailures,
          endpoint,
          timeWindow: '10 minutes'
        }
      }
      
      // Alert via console (in production, could send to a monitoring service)
      console.error(`🚨 POTENTIAL CSRF ATTACK DETECTED: IP ${ip} had ${recentFailures} failures in 10 minutes`)
      
      await prisma.securityEvent.create({
        data: {
          id: randomUUID(),
          type: attackEvent.type,
          severity: attackEvent.severity,
          timestamp: attackEvent.timestamp,
          ip: ip,
          metadata: JSON.stringify(attackEvent.metadata)
        }
      })
      
      // In production, integrate with security monitoring service or send alerts
      // e.g., sendAlertToSecurityTeam(attackEvent)
    }
  } catch (error) {
    console.error('Error detecting CSRF attack patterns:', error)
  }
}

/**
 * Get recent security events, optionally filtered by type and severity
 */
export async function getRecentSecurityEvents(
  options: {
    limit?: number
    types?: SecurityEventType[]
    minSeverity?: SecurityEventSeverity
    userId?: string
    ip?: string
    startDate?: Date
    endDate?: Date
  } = {}
) {
  const {
    limit = 100,
    types,
    minSeverity,
    userId,
    ip,
    startDate,
    endDate = new Date()
  } = options
  
  // Convert severity to numeric value for comparison
  const severityValue = {
    low: 0,
    medium: 1,
    high: 2,
    critical: 3
  }
  
  const minSeverityValue = minSeverity ? severityValue[minSeverity] : undefined
  
  // Build where clause based on options
  const where: any = {}
  
  if (types && types.length > 0) {
    where.type = { in: types }
  }
  
  if (minSeverity) {
    where.severity = {
      in: Object.keys(severityValue).filter(
        key => severityValue[key as SecurityEventSeverity] >= minSeverityValue!
      ) as SecurityEventSeverity[]
    }
  }
  
  if (userId) {
    where.userId = userId
  }
  
  if (ip) {
    where.ip = ip
  }
  
  if (startDate) {
    where.timestamp = {
      gte: startDate,
      lte: endDate
    }
  } else {
    where.timestamp = {
      lte: endDate
    }
  }
  
  // Query database
  return prisma.securityEvent.findMany({
    where,
    orderBy: {
      timestamp: 'desc'
    },
    take: limit
  })
} 