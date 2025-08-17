export const dynamic = 'force-dynamic'

import dynamic from 'next/dynamic'

const DebugPrivyClient = dynamic(() => import('./DebugPrivyClient.jsx'), { ssr: false })

export default function Page() {
  return <DebugPrivyClient />
}