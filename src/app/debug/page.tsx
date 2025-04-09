import SessionDebugger from '@/components/debug/SessionDebugger'

export default function DebugPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6 text-center">Authentication Debug</h1>
      <SessionDebugger />
    </div>
  )
} 