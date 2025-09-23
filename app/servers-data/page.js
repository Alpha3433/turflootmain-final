// This is a Next.js page route that returns JSON data
// Used as a workaround for API routing issues

export default function ServersDataPage() {
  // This won't be rendered, but we need to export a component
  return null
}

export async function generateMetadata() {
  return {
    title: 'Server Data',
  }
}

// Server-side function to return server data
export async function GET() {
  const colyseusEndpoint = process.env.NEXT_PUBLIC_COLYSEUS_ENDPOINT || 'wss://au-syd-ab3eaf4e.colyseus.cloud'
  
  const serverData = {
    servers: [
      {
        id: 'colyseus-arena-global',
        roomType: 'arena',
        name: 'TurfLoot Arena',
        region: 'Australia',
        regionId: 'au-syd',
        endpoint: colyseusEndpoint,
        maxPlayers: 50,
        currentPlayers: 0,
        entryFee: 0,
        gameType: 'Arena Battle',
        serverType: 'colyseus',
        isActive: true,
        canSpectate: true,
        ping: 0,
        lastUpdated: new Date().toISOString(),
        timestamp: new Date().toISOString()
      }
    ],
    totalPlayers: 0,
    totalActiveServers: 1,
    totalServers: 1,
    practiceServers: 0,
    cashServers: 0,
    regions: ['Australia'],
    gameTypes: ['Arena Battle'],
    colyseusEnabled: true,
    colyseusEndpoint: colyseusEndpoint,
    lastUpdated: new Date().toISOString(),
    timestamp: new Date().toISOString()
  }
  
  return Response.json(serverData)
}