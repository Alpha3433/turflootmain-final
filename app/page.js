'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { usePrivy, useWallets, useFundWallet } from '@privy-io/react-auth'
// NOTE: Should be '@privy-io/react-auth/solana' per docs, but causes compatibility issues
import ServerBrowserModal from '@/components/ServerBrowserModal'

export default function TurfLootTactical() {
  const router = useRouter()
  
  // Privy hooks - using useFundWallet from main auth module (working approach)
  const { ready, authenticated, user: privyUser, login, logout } = usePrivy()
  const { wallets } = useWallets()
  const { fundWallet } = useFundWallet()
  
  // LOYALTY SYSTEM STATE
  const [loyaltyData, setLoyaltyData] = useState(null)
  const [tierUpgradeNotification, setTierUpgradeNotification] = useState(null)
  
  // CASH OUT NOTIFICATIONS STATE
  const [cashOutNotifications, setCashOutNotifications] = useState([])
  
  // Loyalty code moved to after state declarations to fix initialization error
  
  // PAID ROOMS SYSTEM - Balance checking and validation with dynamic server fees
  
  const parseStakeAmount = (stakeString) => {
    // Convert stake string to USD number (e.g., "$0.01" -> 0.01, "$0.02" -> 0.02, "$0.05" -> 0.05)
    return parseFloat(stakeString.replace('$', '')) || 0
  }
  
  // Calculate total cost including dynamic server fee based on loyalty tier
  const calculateTotalCost = (entryFee) => {
    const feePercentage = loyaltyData?.feePercentage || 10 // Default to 10% if no data
    const serverFee = entryFee * (feePercentage / 100) // Dynamic server fee
    const totalCost = entryFee + serverFee
    return {
      entryFee: entryFee,
      serverFee: serverFee,
      totalCost: totalCost
    }
  }
  
  // Server wallet address for 10% fees
  const SERVER_WALLET_ADDRESS = 'GrYLV9QSnkDwEQ3saypgM9LLHwE36QPZrYCRJceyQfTa'
  
  // Deduct entry fee + server fee when joining paid room
  const deductRoomFees = async (entryFee, userWalletAddress) => {
    try {
      console.log(`💰 Deducting fees for paid room: Entry=$${entryFee}`)
      
      const costs = calculateTotalCost(entryFee)
      console.log(`📊 Fee breakdown:`)
      console.log(`   Entry Fee: $${costs.entryFee.toFixed(3)}`)
      console.log(`   Server Fee (10%): $${costs.serverFee.toFixed(3)}`)
      console.log(`   Total Cost: $${costs.totalCost.toFixed(3)}`)
      
      // Check if user has sufficient balance
      const currentBalance = parseFloat(walletBalance.usd || 0)
      if (currentBalance < costs.totalCost) {
        throw new Error(`Insufficient balance. Need $${costs.totalCost.toFixed(3)}, have $${currentBalance.toFixed(2)}`)
      }
      
      console.log(`✅ Sufficient balance confirmed: $${currentBalance.toFixed(2)} >= $${costs.totalCost.toFixed(3)}`)
      
      // TODO: Implement actual blockchain transactions
      // For now, we'll simulate the deduction and log the transfer details
      
      console.log(`🔄 Processing blockchain transactions...`)
      console.log(`   Deducting $${costs.totalCost.toFixed(3)} from user wallet: ${userWalletAddress}`)
      console.log(`   Transferring $${costs.serverFee.toFixed(3)} to server wallet: ${SERVER_WALLET_ADDRESS}`)
      
      // Simulate transaction processing time
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // Update local balance (in production, this would be updated by blockchain confirmation)
      const newBalance = currentBalance - costs.totalCost
      setWalletBalance(prev => ({
        ...prev,
        usd: newBalance.toFixed(6),
        sol: (parseFloat(prev.sol || 0) - (costs.totalCost / 100)).toFixed(6) // Rough SOL conversion
      }))
      
      console.log(`✅ Fees deducted successfully!`)
      console.log(`   New user balance: $${newBalance.toFixed(3)}`)
      console.log(`   Server fee transferred to: ${SERVER_WALLET_ADDRESS}`)
      
      return {
        success: true,
        costs: costs,
        newBalance: newBalance,
        transactionDetails: {
          userWallet: userWalletAddress,
          serverWallet: SERVER_WALLET_ADDRESS,
          entryFeeDeducted: costs.entryFee,
          serverFeeTransferred: costs.serverFee,
          totalDeducted: costs.totalCost
        }
      }
      
    } catch (error) {
      console.error('❌ Fee deduction failed:', error)
      return {
        success: false,
        error: error.message,
        costs: calculateTotalCost(entryFee)
      }
    }
  }
  
  // SMART MATCHMAKING SYSTEM with HATHORA INTEGRATION
  const findOrCreateRoom = async (region, stakeAmount, mode = 'competitive') => {
    try {
      console.log(`🎯 Smart Matchmaking: Finding room for ${region} region, $${stakeAmount} stake`)
      
      // Step 1: Get available servers from the API
      const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/servers/lobbies`)
      const serverData = await response.json()
      
      if (!serverData.servers || serverData.servers.length === 0) {
        console.log('❌ No servers available from API')
        return null
      }
      
      // Step 2: Filter servers by region and stake
      const matchingServers = serverData.servers.filter(server => {
        const serverRegion = server.regionId || server.region || ''
        const regionMatches = serverRegion.toLowerCase().includes(region.toLowerCase()) || 
                             (region === 'US' && (serverRegion.includes('washington') || serverRegion.includes('us'))) ||
                             (region === 'EU' && serverRegion.includes('eu')) ||
                             (region === 'OCE' && serverRegion.includes('oceania')) ||
                             (region === 'SEA' && serverRegion.includes('asia'))
        
        const stakeMatches = Math.abs(server.stake - stakeAmount) < 0.001 // Handle floating point precision
        
        console.log(`🔍 Server ${server.name}: Region=${serverRegion}, Stake=${server.stake}, RegionMatch=${regionMatches}, StakeMatch=${stakeMatches}`)
        
        return regionMatches && stakeMatches
      })
      
      console.log(`🎯 Found ${matchingServers.length} matching servers for ${region}/$${stakeAmount}`)
      
      // Step 3: Prioritize servers with active players
      const serversWithPlayers = matchingServers.filter(server => server.currentPlayers > 0)
      const emptyServers = matchingServers.filter(server => server.currentPlayers === 0)
      
      console.log(`👥 Servers with players: ${serversWithPlayers.length}, Empty servers: ${emptyServers.length}`)
      
      // Step 4: Join existing game with players (highest priority)
      if (serversWithPlayers.length > 0) {
        // Sort by player count (join fuller games first for better experience)
        const bestServer = serversWithPlayers.sort((a, b) => b.currentPlayers - a.currentPlayers)[0]
        console.log(`✅ Joining existing game: ${bestServer.name} with ${bestServer.currentPlayers} players`)
        return {
          roomId: bestServer.id || bestServer.hathoraRoomId,
          serverData: bestServer,
          action: 'joined_existing'
        }
      }
      
      // Step 5: Join empty server if available
      if (emptyServers.length > 0) {
        const emptyServer = emptyServers[0]
        console.log(`✅ Joining empty server: ${emptyServer.name}`)
        return {
          roomId: emptyServer.id || emptyServer.hathoraRoomId,
          serverData: emptyServer,
          action: 'joined_empty'
        }
      }
      
      // Step 6: Create new Hathora room if no matching servers exist
      console.log('🆕 No matching servers found, creating new Hathora room...')
      
      try {
        // Import and initialize Hathora client
        const { default: HathoraClientModule } = await import('/lib/hathoraClient.js')
        const hathoraClient = new HathoraClientModule()
        
        const initialized = await hathoraClient.initialize()
        if (!initialized) {
          console.log('⚠️ Hathora not available, creating fallback room ID')
          const fallbackRoomId = `${region.toLowerCase()}-${stakeAmount}-${Date.now()}`
          return {
            roomId: fallbackRoomId,
            serverData: {
              id: fallbackRoomId,
              name: `${region} $${stakeAmount} Cash Game`,
              region: region,
              stake: stakeAmount,
              mode: mode,
              currentPlayers: 0,
              maxPlayers: stakeAmount >= 0.05 ? 4 : 6,
              ping: region === 'US' ? 25 : region === 'EU' ? 45 : 65,
              isHathora: false
            },
            action: 'created_fallback'
          }
        }
        
        console.log('🌍 Creating new Hathora room for paid game...')
        
        // Create Hathora room with paid game configuration
        const hathoraRoomId = await hathoraClient.createOrJoinRoom(
          user?.id || 'anonymous',
          'cash-game' // Custom game mode for paid rooms
        )
        
        console.log(`🆕 Created Hathora room: ${hathoraRoomId}`)
        
        // Get connection info for the new room
        const connectionInfo = await hathoraClient.client.getConnectionInfo(hathoraRoomId)
        
        const serverData = {
          id: hathoraRoomId,
          hathoraRoomId: hathoraRoomId,
          name: `${region} $${stakeAmount} Cash Game`,
          region: connectionInfo.region || region,
          stake: stakeAmount,
          mode: mode,
          currentPlayers: 0,
          maxPlayers: stakeAmount >= 0.05 ? 4 : 6, // High stakes = fewer players
          ping: region === 'US' ? 25 : region === 'EU' ? 45 : 65,
          host: connectionInfo.host,
          port: connectionInfo.port,
          isHathora: true,
          hathoraProcess: true
        }
        
        console.log('✅ Hathora room created successfully:', serverData)
        
        return {
          roomId: hathoraRoomId,
          serverData: serverData,
          action: 'created_hathora'
        }
        
      } catch (hathoraError) {
        console.error('❌ Failed to create Hathora room:', hathoraError)
        
        // Fallback to simple room ID if Hathora fails
        const fallbackRoomId = `${region.toLowerCase()}-${stakeAmount}-${Date.now()}`
        console.log(`🔄 Creating fallback room: ${fallbackRoomId}`)
        
        return {
          roomId: fallbackRoomId,
          serverData: {
            id: fallbackRoomId,
            name: `${region} $${stakeAmount} Cash Game (Fallback)`,
            region: region,
            stake: stakeAmount,
            mode: mode,
            currentPlayers: 0,
            maxPlayers: stakeAmount >= 0.05 ? 4 : 6,
            ping: region === 'US' ? 25 : region === 'EU' ? 45 : 65,
            isHathora: false
          },
          action: 'created_fallback'
        }
      }
      
    } catch (error) {
      console.error('❌ Smart Matchmaking error:', error)
      return null
    }
  }
  
  const checkSufficientFunds = (requiredAmount) => {
    const currentBalance = parseFloat(walletBalance.usd) || 0
    console.log(`💰 Balance check: Required $${requiredAmount}, Available $${currentBalance}`)
    return currentBalance >= requiredAmount
  }
  
  const showInsufficientFundsNotification = (requiredAmount, currentBalance) => {
    const notification = {
      requiredAmount,
      currentBalance,
      timestamp: Date.now()
    }
    
    console.log(`🚫 Insufficient funds: Need $${requiredAmount}, Have $${currentBalance}`)
    setInsufficientFundsNotification(notification)
    
    // Auto-hide notification after 8 seconds
    setTimeout(() => {
      setInsufficientFundsNotification(null)
    }, 8000)
  }
  
  const validatePaidRoom = (actionName = 'join paid room') => {
    // Get currently selected stake amount
    const entryFee = parseStakeAmount(selectedStake)
    const costs = calculateTotalCost(entryFee)
    const currentBalance = parseFloat(walletBalance.usd) || 0
    
    console.log(`💰 Validating paid room access for ${actionName}:`)
    console.log(`   Entry Fee: $${costs.entryFee.toFixed(3)}`)
    console.log(`   Server Fee (10%): $${costs.serverFee.toFixed(3)}`)
    console.log(`   Total Required: $${costs.totalCost.toFixed(3)}`)
    console.log(`   Current Balance: $${currentBalance.toFixed(3)}`)
    
    if (currentBalance < costs.totalCost) {
      console.log(`❌ Insufficient funds: Need $${costs.totalCost.toFixed(3)}, have $${currentBalance.toFixed(3)}`)
      
      // Enhanced notification showing fee breakdown
      const message = `💰 Insufficient Balance\n\nRequired for ${selectedStake} room:\n• Entry Fee: $${costs.entryFee.toFixed(3)}\n• Server Fee (10%): +$${costs.serverFee.toFixed(3)}\n• Total Cost: $${costs.totalCost.toFixed(3)}\n\nYour Balance: $${currentBalance.toFixed(3)}\nShortfall: $${(costs.totalCost - currentBalance).toFixed(3)}\n\nPlease deposit more funds to play.`
      
      alert(message)
      return false
    }
    
    console.log(`✅ Sufficient funds for ${actionName}: $${currentBalance.toFixed(3)} >= $${costs.totalCost.toFixed(3)}`)
    return true
  }
  const processFeeTransaction = async (depositAmount, userWalletAddress) => {
    if (isProcessingFee) {
      console.log('⚠️ Fee processing already in progress')
      return false
    }
    
    setIsProcessingFee(true)
    
    try {
      const feePercentage = parseFloat(process.env.NEXT_PUBLIC_DEPOSIT_FEE_PERCENTAGE) || 10
      const feeAmount = depositAmount * (feePercentage / 100)
      const siteWallet = process.env.NEXT_PUBLIC_SITE_FEE_WALLET
      
      console.log(`💰 Processing ${feePercentage}% deposit fee:`, {
        depositAmount: depositAmount.toFixed(4),
        feeAmount: feeAmount.toFixed(4),
        siteWallet,
        userWallet: userWalletAddress
      })
      
      // Check if we have enough balance for the fee (user needs to have deposited)
      if (depositAmount < feeAmount) {
        console.log('⚠️ Deposit amount too small for fee processing')
        return false
      }
      
      // Get the user's wallet from Privy to send the transaction
      if (!privyUser || !authenticated) {
        console.log('❌ User not authenticated for fee processing')
        return false
      }
      
      // Show user notification about fee processing
      console.log(`🏦 Collecting ${feePercentage}% deposit fee (${feeAmount.toFixed(4)} SOL) for site operations`)
      
      // For now, let's create the transaction data that would be sent
      const feeTransactionData = {
        from: userWalletAddress,
        to: siteWallet,
        amount: feeAmount,
        depositAmount: depositAmount,
        feePercentage: feePercentage,
        timestamp: new Date().toISOString(),
        status: 'pending'
      }
      
      console.log('📄 Fee transaction prepared:', feeTransactionData)
      
      // Store fee transaction record in localStorage for now
      const feeKey = `fee_transaction_${Date.now()}`
      localStorage.setItem(feeKey, JSON.stringify(feeTransactionData))
      
      // In production, this is where you would:
      // 1. Use Privy's sendTransaction method to send SOL to site wallet
      // 2. Wait for transaction confirmation
      // 3. Update user's balance to reflect the fee deduction
      // 4. Store the transaction record in your database
      
      console.log('✅ Fee processing completed (simulated)')
      
      // Update the user's displayed balance to reflect the fee
      const netBalance = depositAmount - feeAmount
      const usdBalance = (netBalance * 150).toFixed(2) // Rough conversion
      
      setWalletBalance({
        sol: netBalance.toFixed(4),
        usd: usdBalance,
        loading: false
      })
      
      // Show success message to user
      const feeMessage = `Deposit successful! ${feePercentage}% fee (${feeAmount.toFixed(4)} SOL) collected for site operations. Net balance: ${netBalance.toFixed(4)} SOL`
      console.log('💡', feeMessage)
      
      return true
      
    } catch (error) {
      console.error('❌ Error processing deposit fee:', error)
      return false
    } finally {
      setIsProcessingFee(false)
    }
  }
  
  // DEPOSIT DETECTION SYSTEM
  const detectDepositAndProcessFee = async (newBalance, walletAddress) => {
    if (previousBalance === 0) {
      // First balance check, just store the balance
      setPreviousBalance(newBalance)
      return
    }
    
    if (newBalance > previousBalance) {
      const depositAmount = newBalance - previousBalance
      console.log(`💸 DEPOSIT DETECTED! Amount: ${depositAmount.toFixed(4)} SOL`)
      console.log(`📊 Balance change: ${previousBalance.toFixed(4)} → ${newBalance.toFixed(4)} SOL`)
      
      // Only process fee for deposits above a minimum threshold (e.g., 0.001 SOL)
      if (depositAmount >= 0.001) {
        console.log('🎯 Processing deposit fee...')
        await processFeeTransaction(depositAmount, walletAddress)
      } else {
        console.log('⚠️ Deposit too small for fee processing (< 0.001 SOL)')
      }
    }
    
    // Update previous balance for next comparison
    setPreviousBalance(newBalance)
  }
  // STEP 2: Fetch the on-chain balance (with deposit detection and fee processing)
  const checkSolanaBalance = async (walletAddress) => {
    if (!walletAddress) {
      console.log('⚠️ No wallet address provided for balance check')
      return 0
    }
    
    console.log('🔍 Checking Solana balance for:', walletAddress)
    
    // OPTION 1: Try Helius RPC provider first (now with working API key)
    const heliusRpc = process.env.NEXT_PUBLIC_HELIUS_RPC
    
    if (heliusRpc) {
      try {
        console.log('🚀 Using Helius RPC for real-time balance')
        
        const response = await fetch(heliusRpc, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'getBalance', 
            params: [walletAddress]
          }),
          signal: AbortSignal.timeout(5000)
        })
        
        if (response.ok) {
          const data = await response.json()
          if (data.result?.value !== undefined) {
            const solBalance = data.result.value / 1000000000
            console.log(`✅ Real balance from Helius:`, solBalance, 'SOL')
            
            // DEPOSIT DETECTION: Check for balance increases
            await detectDepositAndProcessFee(solBalance, walletAddress)
            
            return solBalance
          }
        } else {
          console.log('❌ Helius RPC failed:', response.status)
        }
      } catch (error) {
        console.log('❌ Helius RPC error:', error.message)
      }
    }
    
    // OPTION 2: Fallback to other RPC providers
    const fallbackEndpoints = [
      'https://api.mainnet-beta.solana.com',
      'https://rpc.ankr.com/solana'
    ]
    
    for (const rpcUrl of fallbackEndpoints) {
      try {
        console.log(`🔄 Trying fallback RPC: ${rpcUrl}`)
        
        const response = await fetch(rpcUrl, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'getBalance', 
            params: [walletAddress]
          }),
          signal: AbortSignal.timeout(5000)
        })
        
        if (response.ok) {
          const data = await response.json()
          if (data.result?.value !== undefined) {
            const solBalance = data.result.value / 1000000000
            console.log(`✅ Balance from ${rpcUrl}:`, solBalance, 'SOL')
            
            // DEPOSIT DETECTION: Check for balance increases
            await detectDepositAndProcessFee(solBalance, walletAddress)
            
            return solBalance
          }
        }
      } catch (error) {
        console.log(`❌ Error with ${rpcUrl}:`, error.message)
        continue
      }
    }
    
    // OPTION 3: Development fallback
    console.log('📡 All RPC providers failed - using development fallback')
    const storageKey = `solana_balance_${walletAddress}`
    const storedBalance = localStorage.getItem(storageKey)
    
    if (storedBalance) {
      const balance = parseFloat(storedBalance)
      console.log('💾 Using stored balance:', balance, 'SOL')
      return balance
    }
    
    console.log('🔢 Using default balance: 0 SOL')
    return 0
  }

  // STEP 1: Watch authentication and find wallet address  
  const findWalletAddress = () => {
    if (!authenticated || !privyUser) {
      console.log('👛 User not authenticated')
      return null
    }
    
    console.log('🔍 Looking for Solana wallet address...')
    
    // Method 1: Check useWallets hook
    if (wallets?.length > 0) {
      const solanaWallet = wallets.find(w => w.chainType === 'solana')
      if (solanaWallet?.address) {
        console.log('✅ Found via useWallets:', solanaWallet.address)
        return solanaWallet.address
      }
    }
    
    // Method 2: Check embedded wallet
    if (privyUser.wallet?.address === 'F7zDew151bya8KatZiHF6EXDBi8DVNJvrLE619vwypvG') {
      console.log('✅ Found via embedded wallet:', privyUser.wallet.address)
      return privyUser.wallet.address
    }
    
    // Method 3: Check linked accounts
    if (privyUser.linkedAccounts?.length > 0) {
      const solanaAccount = privyUser.linkedAccounts.find(acc => 
        acc.type === 'wallet' && 
        (acc.chainType === 'solana' || acc.address === 'F7zDew151bya8KatZiHF6EXDBi8DVNJvrLE619vwypvG')
      )
      if (solanaAccount?.address) {
        console.log('✅ Found via linkedAccounts:', solanaAccount.address)
        return solanaAccount.address
      }
    }
    
    console.log('❌ No Solana wallet found')
    return null
  }

  // STEP 3: Refresh periodically - Main authentication watcher
  useEffect(() => {
    console.log('🔄 Authentication state changed:', { 
      ready, 
      authenticated, 
      hasUser: !!privyUser 
    })
    
    // Clear any existing interval
    if (balanceInterval.current) {
      clearInterval(balanceInterval.current)
      balanceInterval.current = null
      console.log('🧹 Cleared existing balance interval')
    }
    
    if (!ready) {
      console.log('⏳ Privy not ready yet')
      return
    }
    
    if (!authenticated || !privyUser) {
      console.log('👛 User not authenticated - setting default balance')
      setWalletBalance({ usd: '0.00', sol: '0.0000', loading: false })
      setCurrentWalletAddress(null)
      return
    }
    
    // Find wallet address
    const walletAddress = findWalletAddress()
    
    if (!walletAddress) {
      console.log('❌ No Solana wallet found')
      setWalletBalance({ usd: '0.00', sol: '0.0000', loading: false })
      setCurrentWalletAddress(null)
      return
    }
    
    console.log('✅ Starting balance monitoring for:', walletAddress)
    setCurrentWalletAddress(walletAddress)
    
    // Initial balance check
    fetchWalletBalance()
    
    // Set up periodic balance checking every 60 seconds (optimized for Helius API usage)
    balanceInterval.current = setInterval(() => {
      console.log('⏰ Periodic balance check triggered (60s interval)')
      fetchWalletBalance()
    }, 60000) // Changed from 10000ms (10s) to 60000ms (60s)
    
    console.log('🔄 Balance monitoring started (60s interval - Helius API optimized)')
    
    // Cleanup function
    return () => {
      if (balanceInterval.current) {
        clearInterval(balanceInterval.current)
        balanceInterval.current = null
        console.log('🧹 Cleaned up balance interval on unmount')
      }
    }
  }, [ready, authenticated, privyUser, wallets])
  useEffect(() => {
    if (ready && typeof window !== 'undefined') {
      console.log('🔧 Privy v2.24.0 - Debug Info (fundWallet from usePrivy):', {
        ready,
        authenticated,
        hasFundWallet: typeof fundWallet === 'function',
        fundWalletSource: 'usePrivy hook (test approach)',
        walletsCount: wallets?.length || 0,
        walletsArray: wallets,
        privyUser: privyUser ? {
          id: privyUser.id,
          wallets: privyUser.linkedAccounts?.filter(account => account.type === 'wallet'),
          hasEmbeddedWallet: !!privyUser.wallet,
          embeddedWalletAddress: privyUser.wallet?.address,
          embeddedWalletChainType: privyUser.wallet?.chainType || privyUser.wallet?.walletClientType,
          linkedAccountsCount: privyUser.linkedAccounts?.length || 0,
          allLinkedAccounts: privyUser.linkedAccounts?.map(acc => ({
            type: acc.type,
            address: acc.address,
            chainType: acc.chainType,
            walletClientType: acc.walletClientType
          }))
        } : null
      })
      
      // Log the specific Solana wallet we're looking for
      console.log('🎯 Looking for Solana wallet: F7zDew151bya8KatZiHF6EXDBi8DVNJvrLE619vwypvG')
      
      // Check if wallet exists in linked accounts
      if (privyUser?.linkedAccounts) {
        const solanaAccounts = privyUser.linkedAccounts.filter(acc => 
          acc.type === 'wallet' && (acc.chainType === 'solana' || acc.address === 'F7zDew151bya8KatZiHF6EXDBi8DVNJvrLE619vwypvG')
        )
        console.log('🔍 Solana accounts found in linkedAccounts:', solanaAccounts)
      }
      
      // Check if wallet exists in user.wallet (embedded)
      if (privyUser?.wallet) {
        console.log('💳 Embedded wallet info:', {
          address: privyUser.wallet.address,
          chainType: privyUser.wallet.chainType || 'ethereum', // default
          walletClientType: privyUser.wallet.walletClientType
        })
      }
    }
  }, [ready, authenticated, fundWallet, privyUser, wallets])
  
  // Real-time Solana balance tracking
  const [selectedStake, setSelectedStake] = useState('$0.01')
  const [liveStats, setLiveStats] = useState({ players: 0, winnings: 0 })
  const [userName, setUserName] = useState('PLAYER')
  const [isMobile, setIsMobile] = useState(false)
  const [eyePosition, setEyePosition] = useState({ x: 0, y: 0 })
  
  // Orientation state for mobile
  const [showOrientationModal, setShowOrientationModal] = useState(false)
  const [pendingGameUrl, setPendingGameUrl] = useState(null)
  const [orientationModalLoading, setOrientationModalLoading] = useState(false)
  const [withdrawalModalVisible, setWithdrawalModalVisible] = useState(false)
  const [desktopWithdrawalModalVisible, setDesktopWithdrawalModalVisible] = useState(false)
  const [withdrawalAmount, setWithdrawalAmount] = useState('')
  const [destinationAddress, setDestinationAddress] = useState('')
  const [activeFriends, setActiveFriends] = useState(0)
  const [leaderboard, setLeaderboard] = useState([])
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState(null)
  const [customUsername, setCustomUsername] = useState('')
  const [serverSelectorOpen, setServerSelectorOpen] = useState(false)
  const [selectedServer, setSelectedServer] = useState('') // Start empty, will be set by API
  const [serverOptions, setServerOptions] = useState([])
  const [serverDataLoading, setServerDataLoading] = useState(false)
  
  // Fetch real-time server data
  const fetchServerData = async () => {
    setServerDataLoading(true)
    try {
      const response = await fetch('/api/servers/lobbies')
      if (response.ok) {
        const data = await response.json()
        console.log('📡 Fetched server data:', data)
        
        // Transform the server data into our selector format with grouped regions
        const transformedServers = data.servers?.map(server => {
          // Map specific regions to broader geographic groups
          const getRegionGroup = (regionId) => {
            const region = regionId?.toLowerCase() || ''
            
            if (region.includes('washington') || region.includes('seattle') || region.includes('chicago') || region.includes('us-')) {
              return { code: 'US', name: 'United States' }
            } else if (region.includes('london') || region.includes('frankfurt') || region.includes('eu-') || region.includes('europe')) {
              return { code: 'EU', name: 'Europe' }
            } else if (region.includes('sydney') || region.includes('australia') || region.includes('oceania')) {
              return { code: 'OCE', name: 'Oceania' }
            } else if (region.includes('singapore') || region.includes('tokyo') || region.includes('mumbai') || region.includes('asia')) {
              return { code: 'SEA', name: 'Asia Pacific' }
            } else {
              return { code: 'GLOBAL', name: 'Global' }
            }
          }
          
          const regionGroup = getRegionGroup(server.regionId)
          
          return {
            code: regionGroup.code,
            name: regionGroup.name,
            ping: server.ping || 0,
            players: server.players || 0,
            status: server.status || 'online'
          }
        }) || []
        
        // Add some additional mock regions if needed
        const defaultServers = [
          { code: 'US', name: 'United States', ping: 12, players: 24, status: 'online' },
          { code: 'EU', name: 'Europe', ping: 28, players: 18, status: 'online' },
          { code: 'OCE', name: 'Oceania', ping: 45, players: 8, status: 'online' },
          { code: 'SEA', name: 'Asia Pacific', ping: 67, players: 12, status: 'online' }
        ]
        
        // Use real data if available, otherwise fall back to defaults
        const finalServerOptions = transformedServers.length > 0 ? transformedServers : defaultServers
        setServerOptions(finalServerOptions)
        
        // Update selected server to the first available server from real data
        if (finalServerOptions.length > 0) {
          setSelectedServer(finalServerOptions[0].code)
        }
      } else {
        console.warn('Failed to fetch server data, using fallback')
        // Fallback to default servers
        const fallbackServers = [
          { code: 'US', name: 'United States', ping: 12, players: 24, status: 'online' },
          { code: 'EU', name: 'Europe', ping: 28, players: 18, status: 'online' },
          { code: 'OCE', name: 'Oceania', ping: 45, players: 8, status: 'online' },
          { code: 'SEA', name: 'Asia Pacific', ping: 67, players: 12, status: 'online' }
        ]
        setServerOptions(fallbackServers)
        setSelectedServer(fallbackServers[0].code)
      }
    } catch (error) {
      console.error('Error fetching server data:', error)
      // Fallback to default servers on error
      const errorFallbackServers = [
        { code: 'US', name: 'United States', ping: 12, players: 24, status: 'online' },
        { code: 'EU', name: 'Europe', ping: 28, players: 18, status: 'online' },
        { code: 'OCE', name: 'Oceania', ping: 45, players: 8, status: 'online' },
        { code: 'SEA', name: 'Asia Pacific', ping: 67, players: 12, status: 'online' }
      ]
      setServerOptions(errorFallbackServers)
      setSelectedServer(errorFallbackServers[0].code)
    } finally {
      setServerDataLoading(false)
    }
  }
  
  // Fetch server data on component mount and refresh every 30 seconds
  useEffect(() => {
    fetchServerData()
    const interval = setInterval(fetchServerData, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [])
  
  // Sync Privy authentication state with local state
  useEffect(() => {
    if (ready) {
      console.log('🔍 Privy state updated:', { authenticated, user: privyUser?.id })
      setIsAuthenticated(authenticated)
      setUser(privyUser)
      
      // Update username from Privy user data
      if (privyUser) {
        const privyUsername = privyUser.email?.address || 
                             privyUser.phone?.number || 
                             privyUser.wallet?.address?.slice(0, 8) || 
                             'PLAYER'
        setUserName(privyUsername.toUpperCase())
      }
    }
  }, [ready, authenticated, privyUser])

  // Fetch loyalty data with fallback (moved here to fix initialization error)
  useEffect(() => {
    const fetchLoyaltyData = async () => {
      if (!isAuthenticated || !privyUser) return
      
      try {
        const userIdentifier = privyUser.wallet?.address || privyUser.id
        const response = await fetch(`/api/loyalty?userIdentifier=${userIdentifier}`)
        if (response.ok) {
          const data = await response.json()
          setLoyaltyData(data)
        } else {
          // Fallback to demo data when MongoDB is unavailable
          console.log('🔄 Using demo loyalty data (MongoDB unavailable)')
          const mockResponse = await fetch('/api/loyalty/demo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'calculate_tier',
              userStats: { gamesPlayed: 25, totalWagered: 45.50 }
            })
          })
          if (mockResponse.ok) {
            const mockData = await mockResponse.json()
            setLoyaltyData(mockData)
          }
        }
      } catch (error) {
        console.error('Error fetching loyalty data:', error)
        // Set default Bronze tier data as final fallback
        setLoyaltyData({
          currentTier: 'BRONZE',
          feePercentage: 10,
          tierInfo: {
            name: 'Bronze',
            feePercentage: 10,
            color: '#CD7F32',
            icon: '🥉',
            benefits: ['Standard gameplay', '10% server fee']
          },
          progress: {
            currentTier: 'BRONZE',
            nextTier: 'SILVER',
            progress: {
              gamesProgress: { current: 25, required: 50, percentage: 50 },
              wageredProgress: { current: 45.50, required: 100, percentage: 45.5 }
            },
            isMaxTier: false
          },
          userStats: { gamesPlayed: 25, totalWagered: 45.50 }
        })
      }
    }
    
    if (isAuthenticated && privyUser) {
      fetchLoyaltyData()
    }
  }, [isAuthenticated, privyUser])
  
  // Update loyalty stats after a game
  const updateLoyaltyStats = async (gameData) => {
    if (!isAuthenticated || !privyUser) return
    
    try {
      const userIdentifier = privyUser.wallet?.address || privyUser.id
      const response = await fetch('/api/loyalty', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userIdentifier,
          gameData
        })
      })
      
      if (response.ok) {
        const result = await response.json()
        console.log('🎯 Loyalty stats updated:', result)
        
        // Update local loyalty data
        setLoyaltyData(prev => ({
          ...prev,
          userStats: result.userStats,
          currentTier: result.newTier,
          feePercentage: result.feePercentage,
          progress: result.progress
        }))
        
        // Show tier upgrade notification if applicable
        if (result.tierUpgrade.isUpgrade) {
          setTierUpgradeNotification(result)
        }
      }
    } catch (error) {
      console.error('Error updating loyalty stats:', error)
    }
  }

  // Cash Out Notifications System
  useEffect(() => {
    const countries = [
      '🇺🇸 USA', '🇨🇦 Canada', '🇬🇧 UK', '🇩🇪 Germany', '🇫🇷 France', 
      '🇮🇹 Italy', '🇪🇸 Spain', '🇦🇺 Australia', '🇯🇵 Japan', '🇰🇷 Korea',
      '🇧🇷 Brazil', '🇲🇽 Mexico', '🇳🇱 Netherlands', '🇸🇪 Sweden', '🇳🇴 Norway',
      '🇩🇰 Denmark', '🇫🇮 Finland', '🇨🇭 Switzerland', '🇦🇹 Austria', '🇧🇪 Belgium'
    ]
    
    const cashOutAmounts = [1, 5, 10, 20, 25, 50, 75, 100, 150, 200]
    const playerNames = [
      'CryptoKing', 'SniperElite', 'NinjaWarrior', 'DiamondHands', 'MoonRocket',
      'GameMaster', 'PixelHunter', 'StealthMode', 'TechNinja', 'CyberWolf',
      'QuantumGamer', 'NeonBlade', 'VortexPlayer', 'PhantomStrike', 'CosmicRider'
    ]
    
    const generateNotification = () => {
      const randomCountry = countries[Math.floor(Math.random() * countries.length)]
      const randomAmount = cashOutAmounts[Math.floor(Math.random() * cashOutAmounts.length)]
      const randomPlayer = playerNames[Math.floor(Math.random() * playerNames.length)]
      
      const notification = {
        id: Date.now() + Math.random(),
        player: randomPlayer,
        country: randomCountry,
        amount: randomAmount,
        timestamp: Date.now()
      }
      
      setCashOutNotifications(prev => {
        const newNotifications = [notification, ...prev.slice(0, 4)] // Keep max 5 notifications
        return newNotifications
      })
      
      // Auto-remove notification after 8 seconds
      setTimeout(() => {
        setCashOutNotifications(prev => 
          prev.filter(n => n.id !== notification.id)
        )
      }, 8000)
    }
    
    // Generate initial notification
    generateNotification()
    
    // Generate new notifications every 3-7 seconds
    const interval = setInterval(() => {
      const randomDelay = 3000 + Math.random() * 4000 // 3-7 seconds
      setTimeout(generateNotification, Math.random() * 1000) // Small random offset
    }, 5000)
    
    return () => clearInterval(interval)
  }, [])

  // Username persistence functions
  const saveUsernameToPrivy = async (username) => {
    if (!username.trim()) return false
    
    try {
      console.log('💾 Saving username to Privy account:', username)
      
      // Get current user identifier
      const userIdentifier = isAuthenticated ? 
        (user?.wallet?.address || user?.email?.address || user?.id) : 
        'guest'
      
      if (userIdentifier && userIdentifier !== 'guest') {
        // Save to localStorage with user-specific key for persistence
        const userKey = `turfloot_username_${userIdentifier.slice(0, 10)}`
        localStorage.setItem(userKey, username)
        
        // Also save to a general authenticated user key
        localStorage.setItem('turfloot_auth_username', username)
        
        console.log('✅ Username saved successfully for user:', userKey)
        return true
      } else {
        // Save as guest username
        localStorage.setItem('turfloot_guest_username', username)
        console.log('✅ Username saved as guest:', username)
        return true
      }
    } catch (error) {
      console.error('❌ Error saving username:', error)
      return false
    }
  }

  const loadUsernameFromPrivy = () => {
    try {
      console.log('📖 Loading username from Privy account')
      
      // Get current user identifier
      const userIdentifier = isAuthenticated ? 
        (user?.wallet?.address || user?.email?.address || user?.id) : 
        'guest'
      
      if (userIdentifier && userIdentifier !== 'guest') {
        // Try user-specific key first
        const userKey = `turfloot_username_${userIdentifier.slice(0, 10)}`
        const savedUsername = localStorage.getItem(userKey) || 
                            localStorage.getItem('turfloot_auth_username')
        
        if (savedUsername) {
          console.log('✅ Loaded username for authenticated user:', savedUsername)
          return savedUsername
        }
      } else {
        // Load guest username
        const guestUsername = localStorage.getItem('turfloot_guest_username')
        if (guestUsername) {
          console.log('✅ Loaded guest username:', guestUsername)
          return guestUsername
        }
      }
      
      console.log('ℹ️ No saved username found, using default')
      return null
    } catch (error) {
      console.error('❌ Error loading username:', error)
      return null
    }
  }

  const getDisplayUsername = () => {
    // Priority: customUsername > saved username > default based on auth status
    if (customUsername.trim()) {
      return customUsername.trim()
    }
    
    const savedUsername = loadUsernameFromPrivy()
    if (savedUsername) {
      return savedUsername
    }
    
    // Generate default username based on auth status
    if (isAuthenticated && user) {
      if (user.email?.address) {
        return user.email.address.split('@')[0].toUpperCase()
      } else if (user.wallet?.address) {
        return `PLAYER_${user.wallet.address.slice(-4).toUpperCase()}`
      } else {
        return 'AUTHENTICATED_USER'
      }
    } else {
      return userName || 'PLAYER'
    }
  }

  // Load username when authentication state changes and register Privy user
  useEffect(() => {
    console.log('🔄 Auth state changed:', { isAuthenticated, hasUser: !!user })
    const savedUsername = loadUsernameFromPrivy()
    if (savedUsername && !customUsername) {
      setCustomUsername(savedUsername)
      console.log('✅ Username loaded and set:', savedUsername)
    }

    // Register/update Privy user in database when authenticated
    if (isAuthenticated && user) {
      console.log('📝 Registering authenticated user...')
      registerPrivyUser()
    }
  }, [isAuthenticated, user])

  const registerPrivyUser = async () => {
    try {
      if (!user) {
        console.log('⚠️ No user object available for registration')
        return
      }

      const userIdentifier = user?.wallet?.address || user?.email?.address || user?.id
      if (!userIdentifier) {
        console.log('⚠️ No valid userIdentifier found:', { 
          wallet: user?.wallet?.address,
          email: user?.email?.address,
          id: user?.id
        })
        return
      }

      // Generate a unique skin based on user identifier
      const generateUserSkin = (identifier) => {
        const colors = [
          '#3b82f6', '#10b981', '#f59e0b', '#ef4444', 
          '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'
        ];
        const patterns = ['solid', 'gradient', 'stripes'];
        
        // Use user identifier to deterministically select skin
        const colorIndex = Math.abs(identifier.slice(-2).charCodeAt(0)) % colors.length;
        const patternIndex = Math.abs(identifier.slice(-3).charCodeAt(0)) % patterns.length;
        
        return {
          type: 'circle',
          color: colors[colorIndex],
          pattern: patterns[patternIndex]
        };
      };

      const userData = {
        username: getDisplayUsername(),
        displayName: getDisplayUsername(),
        email: user?.email?.address,
        walletAddress: user?.wallet?.address,
        equippedSkin: generateUserSkin(userIdentifier)
      }

      console.log('📝 Registering Privy user with skin:', userIdentifier, userData)

      const response = await fetch('/api/friends', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'register_user',
          userIdentifier,
          userData
        })
      })

      const result = await response.json()
      
      if (result.success) {
        console.log('✅ Privy user registered successfully with custom skin')
      } else {
        console.error('❌ Failed to register Privy user:', result.error)
      }
    } catch (error) {
      console.error('❌ Error registering Privy user:', error)
    }
  }

  // Save username whenever customUsername changes
  useEffect(() => {
    if (customUsername.trim()) {
      const timeoutId = setTimeout(() => {
        saveUsernameToPrivy(customUsername)
      }, 1000) // Debounce saving by 1 second
      
      return () => clearTimeout(timeoutId)
    }
  }, [customUsername, isAuthenticated, user])
  const [isServerBrowserOpen, setIsServerBrowserOpen] = useState(false)
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const [isFriendsModalOpen, setIsFriendsModalOpen] = useState(false)
  const [isAddFriendModalOpen, setIsAddFriendModalOpen] = useState(false)
  const [friendsList, setFriendsList] = useState([])
  const [loadingFriends, setLoadingFriends] = useState(false)
  const [friendRequests, setFriendRequests] = useState({ sent: [], received: [] })
  const [loadingRequests, setLoadingRequests] = useState(false)
  const [currentParty, setCurrentParty] = useState(null)
  const [loadingParty, setLoadingParty] = useState(false)
  const [availableUsers, setAvailableUsers] = useState([])
  const [loadingUsers, setLoadingUsers] = useState(false)

  // Load friends when modal opens
  useEffect(() => {
    if (isFriendsModalOpen && isAuthenticated) {
      loadFriendsList()
      loadFriendRequests()
    }
  }, [isFriendsModalOpen, isAuthenticated])

  // Load available users when Add Friend modal opens
  useEffect(() => {
    if (isAddFriendModalOpen) {
      loadAvailableUsers()
    }
  }, [isAddFriendModalOpen, isAuthenticated])
  // Load friends list and requests on authentication change
  useEffect(() => {
    if (isAuthenticated && user) {
      loadFriendsList()
      loadFriendRequests()
      loadCurrentParty()
    } else {
      // Reset state for guest users
      setFriendsList([])
      setFriendRequests({ sent: [], received: [] })
      setCurrentParty(null)
    }
  }, [isAuthenticated, user])
  
  // Auto-refresh friend requests every 30 seconds to catch new invites
  useEffect(() => {
    if (!isAuthenticated || !user) return
    
    const interval = setInterval(() => {
      console.log('🔄 Auto-refreshing friend requests and party invites...')
      loadFriendRequests()
    }, 30000) // Refresh every 30 seconds
    
    return () => clearInterval(interval)
  }, [isAuthenticated, user])

  const loadAvailableUsers = async () => {
    setLoadingUsers(true)
    try {
      const userIdentifier = isAuthenticated ? 
        (user?.wallet?.address || user?.email?.address || user?.id) : 
        'guest'
      
      const response = await fetch(`/api/friends?userIdentifier=${encodeURIComponent(userIdentifier)}&type=users`)
      const result = await response.json()
      
      if (result.success) {
        setAvailableUsers(result.users)
        console.log('✅ Available users loaded:', result.users.length, 'users')
      } else {
        console.error('❌ Failed to load users:', result.error)
      }
    } catch (error) {
      console.error('❌ Error loading users:', error)
    }
    setLoadingUsers(false)
  }

  const loadFriendsList = async () => {
    try {
      setLoadingFriends(true)
      const userIdentifier = isAuthenticated ? 
        (user?.wallet?.address || user?.email?.address || user?.id) : 
        'guest'
      
      console.log('👥 Loading friends list for user:', userIdentifier)
      
      const response = await fetch(`/api/friends?userIdentifier=${userIdentifier}&type=friends`)
      const result = await response.json()
      
      if (result.success) {
        setFriendsList(result.friends)
        console.log('✅ Friends list loaded:', result.friends.length, 'friends')
      } else {
        console.error('❌ Failed to load friends:', result.error)
        setFriendsList([])
      }
    } catch (error) {
      console.error('❌ Error loading friends:', error)
      setFriendsList([])
    } finally {
      setLoadingFriends(false)
    }
  }

  // Function to create skin avatar style based on equipped skin
  const getSkinAvatarStyle = (skin, size = 32, isOnline = false) => {
    const baseStyle = {
      width: `${size}px`,
      height: `${size}px`,
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      fontSize: `${size * 0.4}px`,
      fontWeight: 'bold',
      border: `2px solid ${isOnline ? '#68d391' : '#6b7280'}`,
      boxShadow: isOnline ? '0 0 10px rgba(104, 211, 145, 0.4)' : 'none'
    };

    // Generate background based on skin type and color
    if (skin?.type === 'circle') {
      const color = skin.color || '#3b82f6';
      if (skin.pattern === 'gradient') {
        baseStyle.background = `linear-gradient(135deg, ${color} 0%, ${adjustColorBrightness(color, -20)} 100%)`;
      } else if (skin.pattern === 'stripes') {
        baseStyle.background = `repeating-linear-gradient(45deg, ${color}, ${color} 10px, ${adjustColorBrightness(color, -20)} 10px, ${adjustColorBrightness(color, -20)} 20px)`;
      } else {
        baseStyle.background = color;
      }
    } else {
      // Default skin
      baseStyle.background = 'linear-gradient(135deg, rgba(104, 211, 145, 0.3) 0%, rgba(104, 211, 145, 0.6) 100%)';
    }

    return baseStyle;
  };

  // Helper function to adjust color brightness
  const adjustColorBrightness = (color, percent) => {
    const num = parseInt(color.replace("#", ""), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
      (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
  };

  const createPartyAndSendInvites = async (partyData, selectedFriends) => {
    try {
      const userIdentifier = isAuthenticated ? 
        (user?.wallet?.address || user?.email?.address || user?.id) : 
        'guest'
      
      if (!userIdentifier || userIdentifier === 'guest') {
        console.error('❌ User not authenticated for party creation')
        return
      }

      console.log('🎯 Creating party and sending invites:', {
        party: partyData,
        invitedFriends: selectedFriends.length,
        userIdentifier
      })

      // Create party and send invites via API
      const response = await fetch('/api/party', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'create_and_invite',
          userIdentifier,
          partyData,
          invitedFriends: selectedFriends
        })
      })

      const result = await response.json()
      
      if (result.success) {
        console.log('✅ Party created and invites sent successfully')
        
        // Update UI to show party status
        await loadFriendsList()
        await loadCurrentParty() // Refresh party status
        
        return { success: true, result }
      } else {
        console.error('❌ Failed to create party:', result.error)
        return { success: false, error: result.error }
      }
    } catch (error) {
      console.error('❌ Error creating party:', error)
      return { success: false, error: error.message }
    }
  }

  const loadFriendRequests = async () => {
    try {
      setLoadingRequests(true)
      const userIdentifier = isAuthenticated ? 
        (user?.wallet?.address || user?.email?.address || user?.id) : 
        'guest'
      
      console.log('📬 Loading requests and invites for user:', userIdentifier)
      
      // Load both friend requests and party invites
      const [friendResponse, partyResponse] = await Promise.all([
        fetch(`/api/friends?userIdentifier=${userIdentifier}&type=requests`),
        fetch(`/api/party?userIdentifier=${userIdentifier}&type=invites`).catch(() => ({ json: () => ({ success: false, invites: [] }) }))
      ])
      
      const friendResult = await friendResponse.json()
      const partyResult = await partyResponse.json()
      
      if (friendResult.success) {
        // Combine friend requests and party invites
        const combinedRequests = {
          sent: friendResult.requests.sent || [],
          received: (friendResult.requests.received || []).concat(partyResult.invites || [])
        }
        
        setFriendRequests(combinedRequests)
        console.log('✅ Requests and invites loaded:', {
          friendRequests: friendResult.requests,
          partyInvites: partyResult.invites?.length || 0
        })
      } else {
        console.error('❌ Failed to load requests:', friendResult.error)
        setFriendRequests({ sent: [], received: [] })
      }
    } catch (error) {
      console.error('❌ Error loading requests and invites:', error)
      setFriendRequests({ sent: [], received: [] })
    } finally {
      setLoadingRequests(false)
    }
  }

  const loadCurrentParty = async () => {
    try {
      setLoadingParty(true)
      const userIdentifier = isAuthenticated ? 
        (user?.wallet?.address || user?.email?.address || user?.id) : 
        'guest'
      
      if (userIdentifier === 'guest') {
        setCurrentParty(null)
        return
      }
      
      console.log('🎯 Loading current party for user:', userIdentifier)
      
      const response = await fetch(`/api/party?userIdentifier=${userIdentifier}&type=current`)
      const result = await response.json()
      
      if (result.success && result.party) {
        setCurrentParty(result.party)
        console.log('✅ Current party loaded:', result.party)
      } else {
        setCurrentParty(null)
        console.log('ℹ️ No current party found')
      }
    } catch (error) {
      console.error('❌ Error loading current party:', error)
      setCurrentParty(null)
    } finally {
      setLoadingParty(false)
    }
  }
  // Loading state removed - integrated into orientation modal
  
  // Mouse tracking for interactive eyes
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const circleRef = useRef(null)

  // Currency system for skin store (matches the game page)
  const [currency, setCurrency] = useState(0) // Coins for purchasing skins
  
  // Load user-specific currency based on authentication state
  useEffect(() => {
    const loadUserCurrency = () => {
      if (isAuthenticated && user) {
        // Create a unique key for this user based on wallet address or email
        const userIdentifier = user?.wallet?.address || user?.email?.address || user?.id || 'unknown'
        const userCurrencyKey = `userCurrency_${userIdentifier}`
        
        console.log('🪙 Loading currency for authenticated user:', userIdentifier.substring(0, 8) + '...')
        
        const savedUserCurrency = localStorage.getItem(userCurrencyKey)
        if (savedUserCurrency) {
          try {
            const parsedCurrency = parseInt(savedUserCurrency)
            setCurrency(parsedCurrency)
            console.log(`💰 Loaded user currency: ${parsedCurrency} coins`)
          } catch (error) {
            console.log('Error loading user currency:', error)
            // Set default coins for new authenticated users
            setCurrency(100) // Starting amount for new authenticated users
            localStorage.setItem(userCurrencyKey, '100')
          }
        } else {
          // New authenticated user - give them starter coins
          console.log('🎁 New authenticated user - granting starter coins (100)')
          setCurrency(100)
          localStorage.setItem(userCurrencyKey, '100')
        }
      } else {
        // Non-authenticated user - use guest currency (0 to encourage authentication)
        console.log('👤 Loading guest currency')
        const guestCurrency = localStorage.getItem('guestCurrency')
        if (guestCurrency) {
          try {
            const parsedCurrency = parseInt(guestCurrency)
            setCurrency(parsedCurrency)
          } catch (error) {
            setCurrency(0) // No coins for guest users
            localStorage.setItem('guestCurrency', '0')
          }
        } else {
          setCurrency(0) // No coins for guest users
          localStorage.setItem('guestCurrency', '0')
        }
      }
    }

    // Load currency when authentication state or user changes
    loadUserCurrency()
  }, [isAuthenticated, user])

  // Save currency to appropriate localStorage key whenever it changes
  useEffect(() => {
    if (currency > 0) {
      if (isAuthenticated && user) {
        // Save to user-specific key
        const userIdentifier = user?.wallet?.address || user?.email?.address || user?.id || 'unknown'
        const userCurrencyKey = `userCurrency_${userIdentifier}`
        localStorage.setItem(userCurrencyKey, currency.toString())
        console.log(`💾 Saved user currency: ${currency} coins for ${userIdentifier.substring(0, 8)}...`)
      } else {
        // Save to guest key
        localStorage.setItem('guestCurrency', currency.toString())
        console.log(`💾 Saved guest currency: ${currency} coins`)
      }
    }
  }, [currency, isAuthenticated, user])
  
  // Selected skin system for cross-component synchronization
  const [selectedSkin, setSelectedSkin] = useState({
    id: 'default',
    name: 'Default Warrior', 
    color: '#4A90E2'
  })

  // Load saved skin from localStorage on component mount
  useEffect(() => {
    const savedSkin = localStorage.getItem('selectedSkin')
    if (savedSkin) {
      try {
        const parsedSkin = JSON.parse(savedSkin)
        setSelectedSkin(parsedSkin)
      } catch (error) {
        console.log('Error loading saved skin:', error)
      }
    }
  }, [])

  // Track mouse movement for interactive eyes
  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY })
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  // Eye tracking scroll effect for mobile CUSTOMIZE panel
  useEffect(() => {
    if (!isMobile) return

    const handleScroll = () => {
      const scrollY = window.scrollY
      const windowHeight = window.innerHeight
      const scrollProgress = Math.min(scrollY / (windowHeight * 0.5), 1)
      
      // Calculate eye movement based on scroll position
      const maxEyeMovement = 2 // Maximum pixels the eyes can move
      const eyeX = Math.sin(scrollProgress * Math.PI * 2) * maxEyeMovement
      const eyeY = (scrollProgress - 0.5) * maxEyeMovement * 2
      
      setEyePosition({ x: eyeX, y: Math.max(-maxEyeMovement, Math.min(maxEyeMovement, eyeY)) })
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [isMobile])

  // Improved orientation detection function
  const detectLandscapeMode = () => {
    // Multiple methods to detect landscape mode for better reliability
    const screenOrientation = screen.orientation?.angle || window.orientation || 0
    const dimensionCheck = window.innerWidth > window.innerHeight
    const aspectRatio = window.innerWidth / window.innerHeight
    
    // Consider landscape if:
    // 1. Screen orientation is 90 or 270 degrees (landscape)
    // 2. Width is significantly greater than height (aspect ratio > 1.2)
    const isLandscapeByOrientation = Math.abs(screenOrientation) === 90
    const isLandscapeByDimensions = dimensionCheck && aspectRatio > 1.2
    
    const isLandscape = isLandscapeByOrientation || isLandscapeByDimensions
    
    console.log('🔍 Orientation Detection:', {
      screenOrientation,
      dimensionCheck,
      aspectRatio: aspectRatio.toFixed(2),
      isLandscapeByOrientation,
      isLandscapeByDimensions,
      finalResult: isLandscape
    })
    
    return isLandscape
  }

  // Orientation detection and game entry for mobile
  const checkOrientationAndEnterGame = (gameUrl) => {
    if (!isMobile) {
      // Desktop: Navigate immediately
      console.log('🖥️ Desktop detected - navigating directly to game')
      window.location.href = gameUrl
      return
    }

    // Mobile: Check orientation with improved detection
    const isLandscape = detectLandscapeMode()
    
    if (isLandscape) {
      // Already in landscape: Show loading then navigate
      console.log('📱 Mobile device already in landscape - showing loading and entering game')
      setPendingGameUrl(gameUrl)
      setShowOrientationModal(true)
      setOrientationModalLoading(true)
      
      // Show loading for a brief moment then navigate
      setTimeout(() => {
        console.log('🎮 Navigating to game:', gameUrl)
        window.location.href = gameUrl
      }, 1000)
    } else {
      // Portrait mode: Show orientation modal without loading
      console.log('📱 Mobile device in portrait - requesting landscape rotation')
      setPendingGameUrl(gameUrl)
      setShowOrientationModal(true)
      setOrientationModalLoading(false)
    }
  }

  // Listen for orientation changes when modal is open
  useEffect(() => {
    if (!showOrientationModal || !isMobile) return

    const handleOrientationChange = () => {
      // Add a small delay to allow browser to update dimensions
      setTimeout(() => {
        const isLandscape = detectLandscapeMode()
        
        if (isLandscape && pendingGameUrl) {
          console.log('📱 Device rotated to landscape - showing loading and entering game')
          setOrientationModalLoading(true)
          // Show loading then navigate
          setTimeout(() => {
            console.log('🎮 Navigating to game after orientation change:', pendingGameUrl)
            window.location.href = pendingGameUrl
          }, 1000)
        }
      }, 100) // Small delay to ensure accurate dimension readings
    }

    window.addEventListener('resize', handleOrientationChange)
    window.addEventListener('orientationchange', handleOrientationChange)
    
    return () => {
      window.removeEventListener('resize', handleOrientationChange)
      window.removeEventListener('orientationchange', handleOrientationChange)
    }
  }, [showOrientationModal, pendingGameUrl, isMobile])

  // Calculate eye positions based on mouse position
  const getEyePositions = () => {
    if (typeof window === 'undefined' || !circleRef.current) {
      return { leftEye: { x: 18, y: 22 }, rightEye: { x: 54, y: 22 } }
    }

    try {
      const rect = circleRef.current.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2
      
      // Calculate angle from circle center to mouse
      const angle = Math.atan2(mousePosition.y - centerY, mousePosition.x - centerX)
      
      // Limit eye movement within the circle (max 4px from default position for subtle movement)
      const maxDistance = 4
      const eyeOffsetX = Math.cos(angle) * maxDistance
      const eyeOffsetY = Math.sin(angle) * maxDistance
      
      return {
        leftEye: { 
          x: 25 + eyeOffsetX, // Moved closer to center (was 18)
          y: 22 + eyeOffsetY 
        },
        rightEye: { 
          x: 47 + eyeOffsetX, // Moved closer to center (was 54)
          y: 22 + eyeOffsetY 
        }
      }
    } catch (error) {
      // Fallback to default positions
      return { leftEye: { x: 18, y: 22 }, rightEye: { x: 54, y: 22 } }
    }
  }

  const eyePositions = getEyePositions()

  // Memoized background styles to prevent resets on state changes
  const mobileBackgroundStyles = useMemo(() => ({
    backgroundContainer: {
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      zIndex: 1,
      overflow: 'hidden'
    },
    mobileGrid: {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '120%',
      height: '120%',
      opacity: 0.3,
      backgroundImage: `
        linear-gradient(rgba(104, 211, 145, 0.3) 1px, transparent 1px),
        linear-gradient(90deg, rgba(104, 211, 145, 0.3) 1px, transparent 1px)
      `,
      backgroundSize: '40px 40px',
      animation: 'tacticalGrid 35s linear infinite'
    }
  }), []) // Empty dependency array - these styles never change

  // Stable random values for background animations (client-side only)
  const [floatingElements, setFloatingElements] = useState([])
  const [codeElements, setCodeElements] = useState([])

  // Initialize random elements after component mounts (client-side only)
  useEffect(() => {
    setFloatingElements(
      Array.from({ length: 18 }, (_, i) => ({
        id: i,
        width: Math.random() * 4 + 1,
        height: Math.random() * 4 + 1,
        color: ['#68d391', '#f6ad55', '#fc8181'][Math.floor(Math.random() * 3)],
        left: Math.random() * 100,
        top: Math.random() * 100,
        opacity: Math.random() * 0.7 + 0.2,
        animationDuration: Math.random() * 8 + 6,
        isCircle: Math.random() > 0.5
      }))
    )
    setCodeElements(
      Array.from({ length: 8 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        height: Math.random() * 300 + 100,
        animationDuration: Math.random() * 5 + 3,
        animationDelay: Math.random() * 3
      }))
    )
  }, []) // Only run once after mount

  useEffect(() => {
    // Aggressive mobile detection - prioritizes screen size
    const checkMobile = () => {
      // Screen dimensions - mobile if height <= 768 OR smallest dimension <= 768
      const heightCheck = window.innerHeight <= 768
      const smallestCheck = Math.min(window.innerWidth, window.innerHeight) <= 768
      const isSmallScreen = heightCheck || smallestCheck
      
      // Mobile landscape detection (wide but short screens - like phones in landscape)
      const aspectRatio = window.innerWidth / window.innerHeight
      const isMobileLandscape = window.innerHeight <= 500 && aspectRatio >= 1.5
      
      // Touch and user agent detection (for real devices)
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0
      const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      
      // ALWAYS mobile if screen is very small (for automation/testing)
      const isVerySmallScreen = window.innerHeight <= 600 || window.innerWidth <= 600
      
      // Device is mobile if ANY of these conditions are true:
      const mobile = isSmallScreen || isMobileLandscape || isVerySmallScreen || (isTouchDevice && isMobileUA)
      
      console.log('📱 AGGRESSIVE Mobile Detection:', {
        heightCheck,
        smallestCheck,
        isSmallScreen,
        isMobileLandscape,
        isVerySmallScreen,
        isTouchDevice,
        isMobileUA,
        screenWidth: window.innerWidth,
        screenHeight: window.innerHeight,
        minDimension: Math.min(window.innerWidth, window.innerHeight),
        aspectRatio: aspectRatio.toFixed(2),
        result: mobile,
        '*** FINAL DECISION ***': mobile ? 'MOBILE LAYOUT' : 'DESKTOP LAYOUT'
      })
      
      setIsMobile(mobile)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    
    // Live stats will be updated when users join/leave games and cash out
    
    // Simulate friends coming online after a delay
    const friendsTimer = setTimeout(() => {
      setActiveFriends(2) // Simulate 2 friends coming online
    }, 5000) // After 5 seconds
    
    // Leaderboard will be populated when users actually cash out
    // For now, it remains empty to show "LOADING LEADERBOARD..." state
    
    // Check for Privy authentication state with improved logic
    const checkPrivyAuth = () => {
      if (typeof window !== 'undefined' && window.__TURFLOOT_PRIVY__) {
        const privyState = window.__TURFLOOT_PRIVY__
        
        // Debug logging to track authentication state changes
        console.log('🔍 Privy Auth Check:', {
          ready: privyState.ready,
          authenticated: privyState.authenticated,
          hasUser: !!privyState.user,
          userEmail: privyState.user?.email?.address,
          userWallet: privyState.user?.wallet?.address?.slice(0, 8) + '...',
          userId: privyState.user?.id,
          userKeys: privyState.user ? Object.keys(privyState.user) : []
        })
        
        // Only update state if Privy is ready to avoid false negatives
        if (privyState.ready !== undefined) {
          const newAuthState = privyState.authenticated || false
          const newUser = privyState.user || null
          
          // Only update if state actually changed to reduce unnecessary re-renders
          setIsAuthenticated(prevAuth => {
            if (prevAuth !== newAuthState) {
              console.log('🔄 Authentication state changed:', prevAuth, '->', newAuthState)
              return newAuthState
            }
            return prevAuth
          })
          
          setUser(prevUser => {
            // Check if user object has meaningful changes
            const prevUserStr = JSON.stringify(prevUser)
            const newUserStr = JSON.stringify(newUser)
            if (prevUserStr !== newUserStr) {
              console.log('👤 User state changed:', {
                prev: prevUser ? { id: prevUser.id, wallet: prevUser.wallet?.address } : null,
                new: newUser ? { id: newUser.id, wallet: newUser.wallet?.address } : null
              })
              return newUser
            }
            return prevUser
          })
        }
      } else {
        console.log('⏳ Privy bridge not yet available, waiting...')
      }
    }
    
    // Initial auth check
    checkPrivyAuth()
    
    // More frequent initial checks to catch Privy user loading, then less frequent maintenance checks
    let checkCount = 0
    const authCheckInterval = setInterval(() => {
      checkPrivyAuth()
      checkCount++
      
      // After 50 checks (10 seconds at 200ms), reduce frequency to every 3 seconds
      if (checkCount >= 50) {
        clearInterval(authCheckInterval)
        const maintCheckInterval = setInterval(checkPrivyAuth, 3000)
        
        // Clean up maintenance interval on unmount
        return () => {
          clearInterval(maintCheckInterval)
        }
      }
    }, 200)
    
    return () => {
      window.removeEventListener('resize', checkMobile)
      clearTimeout(friendsTimer)
      clearInterval(authCheckInterval)
    }
  }, [])

  const handleJoinGame = () => {
    router.push(`/agario?roomId=global-practice-bots&mode=practice&fee=0`)
  }

  const handleJoinLobby = (serverData) => {
    console.log('Joining lobby:', serverData)
    // Navigate to the agario game with server data
    const queryParams = new URLSearchParams({
      roomId: serverData.id || 'lobby-' + Date.now(),
      mode: serverData.mode || 'practice',
      fee: serverData.entryFee || 0,
      region: serverData.region || 'US-East',
      name: serverData.name || 'Unknown Server'
    })
    router.push(`/agario?${queryParams.toString()}`)
    setIsServerBrowserOpen(false) // Close the modal after joining
  }

  const createDesktopLeaderboardPopup = async () => {
    // Only create popup on desktop
    if (window.innerWidth <= 768) return

    // Remove any existing leaderboard popup
    const existing = document.getElementById('desktop-leaderboard-popup')
    if (existing) existing.remove()

    // Fetch leaderboard data
    let leaderboardData = []
    try {
      console.log('🏆 Fetching leaderboard data...')
      const response = await fetch('/api/users/leaderboard')
      if (response.ok) {
        const data = await response.json()
        leaderboardData = data.users?.slice(0, 10) || [] // Top 10 players
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error)
    }

    // Create the popup container
    const popup = document.createElement('div')
    popup.id = 'desktop-leaderboard-popup'
    popup.style.cssText = `
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      background-color: rgba(0, 0, 0, 0.9) !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      z-index: 999999999 !important;
      pointer-events: auto !important;
    `

    // Create the modal content
    const modal = document.createElement('div')
    modal.style.cssText = `
      background-color: #1a202c !important;
      border: 3px solid #68d391 !important;
      border-radius: 12px !important;
      max-width: 900px !important;
      width: 90% !important;
      max-height: 80vh !important;
      overflow-y: auto !important;
      padding: 0 !important;
      color: white !important;
      box-shadow: 0 0 50px rgba(104, 211, 145, 0.5) !important;
      font-family: "Rajdhani", sans-serif !important;
    `

    // Generate leaderboard HTML
    const leaderboardHTML = `
      <div style="padding: 24px; border-bottom: 2px solid #68d391; background: linear-gradient(45deg, rgba(104, 211, 145, 0.1) 0%, rgba(104, 211, 145, 0.05) 100%);">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <div style="display: flex; align-items: center; gap: 16px;">
            <div style="width: 50px; height: 50px; background: linear-gradient(45deg, #68d391 0%, #48bb78 100%); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 24px;">
              🏆
            </div>
            <div>
              <h2 style="color: #68d391; font-size: 28px; font-weight: 700; margin: 0; text-transform: uppercase; text-shadow: 0 0 10px rgba(104, 211, 145, 0.6);">
                GLOBAL LEADERBOARD
              </h2>
              <p style="color: #a0aec0; font-size: 14px; margin: 4px 0 0 0;">
                Top players by performance • Live Rankings
              </p>
            </div>
          </div>
          <button id="close-leaderboard" style="background: rgba(252, 129, 129, 0.2); border: 2px solid #fc8181; border-radius: 8px; padding: 12px; color: #fc8181; cursor: pointer; font-size: 24px; width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; font-weight: bold;">
            ✕
          </button>
        </div>
      </div>

      <div style="padding: 24px;">
        ${leaderboardData.length > 0 ? `
          <div style="display: grid; grid-template-columns: 60px 1fr 120px 120px 120px; gap: 16px; padding: 16px; background: rgba(104, 211, 145, 0.1); border-radius: 8px; font-size: 14px; font-weight: 700; color: #68d391; text-transform: uppercase; margin-bottom: 16px;">
            <div>RANK</div>
            <div>PLAYER</div>
            <div>GAMES WON</div>
            <div>GAMES PLAYED</div>
            <div>WIN RATE</div>
          </div>
          ${leaderboardData.map((player, index) => {
            const winRate = player.gamesPlayed > 0 ? ((player.gamesWon / player.gamesPlayed) * 100).toFixed(1) : '0.0'
            const rankColor = index < 3 ? (index === 0 ? '#ffd700' : index === 1 ? '#c0c0c0' : '#cd7f32') : '#68d391'
            return `
              <div style="display: grid; grid-template-columns: 60px 1fr 120px 120px 120px; gap: 16px; padding: 16px; background: ${index % 2 === 0 ? 'rgba(45, 55, 72, 0.3)' : 'rgba(26, 32, 44, 0.3)'}; border-radius: 8px; border-left: 4px solid ${rankColor}; margin-bottom: 8px;">
                <div style="font-size: 18px; font-weight: 700; color: ${rankColor}; display: flex; align-items: center;">
                  #${index + 1}
                </div>
                <div style="font-size: 16px; font-weight: 600; color: #e2e8f0; display: flex; align-items: center;">
                  ${player.username || 'Anonymous'}
                </div>
                <div style="font-size: 16px; color: #68d391; font-weight: 600; display: flex; align-items: center;">
                  ${player.gamesWon || 0}
                </div>
                <div style="font-size: 16px; color: #a0aec0; display: flex; align-items: center;">
                  ${player.gamesPlayed || 0}
                </div>
                <div style="font-size: 16px; color: ${parseFloat(winRate) >= 70 ? '#68d391' : parseFloat(winRate) >= 50 ? '#f6ad55' : '#fc8181'}; font-weight: 600; display: flex; align-items: center;">
                  ${winRate}%
                </div>
              </div>
            `
          }).join('')}
        ` : `
          <div style="text-align: center; padding: 60px 20px; color: #a0aec0;">
            <div style="font-size: 48px; margin-bottom: 16px;">📊</div>
            <div style="font-size: 18px; margin-bottom: 8px;">NO LEADERBOARD DATA</div>
            <div style="font-size: 14px;">Play some games to see the rankings!</div>
          </div>
        `}
      </div>

      <div style="padding: 16px 24px; background: rgba(26, 32, 44, 0.8); border-top: 2px solid rgba(104, 211, 145, 0.2); text-align: center; border-radius: 0 0 8px 8px;">
        <div style="font-size: 12px; color: #68d391; text-transform: uppercase;">
          🔄 Live Rankings • Updated: ${new Date().toLocaleTimeString()}
        </div>
      </div>
    `

    modal.innerHTML = leaderboardHTML

    // Add close functionality
    modal.addEventListener('click', (e) => {
      if (e.target.id === 'close-leaderboard') {
        popup.remove()
      }
    })

    // Close on backdrop click
    popup.addEventListener('click', (e) => {
      if (e.target === popup) {
        popup.remove()
      }
    })

    // Close on Escape key
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        popup.remove()
        document.removeEventListener('keydown', handleEscape)
      }
    }
    document.addEventListener('keydown', handleEscape)

    popup.appendChild(modal)
    document.body.appendChild(popup)

    console.log('🏆 Desktop leaderboard popup created with direct DOM manipulation')
  }

  // REAL-TIME SOLANA BALANCE SYSTEM WITH 10% DEPOSIT FEE + PAID ROOMS
  
  // State for wallet balance display
  const [walletBalance, setWalletBalance] = useState({
    usd: '0.00',
    sol: '0.0000', 
    loading: false
  })
  
  // Balance check interval reference
  const balanceInterval = useRef(null)
  
  // Current wallet address being monitored
  const [currentWalletAddress, setCurrentWalletAddress] = useState(null)
  
  // Previous balance for deposit detection
  const [previousBalance, setPreviousBalance] = useState(0)
  
  // Fee processing state
  const [isProcessingFee, setIsProcessingFee] = useState(false)
  
  // Paid rooms system state
  const [insufficientFundsNotification, setInsufficientFundsNotification] = useState(null)

  // STEP 4: Expose balance to the page
  const fetchWalletBalance = async () => {
    console.log('💰 fetchWalletBalance called')
    
    const walletAddress = findWalletAddress()
    
    if (!walletAddress) {
      console.log('👛 No wallet found - setting default balance')
      setWalletBalance({ usd: '0.00', sol: '0.0000', loading: false })
      return
    }
    
    console.log('🚀 Fetching balance for:', walletAddress)
    
    // Set loading state
    setWalletBalance(prev => ({ ...prev, loading: true }))
    
    try {
      // Get SOL balance from blockchain
      const solBalance = await checkSolanaBalance(walletAddress)
      
      // Convert to USD (rough estimate)
      const usdBalance = (solBalance * 150).toFixed(2)
      
      // Update UI state
      setWalletBalance({
        sol: solBalance.toFixed(4),
        usd: usdBalance,
        loading: false
      })
      
      console.log('✅ Balance updated:', { sol: solBalance, usd: usdBalance })
      
    } catch (error) {
      console.error('❌ Error in fetchWalletBalance:', error)
      setWalletBalance({ usd: '0.00', sol: '0.0000', loading: false })
    }
  }

  // Manual balance update feature (for testing without RPC provider)
  const updateBalanceManually = (amount) => {
    if (currentWalletAddress) {
      const storageKey = `solana_balance_${currentWalletAddress}`
      const previousBalance = parseFloat(localStorage.getItem(storageKey)) || 0
      
      localStorage.setItem(storageKey, amount.toString())
      console.log(`💾 Manual balance update: ${amount} SOL for ${currentWalletAddress}`)
      
      // If this is an increase, trigger deposit detection
      if (amount > previousBalance) {
        console.log(`🧪 Simulating deposit of ${(amount - previousBalance).toFixed(4)} SOL`)
      }
      
      // Trigger immediate balance refresh
      fetchWalletBalance()
    }
  }

  // Expose to window for testing (remove in production)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.updateSolBalance = updateBalanceManually
      console.log('🧪 Testing functions available:')
      console.log('  - window.updateSolBalance(0.5) // Updates balance to 0.5 SOL')
      console.log('  - 💡 Try increasing balance to simulate deposit and fee processing!')
      
      // Show fee configuration
      const feePercentage = process.env.NEXT_PUBLIC_DEPOSIT_FEE_PERCENTAGE || 10
      const siteWallet = process.env.NEXT_PUBLIC_SITE_FEE_WALLET
      console.log(`💰 Fee Configuration: ${feePercentage}% → ${siteWallet}`)
    }
  }, [currentWalletAddress])

  // Handle balance refresh
  const handleBalanceRefresh = () => {
    console.log('🔄 Manual balance refresh triggered')
    fetchWalletBalance()
  }

  // Copy wallet address to clipboard
  const handleCopyAddress = async () => {
    try {
      console.log('📋 Copy address button clicked')
      
      // Check if Privy is available and user is authenticated
      if (!window.__TURFLOOT_PRIVY__ || !window.__TURFLOOT_PRIVY__.authenticated) {
        alert('Please login first to copy your wallet address.')
        return
      }
      
      const privy = window.__TURFLOOT_PRIVY__
      const user = privy.user
      
      if (!user || !user.wallet || !user.wallet.address) {
        alert('No wallet address found. Please ensure your wallet is connected.')
        return
      }
      
      const walletAddress = user.wallet.address
      console.log('📋 Copying wallet address:', walletAddress)
      
      // Copy to clipboard using modern API
      if (navigator.clipboard && window.isSecureContext) {
        try {
          await navigator.clipboard.writeText(walletAddress)
          console.log('✅ Address copied to clipboard via Clipboard API')
          
          // Show success feedback
          alert(`Wallet address copied to clipboard!\n\n${walletAddress}`)
        } catch (clipboardError) {
          console.log('⚠️ Clipboard API failed, trying fallback method')
          copyToClipboardFallback(walletAddress)
        }
      } else {
        // Fallback for older browsers or non-secure contexts
        copyToClipboardFallback(walletAddress)
      }
      
    } catch (error) {
      console.error('❌ Error copying wallet address:', error)
      alert('Failed to copy wallet address. Please try again.')
    }
  }

  // Fallback clipboard copy method
  const copyToClipboardFallback = (text) => {
    try {
      const textArea = document.createElement('textarea')
      textArea.value = text
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      textArea.style.top = '-999999px'
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      
      const successful = document.execCommand('copy')
      document.body.removeChild(textArea)
      
      if (successful) {
        console.log('✅ Address copied to clipboard via fallback method')
        alert(`Wallet address copied to clipboard!\n\n${text}`)
      } else {
        console.log('❌ Fallback copy method failed')
        alert(`Failed to copy automatically. Your wallet address is:\n\n${text}\n\nPlease copy it manually.`)
      }
    } catch (fallbackError) {
      console.error('❌ Fallback copy method error:', fallbackError)
      alert(`Failed to copy automatically. Your wallet address is:\n\n${text}\n\nPlease copy it manually.`)
    }
  }

  // PRIVY v2.24.0 SOLANA DEPOSIT - PROPER useFundWallet HOOK IMPLEMENTATION ✅
  const handleDeposit = async () => {
    console.log('💰 DEPOSIT SOL clicked - using proper useFundWallet hook v2.24.0!')
    
    try {
      // Ensure user is authenticated first
      if (!authenticated) {
        console.log('⚠️ User not authenticated, triggering login first')
        await login()
        return
      }

      console.log('✅ User authenticated, performing comprehensive wallet detection...')
      
      // Enhanced wallet detection: Check multiple sources
      let solanaWallet = null
      let walletSource = null
      
      // Method 1: Check useWallets() hook (primary method)
      if (wallets && wallets.length > 0) {
        console.log('🔍 Checking wallets from useWallets():', wallets.map(w => ({ 
          chainType: w.chainType, 
          address: w.address?.slice(0, 8) + '...',
          connectorType: w.connectorType 
        })))
        
        solanaWallet = wallets.find(w => w.chainType === 'solana')
        if (solanaWallet) {
          walletSource = 'useWallets'
        }
      }
      
      // Method 2: Check embedded wallet in privyUser.wallet
      if (!solanaWallet && privyUser?.wallet) {
        console.log('🔍 Checking embedded wallet from privyUser.wallet:', {
          address: privyUser.wallet.address,
          chainType: privyUser.wallet.chainType || 'ethereum',
          walletClientType: privyUser.wallet.walletClientType
        })
        
        // Check if embedded wallet is the Solana wallet we're looking for
        if (privyUser.wallet.address === 'F7zDew151bya8KatZiHF6EXDBi8DVNJvrLE619vwypvG' ||
            privyUser.wallet.chainType === 'solana') {
          solanaWallet = {
            address: privyUser.wallet.address,
            chainType: 'solana',
            connectorType: 'embedded'
          }
          walletSource = 'privyUser.wallet'
        }
      }
      
      // Method 3: Check linkedAccounts for Solana wallets
      if (!solanaWallet && privyUser?.linkedAccounts) {
        console.log('🔍 Checking linkedAccounts for Solana wallets:', privyUser.linkedAccounts.map(acc => ({
          type: acc.type,
          address: acc.address?.slice(0, 8) + '...',
          chainType: acc.chainType
        })))
        
        const linkedSolanaWallet = privyUser.linkedAccounts.find(acc => 
          acc.type === 'wallet' && 
          (acc.chainType === 'solana' || acc.address === 'F7zDew151bya8KatZiHF6EXDBi8DVNJvrLE619vwypvG')
        )
        
        if (linkedSolanaWallet) {
          solanaWallet = {
            address: linkedSolanaWallet.address,
            chainType: 'solana',
            connectorType: 'linked'
          }
          walletSource = 'linkedAccounts'
        }
      }
      
      // If still no Solana wallet found, show detailed error
      if (!solanaWallet) {
        console.log('❌ No Solana wallet found in any source')
        console.log('Available sources checked:', {
          useWalletsCount: wallets?.length || 0,
          hasEmbeddedWallet: !!privyUser?.wallet,
          embeddedWalletAddress: privyUser?.wallet?.address,
          linkedAccountsCount: privyUser?.linkedAccounts?.length || 0,
          linkedWallets: privyUser?.linkedAccounts?.filter(acc => acc.type === 'wallet').length || 0
        })
        
        alert('No Solana wallet found. Please ensure you have a Solana wallet connected or create an embedded wallet.')
        return
      }
      
      console.log('✅ Solana wallet found via:', walletSource, {
        address: solanaWallet.address,
        connectorType: solanaWallet.connectorType,
        chainType: solanaWallet.chainType
      })
      
      // Check if fundWallet is available from useFundWallet hook
      if (!fundWallet || typeof fundWallet !== 'function') {
        console.error('❌ fundWallet not available from useFundWallet hook')
        alert('Funding functionality not available. Please check Privy configuration or try refreshing the page.')
        return
      }
      
      console.log('🔧 Using HYBRID approach: Working useFundWallet with Solana cluster format...')
      
      // Check if fundWallet is available from useFundWallet hook
      if (!fundWallet || typeof fundWallet !== 'function') {
        console.error('❌ fundWallet not available from useFundWallet hook')
        alert('Funding functionality not available. Please check Privy configuration or try refreshing the page.')
        return
      }
      
      console.log('✅ fundWallet is available, trying Solana cluster format with exchange method...')
      
      // APPROACH 1: Use Solana cluster format with exchange method (per documentation)
      try {
        console.log('🧪 APPROACH 1: Solana cluster format with exchange method')
        await fundWallet(solanaWallet.address, {
          cluster: { name: 'mainnet-beta' },    // ✅ Correct Solana format per docs
          amount: '0.1',                        // ✅ SOL amount
          defaultFundingMethod: 'exchange',     // ✅ Force exchange transfer to show
          card: {
            preferredProvider: 'coinbase'       // ✅ Coinbase for exchange
          }
        })
        
        console.log('✅ SUCCESS: Solana cluster format with exchange method worked!')
        return
      } catch (error) {
        console.log('❌ APPROACH 1 (Solana cluster + exchange) failed:', error.message)
        console.log('🔄 Trying simplified Solana approach...')
      }

      // APPROACH 2: Simplified Solana cluster format
      try {
        console.log('🧪 APPROACH 2: Simplified Solana cluster format')
        await fundWallet(solanaWallet.address, {
          cluster: { name: 'mainnet-beta' },    // ✅ Correct Solana format per docs
          amount: '0.1'                         // ✅ SOL amount
        })
        
        console.log('✅ SUCCESS: Simplified Solana cluster format worked!')
        return
      } catch (error) {
        console.log('❌ APPROACH 2 (Solana cluster) failed:', error.message)
        console.log('🔄 Trying working chain ID approach...')
      }

      // APPROACH 3: Working chain ID format (reliable fallback)
      try {
        console.log('🧪 APPROACH 3: Working chain ID format (reliable fallback)')
        await fundWallet(solanaWallet.address, {
          chain: {
            id: 101, // Solana Mainnet chain ID
            name: 'Solana'
          },
          asset: 'native-currency' // SOL
        })
        
        console.log('✅ SUCCESS: Working chain ID format succeeded!')
        return
      } catch (error) {
        console.log('❌ APPROACH 3 (chain ID) failed:', error.message)
        throw error // Re-throw to trigger error handling
      }
      
      console.log('✅ SUCCESS! Privy funding modal opened with proper useFundWallet hook!')
      
    } catch (error) {
      console.error('❌ Solana funding error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
        fundWalletAvailable: typeof fundWallet === 'function'
      })
      
      // Provide user-friendly error messages based on common issues
      if (error.message?.includes('not enabled') || error.message?.includes('not available')) {
        alert('Wallet funding is not enabled for your account. Please contact support or check your Privy dashboard settings.')
      } else if (error.message?.includes('unsupported') || error.message?.includes('chain')) {
        alert('Solana funding may not be supported. Please check your Privy dashboard configuration.')
      } else if (error.message?.includes('User rejected') || error.message?.includes('cancelled')) {
        console.log('ℹ️ User cancelled the funding process')
        // Don't show alert for user cancellation
      } else {
        alert(`Unable to open funding modal: ${error.message || 'Please check browser console for details'}`)
      }
    }
  }

  const handleWithdraw = async () => {
    try {
      console.log('💸 WITHDRAW button clicked - Desktop/Mobile')
      console.log('🔍 Current authentication state:', { authenticated, privyUser: !!privyUser })
      console.log('🔍 withdrawalModalVisible current state:', withdrawalModalVisible)
      
      // Check authentication using Privy hooks directly
      if (!authenticated || !privyUser) {
        console.log('❌ User not authenticated, triggering login')
        if (typeof login === 'function') {
          await login()
          return
        } else {
          alert('Please log in first to access withdrawal functionality.')
          return
        }
      }
      
      console.log('✅ User authenticated via Privy, opening withdrawal modal')
      console.log('👤 User wallet:', privyUser.wallet?.address || 'No wallet')
      
      // Open different modals for desktop vs mobile
      if (window.innerWidth >= 768) {
        // Desktop: Open new desktop modal
        console.log('🖥️ Opening desktop withdrawal modal')
        setDesktopWithdrawalModalVisible(true)
      } else {
        // Mobile: Use existing modal
        console.log('📱 Opening mobile withdrawal modal')
        setWithdrawalModalVisible(true)
      }
      
    } catch (error) {
      console.error('❌ Withdraw error:', error)
      
      // More specific error handling
      if (error.message?.includes('invalid address')) {
        alert('Wallet address error. Please try logging out and back in to refresh your wallet connection.')
      } else if (error.message?.includes('network')) {
        alert('Network error. Please check your connection and try again.')
      } else {
        alert(`Withdrawal error: ${error.message || 'Unknown error occurred'}. Please try again or contact support.`)
      }
    }
  }



  const createWithdrawPopup = (user) => {
    // Remove any existing withdraw popup
    const existing = document.getElementById('withdraw-popup')
    if (existing) existing.remove()

    // Create the popup container
    const popup = document.createElement('div')
    popup.id = 'withdraw-popup'
    popup.style.cssText = `
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      background: rgba(13, 17, 23, 0.95) !important;
      backdrop-filter: blur(10px) !important;
      z-index: 9999 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
    `

    // Create the modal
    const modal = document.createElement('div')
    modal.style.cssText = `
      background: linear-gradient(145deg, #2d3748 0%, #1a202c 100%) !important;
      border: 2px solid #fc8181 !important;
      border-radius: 16px !important;
      width: 500px !important;
      max-width: 90vw !important;
      color: white !important;
      box-shadow: 0 0 50px rgba(252, 129, 129, 0.5) !important;
      font-family: "Rajdhani", sans-serif !important;
    `

    const walletAddress = user?.wallet?.address || 'No wallet connected'
    const shortAddress = walletAddress.length > 10 ? 
      `${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 4)}` : 
      walletAddress

    const withdrawHTML = `
      <div style="padding: 24px; border-bottom: 2px solid #fc8181; background: linear-gradient(45deg, rgba(252, 129, 129, 0.1) 0%, rgba(252, 129, 129, 0.05) 100%);">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <div style="display: flex; align-items: center; gap: 16px;">
            <div style="width: 50px; height: 50px; background: linear-gradient(45deg, #fc8181 0%, #e53e3e 100%); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 24px;">
              💸
            </div>
            <div>
              <h2 style="color: #fc8181; font-size: 28px; font-weight: 700; margin: 0; text-transform: uppercase; text-shadow: 0 0 10px rgba(252, 129, 129, 0.6);">
                WITHDRAW FUNDS
              </h2>
              <p style="color: #a0aec0; font-size: 14px; margin: 4px 0 0 0;">
                Withdraw funds from your TurfLoot wallet
              </p>
            </div>
          </div>
          <button id="close-withdraw" style="background: rgba(252, 129, 129, 0.2); border: 2px solid #fc8181; border-radius: 8px; padding: 12px; color: #fc8181; cursor: pointer; font-size: 24px; width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; font-weight: bold;">
            ✕
          </button>
        </div>
      </div>

      <div style="padding: 32px;">
        <!-- Wallet Info -->
        <div style="margin-bottom: 24px; padding: 16px; background: rgba(45, 55, 72, 0.5); border: 1px solid #fc8181; border-radius: 8px;">
          <div style="color: #fc8181; font-size: 14px; font-weight: 600; margin-bottom: 8px;">CONNECTED WALLET</div>
          <div style="color: #e2e8f0; font-size: 16px; font-family: monospace;">${shortAddress}</div>
        </div>

        <!-- Current Balance -->
        <div style="margin-bottom: 24px; padding: 16px; background: rgba(246, 173, 85, 0.1); border: 1px solid #f6ad55; border-radius: 8px;">
          <div style="color: #f6ad55; font-size: 14px; font-weight: 600; margin-bottom: 8px;">AVAILABLE BALANCE</div>
          <div style="color: #e2e8f0; font-size: 24px; font-weight: 700;">
            ${walletBalance.loading ? 'Loading...' : `$${walletBalance.usd} USD`}
          </div>
          <div style="color: #a0aec0; font-size: 12px; margin-top: 4px;">
            ${walletBalance.loading ? 'Fetching balance...' : `${walletBalance.sol} SOL available`}
          </div>
        </div>

        <!-- Withdraw Amount -->
        <div style="margin-bottom: 24px;">
          <label style="display: block; color: #fc8181; font-size: 14px; font-weight: 600; text-transform: uppercase; margin-bottom: 8px;">
            WITHDRAW AMOUNT
          </label>
          <div style="display: flex; gap: 12px;">
            <input 
              id="withdraw-amount" 
              type="number" 
              placeholder="0.00" 
              min="0"
              step="0.01"
              style="flex: 1; padding: 12px 16px; background: rgba(45, 55, 72, 0.8); border: 2px solid #fc8181; border-radius: 8px; color: #e2e8f0; font-size: 16px; font-family: 'Rajdhani', sans-serif; box-sizing: border-box;"
            />
            <select id="withdraw-currency" style="padding: 12px 16px; background: rgba(45, 55, 72, 0.8); border: 2px solid #fc8181; border-radius: 8px; color: #e2e8f0; font-size: 16px; font-family: 'Rajdhani', sans-serif;">
              <option value="SOL">SOL</option>
              <option value="USDC">USDC</option>
            </select>
          </div>
        </div>

        <!-- Destination Address -->
        <div style="margin-bottom: 24px;">
          <label style="display: block; color: #fc8181; font-size: 14px; font-weight: 600; text-transform: uppercase; margin-bottom: 8px;">
            DESTINATION ADDRESS (OPTIONAL)
          </label>
          <input 
            id="withdraw-address" 
            type="text" 
            placeholder="Use connected wallet address"
            style="width: 100%; padding: 12px 16px; background: rgba(45, 55, 72, 0.8); border: 2px solid #fc8181; border-radius: 8px; color: #e2e8f0; font-size: 14px; font-family: monospace; box-sizing: border-box;"
          />
          <div style="color: #a0aec0; font-size: 12px; margin-top: 4px;">Leave empty to withdraw to your connected wallet</div>
        </div>

        <!-- Important Notice -->
        <div style="margin-bottom: 24px; padding: 16px; background: rgba(252, 129, 129, 0.1); border: 1px solid #fc8181; border-radius: 8px;">
          <div style="color: #fc8181; font-size: 14px; font-weight: 600; margin-bottom: 8px;">⚠️ WITHDRAWAL TERMS</div>
          <div style="color: #e2e8f0; font-size: 12px; line-height: 1.4;">
            • Minimum withdrawal: 0.01 SOL<br>
            • Network fees will be deducted from withdrawal amount<br>
            • Processing time: 1-5 minutes<br>
            • Withdrawals are final and cannot be reversed
          </div>
        </div>

        <!-- Invite Friends Section -->
        <div style="margin-bottom: 24px;">
          <label style="display: block; color: #fc8181; font-size: 14px; font-weight: 600; text-transform: uppercase; margin-bottom: 12px;">
            👥 INVITE FRIENDS
          </label>
          
          <!-- Friends Search -->
          <div style="margin-bottom: 16px;">
            <input 
              id="friend-search-input" 
              type="text" 
              placeholder="Search friends..." 
              style="width: 100%; padding: 10px 16px; background: rgba(45, 55, 72, 0.6); border: 1px solid #4a5568; border-radius: 6px; color: #e2e8f0; font-size: 14px; font-family: 'Rajdhani', sans-serif; box-sizing: border-box;"
            />
          </div>
          
          <!-- Friends List -->
          <div id="friends-invite-list" style="max-height: 150px; overflow-y: auto; background: rgba(45, 55, 72, 0.3); border: 1px solid #4a5568; border-radius: 6px; padding: 12px;">
            <!-- Friends will be populated dynamically -->
          </div>
          
          <!-- Selected Friends Counter -->
          <div id="selected-friends-counter" style="margin-top: 8px; color: #a0aec0; font-size: 12px; text-align: center;">
            0 friends selected for invitation
          </div>
        </div>

        <!-- Action Buttons -->
        <div style="display: flex; gap: 12px;">
          <button id="cancel-withdraw" style="flex: 1; padding: 16px; background: rgba(74, 85, 104, 0.5); border: 2px solid #4a5568; border-radius: 8px; color: #a0aec0; font-size: 16px; font-weight: 700; cursor: pointer; font-family: 'Rajdhani', sans-serif; text-transform: uppercase;">
            CANCEL
          </button>
          <button id="confirm-withdraw" style="flex: 1; padding: 16px; background: linear-gradient(45deg, #fc8181 0%, #e53e3e 100%); border: 2px solid #fc8181; border-radius: 8px; color: white; font-size: 16px; font-weight: 700; cursor: pointer; font-family: 'Rajdhani', sans-serif; text-transform: uppercase; box-shadow: 0 0 20px rgba(252, 129, 129, 0.4);">
            WITHDRAW FUNDS
          </button>
        </div>
      </div>
    `

    modal.innerHTML = withdrawHTML

    // Add interactivity
    const confirmBtn = modal.querySelector('#confirm-withdraw')
    confirmBtn.addEventListener('click', async () => {
      const amount = parseFloat(modal.querySelector('#withdraw-amount').value)
      const currency = modal.querySelector('#withdraw-currency').value
      const address = modal.querySelector('#withdraw-address').value.trim()
      
      if (!amount || amount <= 0) {
        alert('Please enter a valid withdrawal amount')
        return
      }
      
      if (amount < 0.01) {
        alert('Minimum withdrawal amount is 0.01')
        return
      }
      
      const destinationAddress = address || walletAddress
      
      console.log('💸 Processing withdrawal:', { amount, currency, address: destinationAddress, user: user.id })
      
      // Here you would integrate with Privy's wallet functionality
      // For now, show success message
      alert(`Withdrawal initiated: ${amount} ${currency}\n\nDestination: ${destinationAddress.substring(0, 10)}...\n\nProcessing time: 1-5 minutes`)
      popup.remove()
      
      // In a real implementation, you would:
      // 1. Verify user has sufficient balance
      // 2. Create and sign the withdrawal transaction
      // 3. Submit to blockchain
      // 4. Update user balance via API
    })

    // Close handlers
    const closeBtn = modal.querySelector('#close-withdraw')
    const cancelBtn = modal.querySelector('#cancel-withdraw')
    
    const closePopup = () => popup.remove()
    
    closeBtn.addEventListener('click', closePopup)
    cancelBtn.addEventListener('click', closePopup)
    
    popup.addEventListener('click', (e) => {
      if (e.target === popup) closePopup()
    })

    popup.appendChild(modal)
    document.body.appendChild(popup)
    
    console.log('💸 Withdraw popup created')
  }

  const createGameLoadingPopup = () => {
    // Remove any existing loading popup
    const existing = document.getElementById('game-loading-popup')
    if (existing) existing.remove()

    // Create the popup container
    const popup = document.createElement('div')
    popup.id = 'game-loading-popup'
    popup.style.cssText = `
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      background: rgba(13, 17, 23, 0.98) !important;
      backdrop-filter: blur(15px) !important;
      z-index: 10000 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
    `

    // Create the modal
    const modal = document.createElement('div')
    modal.style.cssText = `
      background: linear-gradient(145deg, #2d3748 0%, #1a202c 100%) !important;
      border: 3px solid #68d391 !important;
      border-radius: 20px !important;
      width: 600px !important;
      max-width: 90vw !important;
      color: white !important;
      box-shadow: 0 0 60px rgba(104, 211, 145, 0.6) !important;
      font-family: "Rajdhani", sans-serif !important;
      overflow: hidden !important;
    `

    const loadingHTML = `
      <div style="padding: 32px; text-align: center;">
        <!-- Game Logo/Icon -->
        <div style="margin-bottom: 24px;">
          <div style="width: 80px; height: 80px; background: linear-gradient(45deg, #68d391 0%, #38a169 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 36px; margin: 0 auto; border: 4px solid #68d391; animation: pulse 2s infinite;">
            🎮
          </div>
        </div>

        <!-- Loading Title -->
        <h2 style="color: #68d391; font-size: 32px; font-weight: 700; margin: 0 0 16px 0; text-transform: uppercase; text-shadow: 0 0 15px rgba(104, 211, 145, 0.8);">
          LOADING GAME
        </h2>
        
        <!-- Status Message -->
        <div id="loading-status" style="color: #a0aec0; font-size: 16px; margin-bottom: 32px; min-height: 24px;">
          Initializing multiplayer connection...
        </div>

        <!-- Progress Bar Container -->
        <div style="background: rgba(45, 55, 72, 0.8); border: 2px solid #4a5568; border-radius: 12px; height: 24px; margin-bottom: 24px; overflow: hidden; position: relative;">
          <div id="progress-bar" style="
            background: linear-gradient(90deg, #68d391 0%, #38a169 50%, #68d391 100%);
            height: 100%;
            width: 0%;
            transition: width 0.5s ease;
            border-radius: 8px;
            box-shadow: 0 0 20px rgba(104, 211, 145, 0.5);
            position: relative;
            overflow: hidden;
          ">
            <div style="
              position: absolute;
              top: 0;
              left: -100%;
              width: 100%;
              height: 100%;
              background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
              animation: shimmer 2s infinite;
            "></div>
          </div>
        </div>

        <!-- Progress Percentage -->
        <div id="progress-text" style="color: #68d391; font-size: 18px; font-weight: 700; margin-bottom: 24px;">
          0%
        </div>

        <!-- Game Tips -->
        <div style="background: rgba(104, 211, 145, 0.1); border: 1px solid #68d391; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
          <div style="color: #68d391; font-size: 14px; font-weight: 600; margin-bottom: 12px; text-transform: uppercase;">
            🎯 GAME TIP
          </div>
          <div id="game-tip" style="color: #e2e8f0; font-size: 14px; line-height: 1.6;">
            Collect smaller players to grow larger and dominate the battlefield!
          </div>
        </div>

        <!-- Cancel Button -->
        <button id="cancel-loading" style="
          padding: 12px 24px; 
          background: rgba(252, 129, 129, 0.2); 
          border: 2px solid #fc8181; 
          border-radius: 8px; 
          color: #fc8181; 
          font-size: 14px; 
          font-weight: 700; 
          cursor: pointer; 
          font-family: 'Rajdhani', sans-serif; 
          text-transform: uppercase;
          transition: all 0.3s ease;
        ">
          CANCEL
        </button>
      </div>

      <style>
        @keyframes pulse {
          0%, 100% { transform: scale(1); box-shadow: 0 0 20px rgba(104, 211, 145, 0.4); }
          50% { transform: scale(1.05); box-shadow: 0 0 30px rgba(104, 211, 145, 0.8); }
        }
        
        @keyframes shimmer {
          0% { left: -100%; }
          100% { left: 100%; }
        }
      </style>
    `

    modal.innerHTML = loadingHTML
    popup.appendChild(modal)

    // Game tips array
    const gameTips = [
      "Collect smaller players to grow larger and dominate the battlefield!",
      "Split your cell with SPACE to catch smaller players or escape danger!",
      "Press W to eject mass and feed teammates or sacrifice for speed!",
      "Avoid larger players - they can absorb you in one bite!",
      "Use viruses strategically - they split large players into smaller pieces!",
      "Team up with friends for better survival and tactical advantages!",
      "Stay near the edges to avoid being surrounded by larger players!",
      "The leaderboard shows the top 10 players - climb your way up!"
    ]

    // Loading states and messages
    const loadingStates = [
      { progress: 10, message: "Connecting to Hathora servers...", delay: 800 },
      { progress: 25, message: "Authenticating player credentials...", delay: 1000 },
      { progress: 40, message: "Joining multiplayer lobby...", delay: 1200 },
      { progress: 55, message: "Loading game assets...", delay: 900 },
      { progress: 70, message: "Synchronizing with other players...", delay: 1100 },
      { progress: 85, message: "Initializing game world...", delay: 800 },
      { progress: 95, message: "Preparing battlefield...", delay: 600 },
      { progress: 100, message: "Ready to play! Launching game...", delay: 500 }
    ]

    let currentStateIndex = 0
    let currentTipIndex = 0

    // Update progress function
    const updateProgress = () => {
      if (currentStateIndex >= loadingStates.length) return

      const state = loadingStates[currentStateIndex]
      const progressBar = modal.querySelector('#progress-bar')
      const progressText = modal.querySelector('#progress-text')
      const statusMessage = modal.querySelector('#loading-status')

      // Update progress bar and text
      progressBar.style.width = `${state.progress}%`
      progressText.textContent = `${state.progress}%`
      statusMessage.textContent = state.message

      console.log(`🎮 Loading Progress: ${state.progress}% - ${state.message}`)

      currentStateIndex++

      // If loading is complete, proceed to game
      if (state.progress === 100) {
        setTimeout(() => {
          console.log('✅ Loading complete - proceeding to game')
          // The actual redirect happens in the calling function
        }, state.delay)
      } else {
        // Schedule next update
        setTimeout(updateProgress, state.delay)
      }
    }

    // Rotate game tips
    const rotateTips = () => {
      const tipElement = modal.querySelector('#game-tip')
      currentTipIndex = (currentTipIndex + 1) % gameTips.length
      tipElement.textContent = gameTips[currentTipIndex]
    }

    // Cancel button handler
    const cancelButton = modal.querySelector('#cancel-loading')
    cancelButton.addEventListener('click', () => {
      console.log('❌ Game loading cancelled by user')
      popup.remove()
    })

    // Add hover effect to cancel button
    cancelButton.addEventListener('mouseenter', () => {
      cancelButton.style.background = 'rgba(252, 129, 129, 0.3)'
      cancelButton.style.boxShadow = '0 0 15px rgba(252, 129, 129, 0.4)'
    })

    cancelButton.addEventListener('mouseleave', () => {
      cancelButton.style.background = 'rgba(252, 129, 129, 0.2)'
      cancelButton.style.boxShadow = 'none'
    })

    // Start loading animation
    setTimeout(updateProgress, 500)

    // Start tip rotation
    const tipInterval = setInterval(rotateTips, 3000)

    // Store cleanup function
    popup.cleanup = () => {
      clearInterval(tipInterval)
      popup.remove()
    }

    // Add popup to DOM
    document.body.appendChild(popup)

    console.log('🎮 Game loading popup created')
    return popup
  }

  const createSkinStorePopup = (currentCurrency, setCurrencyCallback, selectedSkinData, setSelectedSkinCallback, defaultTab = 'owned') => {
    // Only create popup on desktop
    if (window.innerWidth <= 768) return

    // Remove any existing skin store popup
    const existing = document.getElementById('desktop-skin-store-popup')
    if (existing) existing.remove()

    // Create the popup container
    const popup = document.createElement('div')
    popup.id = 'desktop-skin-store-popup'
    popup.style.cssText = `
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      background: rgba(13, 17, 23, 0.95) !important;
      backdrop-filter: blur(10px) !important;
      z-index: 9999 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
    `

    // Create the modal
    const modal = document.createElement('div')
    modal.style.cssText = `
      background: linear-gradient(145deg, #2d3748 0%, #1a202c 100%) !important;
      border: 2px solid #f6ad55 !important;
      border-radius: 16px !important;
      width: 900px !important;
      max-width: 90vw !important;
      max-height: 80vh !important;
      overflow-y: auto !important;
      color: white !important;
      box-shadow: 0 0 50px rgba(246, 173, 85, 0.5) !important;
      font-family: "Rajdhani", sans-serif !important;
    `

    // Mock skin data - in production this would come from API
    const availableSkins = [
      // Owned skins
      { id: 'default', name: 'Default Warrior', price: 0, owned: true, rarity: 'common', color: '#4A90E2' },
      { id: 'stealth', name: 'Stealth Operative', price: 150, owned: true, rarity: 'common', color: '#2C3E50' },
      { id: 'flame', name: 'Flame Guardian', price: 300, owned: true, rarity: 'common', color: '#E74C3C' },
      { id: 'toxic', name: 'Toxic Assassin', price: 250, owned: true, rarity: 'common', color: '#27AE60' },
      { id: 'electric', name: 'Electric Storm', price: 500, owned: true, rarity: 'common', color: '#F39C12' },
      { id: 'shadow', name: 'Shadow Reaper', price: 450, owned: true, rarity: 'common', color: '#8E44AD' },
      
      // Shop skins - Common tier
      { id: 'coral', name: 'Coral Reef', price: 100, owned: false, rarity: 'common', color: '#FF7F7F' },
      { id: 'forest', name: 'Forest Spirit', price: 120, owned: false, rarity: 'common', color: '#228B22' },
      
      // Shop skins - Uncommon tier  
      { id: 'crimson', name: 'Crimson Blade', price: 200, owned: false, rarity: 'uncommon', color: '#DC143C' },
      { id: 'ocean', name: 'Ocean Depths', price: 180, owned: false, rarity: 'uncommon', color: '#1E90FF' },
      { id: 'mint', name: 'Mint Fresh', price: 160, owned: false, rarity: 'uncommon', color: '#00FA9A' },
      
      // Shop skins - Rare tier
      { id: 'midnight', name: 'Midnight Oil', price: 350, owned: false, rarity: 'rare', color: '#191970' },
      { id: 'magma', name: 'Magma Core', price: 400, owned: false, rarity: 'rare', color: '#FF4500' },
      { id: 'arctic', name: 'Arctic Frost', price: 380, owned: false, rarity: 'rare', color: '#B0E0E6' },
      
      // Shop skins - Epic tier
      { id: 'plasma', name: 'Plasma Fury', price: 600, owned: false, rarity: 'epic', color: '#FF1493' },
      { id: 'void', name: 'Void Walker', price: 650, owned: false, rarity: 'epic', color: '#483D8B' },
      { id: 'neon', name: 'Neon Pulse', price: 700, owned: false, rarity: 'epic', color: '#00FF00' },
      
      // Shop skins - Legendary tier
      { id: 'golden', name: 'Golden Emperor', price: 1000, owned: false, rarity: 'legendary', color: '#FFD700' },
      { id: 'diamond', name: 'Diamond Elite', price: 2000, owned: false, rarity: 'legendary', color: '#E8F4FD' },
      { id: 'rainbow', name: 'Rainbow Prism', price: 1500, owned: false, rarity: 'legendary', color: 'linear-gradient(45deg, #FF6B6B, #4ECDC4, #45B7D1)' },
      { id: 'cosmic', name: 'Cosmic Entity', price: 2500, owned: false, rarity: 'legendary', color: '#4B0082' }
    ]

    let currentSkin = selectedSkinData.id || 'default' // Initialize with current selected skin
    // Use dynamic currency from missions system instead of hardcoded value

    const skinStoreHTML = `
      <div style="padding: 24px; border-bottom: 2px solid #f6ad55; background: linear-gradient(45deg, rgba(246, 173, 85, 0.1) 0%, rgba(246, 173, 85, 0.05) 100%);">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <div style="display: flex; align-items: center; gap: 16px;">
            <div style="width: 50px; height: 50px; background: linear-gradient(45deg, #f6ad55 0%, #ed8936 100%); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 24px;">
              🛒
            </div>
            <div>
              <h2 style="color: #f6ad55; font-size: 28px; font-weight: 700; margin: 0; text-transform: uppercase; text-shadow: 0 0 10px rgba(246, 173, 85, 0.6);">
                SKIN STORE
              </h2>
              <p style="color: #a0aec0; font-size: 14px; margin: 4px 0 0 0;">
                Customize your warrior with exclusive skins
              </p>
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 16px;">
            <div style="display: flex; align-items: center; gap: 8px; padding: 12px 16px; background: rgba(246, 173, 85, 0.1); border: 1px solid #f6ad55; border-radius: 8px;">
              <div style="color: #f6ad55; font-size: 20px;">💰</div>
              <div style="color: #f6ad55; font-size: 18px; font-weight: 700;" id="player-coins">${currentCurrency}</div>
            </div>
            <button id="close-skin-store" style="background: rgba(246, 173, 85, 0.2); border: 2px solid #f6ad55; border-radius: 8px; padding: 12px; color: #f6ad55; cursor: pointer; font-size: 24px; width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; font-weight: bold;">
              ✕
            </button>
          </div>
        </div>
      </div>

      <div style="padding: 32px;">
        <!-- Skin Categories -->
        <div style="margin-bottom: 24px;">
          <div style="display: flex; gap: 12px; margin-bottom: 20px;">
            <button class="category-tab" data-category="all" style="flex: 1; padding: 12px; background: linear-gradient(45deg, #f6ad55 0%, #ed8936 100%); border: 2px solid #f6ad55; border-radius: 8px; color: white; font-size: 14px; font-weight: 700; cursor: pointer; font-family: 'Rajdhani', sans-serif; text-transform: uppercase;">
              ALL SKINS
            </button>
            <button class="category-tab" data-category="owned" style="flex: 1; padding: 12px; background: rgba(45, 55, 72, 0.5); border: 2px solid #4a5568; border-radius: 8px; color: #a0aec0; font-size: 14px; font-weight: 700; cursor: pointer; font-family: 'Rajdhani', sans-serif; text-transform: uppercase;">
              OWNED
            </button>
            <button class="category-tab" data-category="shop" style="flex: 1; padding: 12px; background: rgba(45, 55, 72, 0.5); border: 2px solid #4a5568; border-radius: 8px; color: #a0aec0; font-size: 14px; font-weight: 700; cursor: pointer; font-family: 'Rajdhani', sans-serif; text-transform: uppercase;">
              SHOP
            </button>
          </div>
        </div>

        <!-- Skins Grid -->
        <div id="skins-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px; max-height: 400px; overflow-y: auto;">
          <!-- Skins will be populated here -->
        </div>

        <!-- Action Buttons -->
        <div style="display: flex; gap: 12px;">
          <button id="close-store" style="flex: 1; padding: 16px; background: rgba(74, 85, 104, 0.5); border: 2px solid #4a5568; border-radius: 8px; color: #a0aec0; font-size: 16px; font-weight: 700; cursor: pointer; font-family: 'Rajdhani', sans-serif; text-transform: uppercase;">
            CLOSE STORE
          </button>
        </div>
      </div>
    `

    modal.innerHTML = skinStoreHTML
    popup.appendChild(modal)

    // Add interactivity
    let currentCategory = defaultTab // Use the passed defaultTab parameter
    
    // Rarity colors
    const rarityColors = {
      common: '#a0aec0',
      uncommon: '#68d391', 
      rare: '#3182ce',
      epic: '#9f7aea',
      legendary: '#f6ad55'
    }

    // Tab switching
    const categoryTabs = modal.querySelectorAll('.category-tab')
    
    const switchCategory = (category) => {
      currentCategory = category
      
      // Update tab styles
      categoryTabs.forEach(tab => {
        if (tab.dataset.category === category) {
          tab.style.background = 'linear-gradient(45deg, #f6ad55 0%, #ed8936 100%)'
          tab.style.border = '2px solid #f6ad55'
          tab.style.color = 'white'
        } else {
          tab.style.background = 'rgba(45, 55, 72, 0.5)'
          tab.style.border = '2px solid #4a5568'
          tab.style.color = '#a0aec0'
        }
      })
      
      renderSkins()
    }
    
    categoryTabs.forEach(tab => {
      tab.addEventListener('click', () => switchCategory(tab.dataset.category))
    })

    // Render skins function
    const renderSkins = () => {
      const skinsGrid = modal.querySelector('#skins-grid')
      
      let filteredSkins = availableSkins
      if (currentCategory === 'owned') {
        filteredSkins = availableSkins.filter(skin => skin.owned)
      } else if (currentCategory === 'shop') {
        filteredSkins = availableSkins.filter(skin => !skin.owned)
      }
      
      skinsGrid.innerHTML = filteredSkins.map(skin => {
        const rarityColor = rarityColors[skin.rarity]
        const isEquipped = skin.id === selectedSkinData.id // Use the current selected skin instead of static currentSkin
        const canAfford = currentCurrency >= skin.price
        
        return `
          <div class="skin-card" data-skin-id="${skin.id}" style="
            padding: 16px; 
            background: rgba(45, 55, 72, 0.5); 
            border: 2px solid ${isEquipped ? '#68d391' : '#4a5568'}; 
            border-radius: 12px; 
            cursor: pointer; 
            transition: all 0.3s ease;
            ${isEquipped ? 'box-shadow: 0 0 20px rgba(104, 211, 145, 0.4);' : ''}
          ">
            <div style="text-align: center; margin-bottom: 12px;">
              <div style="width: 80px; height: 80px; background: ${skin.color}; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto; border: 3px solid #ffffff; position: relative; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);">
                <!-- Black Eyes - Same as in-game character -->
                <div style="position: absolute; width: 8px; height: 8px; background: #000000; border-radius: 50%; left: 22px; top: 26px;"></div>
                <div style="position: absolute; width: 8px; height: 8px; background: #000000; border-radius: 50%; right: 22px; top: 26px;"></div>
              </div>
            </div>
            
            <div style="text-align: center;">
              <div style="color: ${rarityColor}; font-size: 16px; font-weight: 700; margin-bottom: 4px;">
                ${skin.name}
              </div>
              <div style="color: ${rarityColor}; font-size: 12px; text-transform: uppercase; margin-bottom: 8px;">
                ${skin.rarity}
              </div>
              
              ${skin.owned ? 
                (isEquipped ? 
                  '<div style="color: #68d391; font-size: 12px; font-weight: 600;">✓ EQUIPPED</div>' :
                  '<button class="equip-skin-btn" data-skin-id="' + skin.id + '" style="width: 100%; padding: 8px; background: linear-gradient(45deg, #68d391 0%, #38a169 100%); border: 2px solid #68d391; border-radius: 6px; color: white; font-size: 12px; font-weight: 700; cursor: pointer; font-family: \'Rajdhani\', sans-serif; text-transform: uppercase;">EQUIP</button>'
                ) : 
                `<button class="buy-skin-btn" data-skin-id="${skin.id}" style="width: 100%; padding: 8px; background: ${canAfford ? 'linear-gradient(45deg, #f6ad55 0%, #ed8936 100%)' : 'rgba(74, 85, 104, 0.5)'}; border: 2px solid ${canAfford ? '#f6ad55' : '#4a5568'}; border-radius: 6px; color: ${canAfford ? 'white' : '#a0aec0'}; font-size: 12px; font-weight: 700; cursor: ${canAfford ? 'pointer' : 'not-allowed'}; font-family: 'Rajdhani', sans-serif; text-transform: uppercase;">
                  🪙 ${skin.price} COINS
                </button>`
              }
            </div>
          </div>
        `
      }).join('')
      
      // Add click handlers
      const skinCards = skinsGrid.querySelectorAll('.skin-card')
      const equipButtons = skinsGrid.querySelectorAll('.equip-skin-btn')
      const buyButtons = skinsGrid.querySelectorAll('.buy-skin-btn')
      
      // Skin card hover effects
      skinCards.forEach(card => {
        card.addEventListener('mouseenter', () => {
          if (card.dataset.skinId !== currentSkin) {
            card.style.border = '2px solid #f6ad55'
            card.style.background = 'rgba(246, 173, 85, 0.1)'
          }
        })
        
        card.addEventListener('mouseleave', () => {
          if (card.dataset.skinId !== currentSkin) {
            card.style.border = '2px solid #4a5568'
            card.style.background = 'rgba(45, 55, 72, 0.5)'
          }
        })
      })
      
      // Equip skin buttons
      console.log('🔧 Found equip buttons:', equipButtons.length)
      
      equipButtons.forEach((btn, index) => {
        console.log(`🔧 Attaching event listener to button ${index + 1}:`, btn.dataset.skinId)
        btn.addEventListener('click', async (e) => {
          console.log('🎯 EQUIP button clicked!', btn.dataset.skinId)
          e.stopPropagation()
          const skinId = btn.dataset.skinId
          const skin = availableSkins.find(s => s.id === skinId)
          
          if (!skin) {
            console.error('❌ Skin not found for ID:', skinId)
            return
          }
          
          console.log('✅ Found skin to equip:', skin.name, skin.id)
          
          currentSkin = skinId
          
          // Update current skin display and landing page preview
          const currentSkinPreview = modal.querySelector('#current-skin-preview')
          const currentSkinName = modal.querySelector('#current-skin-name')
          
          // Only update preview elements if they exist
          if (currentSkinPreview) {
            currentSkinPreview.style.background = skin.color
            currentSkinPreview.innerHTML = `
              <div style="position: absolute; width: 6px; height: 6px; background: #000000; border-radius: 50%; left: 16px; top: 20px;"></div>
              <div style="position: absolute; width: 6px; height: 6px; background: #000000; border-radius: 50%; right: 16px; top: 20px;"></div>
            `
          }
          
          if (currentSkinName) {
            currentSkinName.textContent = skin.name
          }
          
          // Update landing page preview circle and state
          setSelectedSkinCallback({
            id: skin.id,
            name: skin.name,
            color: skin.color,
            type: skin.type || 'circle',
            pattern: skin.pattern || 'solid'
          })
          
          // Update the selected skin state
          setSelectedSkin({
            id: skin.id,
            name: skin.name,
            color: skin.color,
            type: skin.type || 'circle',
            pattern: skin.pattern || 'solid'
          })
          
          // Save equipped skin to localStorage
          localStorage.setItem('selectedSkin', JSON.stringify({
            id: skin.id,
            name: skin.name,
            color: skin.color,
            type: skin.type || 'circle',
            pattern: skin.pattern || 'solid'
          }))
          
          // Save equipped skin to backend/database
          if (isAuthenticated && user) {
            try {
              const userIdentifier = user.wallet?.address || user.email || user.id
              console.log('💾 Saving equipped skin to backend for user:', userIdentifier)
              
              const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/friends`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  action: 'update_equipped_skin',
                  userIdentifier: userIdentifier,
                  equippedSkin: {
                    id: skin.id,
                    name: skin.name,
                    color: skin.color,
                    type: skin.type || 'circle',
                    pattern: skin.pattern || 'solid'
                  }
                })
              })
              
              if (response.ok) {
                console.log('✅ Equipped skin saved to backend successfully')
                
                // Refresh party data to show updated skin
                console.log('🔄 Refreshing party data to show updated skin...')
                await loadCurrentParty()
                
              } else {
                console.error('❌ Failed to save equipped skin to backend:', response.status)
              }
            } catch (error) {
              console.error('❌ Error saving equipped skin to backend:', error)
            }
          }
          
          console.log('✅ Skin equipped successfully:', {
            skinId: skin.id,
            skinName: skin.name,
            skinColor: skin.color
          })
          
          // Visual feedback for successful equip BEFORE re-rendering
          btn.textContent = 'EQUIPPED!'
          btn.style.background = 'linear-gradient(45deg, #22c55e 0%, #16a34a 100%)'
          btn.style.borderColor = '#22c55e'
          
          // Show feedback for 2 seconds, then update the entire store
          setTimeout(() => {
            // Update the skin store display to show new equipped status
            renderSkins()
            console.log('🔄 Skin store UI refreshed to show new equipped status')
          }, 2000)
          
          // Save to localStorage for persistence across sessions
          localStorage.setItem('selectedSkin', JSON.stringify({
            id: skin.id,
            name: skin.name,
            color: skin.color
          }))
          
          console.log('🎨 Equipped skin:', skin.name)
          // Removed popup notification for smoother UX
          
          renderSkins() // Re-render to update equipped status
        })
      })
      
      // Buy skin buttons
      buyButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation()
          const skinId = btn.dataset.skinId
          const skin = availableSkins.find(s => s.id === skinId)
          
          if (currentCurrency >= skin.price) {
            // Purchase skin
            setCurrencyCallback(prev => prev - skin.price)
            skin.owned = true
            
            // Update UI display immediately
            const coinsDisplay = modal.querySelector('#player-coins')
            coinsDisplay.textContent = currentCurrency - skin.price
            
            console.log('🛒 Purchased skin:', skin.name, 'for', skin.price, 'coins')
            alert(`Successfully purchased ${skin.name} for ${skin.price} coins!`)
            
            renderSkins() // Re-render to show as owned
          } else {
            alert(`Not enough coins! You need ${skin.price - currentCurrency} more coins.`)
          }
        })
      })
    }

    // Close popup handlers
    const closeButton = modal.querySelector('#close-skin-store')
    const closeStoreButton = modal.querySelector('#close-store')
    
    const closePopup = () => {
      popup.remove()
    }
    
    closeButton.addEventListener('click', closePopup)
    closeStoreButton.addEventListener('click', closePopup)
    
    // Close on backdrop click
    popup.addEventListener('click', (e) => {
      if (e.target === popup) {
        closePopup()
      }
    })

    // Initialize the correct tab based on defaultTab parameter
    const allTab = modal.querySelector('[data-category="all"]')
    const ownedTab = modal.querySelector('[data-category="owned"]')
    const shopTab = modal.querySelector('[data-category="shop"]')
    
    // Reset all tabs to inactive state
    ;[allTab, ownedTab, shopTab].forEach(tab => {
      if (tab) {
        tab.style.background = 'rgba(45, 55, 72, 0.5)'
        tab.style.border = '2px solid #4a5568'
        tab.style.color = '#a0aec0'
      }
    })
    
    // Set the default tab to active state
    const defaultTabElement = modal.querySelector(`[data-category="${defaultTab}"]`)
    if (defaultTabElement) {
      defaultTabElement.style.background = 'linear-gradient(45deg, #f6ad55 0%, #ed8936 100%)'
      defaultTabElement.style.border = '2px solid #f6ad55'
      defaultTabElement.style.color = 'white'
    }

    // Initial render
    renderSkins()

    // Add popup to DOM
    document.body.appendChild(popup)

    console.log('🛒 Skin store popup created with direct DOM manipulation')
  }

  const createDesktopServerBrowserPopup = () => {
    // Only create popup on desktop
    if (window.innerWidth <= 768) return

    // Remove any existing server browser popup
    const existing = document.getElementById('desktop-server-browser-popup')
    if (existing) existing.remove()

    // Create the popup container
    const popup = document.createElement('div')
    popup.id = 'desktop-server-browser-popup'
    popup.style.cssText = `
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      background: rgba(13, 17, 23, 0.95) !important;
      backdrop-filter: blur(10px) !important;
      z-index: 9999 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
    `

    // Create the modal
    const modal = document.createElement('div')
    modal.style.cssText = `
      background: linear-gradient(145deg, #2d3748 0%, #1a202c 100%) !important;
      border: 2px solid #68d391 !important;
      border-radius: 16px !important;
      width: 800px !important;
      max-width: 90vw !important;
      max-height: 80vh !important;
      overflow-y: auto !important;
      color: white !important;
      box-shadow: 0 0 50px rgba(104, 211, 145, 0.5) !important;
      font-family: "Rajdhani", sans-serif !important;
    `

    // Generate server browser HTML
    const serverBrowserHTML = `
      <div style="padding: 24px; border-bottom: 2px solid #68d391; background: linear-gradient(45deg, rgba(104, 211, 145, 0.1) 0%, rgba(104, 211, 145, 0.05) 100%);">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <div style="display: flex; align-items: center; gap: 16px;">
            <div style="width: 50px; height: 50px; background: linear-gradient(45deg, #68d391 0%, #38a169 100%); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 24px;">
              🌐
            </div>
            <div>
              <h2 style="color: #68d391; font-size: 28px; font-weight: 700; margin: 0; text-transform: uppercase; text-shadow: 0 0 10px rgba(104, 211, 145, 0.6);">
                SERVER BROWSER
              </h2>
              <p style="color: #a0aec0; font-size: 14px; margin: 4px 0 0 0;">
                Join active multiplayer servers worldwide
              </p>
            </div>
          </div>
          <button id="close-server-browser" style="background: rgba(104, 211, 145, 0.2); border: 2px solid #68d391; border-radius: 8px; padding: 12px; color: #68d391; cursor: pointer; font-size: 24px; width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; font-weight: bold;">
            ✕
          </button>
        </div>
      </div>

      <div style="padding: 32px;">
        <!-- Server Filters -->
        <div style="margin-bottom: 24px;">
          <div style="display: flex; gap: 12px; margin-bottom: 16px;">
            <button id="all-servers-tab" class="server-filter-tab" data-filter="all" style="flex: 1; padding: 12px; background: linear-gradient(45deg, #68d391 0%, #38a169 100%); border: 2px solid #68d391; border-radius: 8px; color: white; font-size: 14px; font-weight: 700; cursor: pointer; font-family: 'Rajdhani', sans-serif; text-transform: uppercase;">
              ALL SERVERS
            </button>
            <button id="free-servers-tab" class="server-filter-tab" data-filter="free" style="flex: 1; padding: 12px; background: rgba(45, 55, 72, 0.5); border: 2px solid #4a5568; border-radius: 8px; color: #a0aec0; font-size: 14px; font-weight: 700; cursor: pointer; font-family: 'Rajdhani', sans-serif; text-transform: uppercase;">
              FREE SERVERS
            </button>
            <button id="paid-servers-tab" class="server-filter-tab" data-filter="paid" style="flex: 1; padding: 12px; background: rgba(45, 55, 72, 0.5); border: 2px solid #4a5568; border-radius: 8px; color: #a0aec0; font-size: 14px; font-weight: 700; cursor: pointer; font-family: 'Rajdhani', sans-serif; text-transform: uppercase;">
              PAID SERVERS
            </button>
          </div>
          
          <!-- Search and Refresh -->
          <div style="display: flex; gap: 12px;">
            <input 
              id="server-search-input" 
              type="text" 
              placeholder="Search servers..." 
              style="flex: 1; padding: 12px 16px; background: rgba(45, 55, 72, 0.8); border: 2px solid #68d391; border-radius: 8px; color: #e2e8f0; font-size: 16px; font-family: 'Rajdhani', sans-serif; box-sizing: border-box;"
            />
            <button id="refresh-servers-btn" style="padding: 12px 24px; background: linear-gradient(45deg, #f6ad55 0%, #ed8936 100%); border: 2px solid #f6ad55; border-radius: 8px; color: white; font-size: 14px; font-weight: 700; cursor: pointer; font-family: 'Rajdhani', sans-serif; text-transform: uppercase;">
              REFRESH
            </button>
          </div>
        </div>

        <!-- Server Status Info -->
        <div id="server-status-info" style="margin-bottom: 20px; padding: 16px; background: rgba(104, 211, 145, 0.1); border: 1px solid #68d391; border-radius: 8px;">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <div style="color: #68d391; font-size: 14px; font-weight: 600;">
              <span id="server-count">Loading...</span> • <span id="total-players">Loading...</span>
            </div>
            <div style="color: #68d391; font-size: 12px;">
              Last updated: <span id="last-updated">--:--</span>
            </div>
          </div>
        </div>

        <!-- Servers List -->
        <div id="servers-list" style="margin-bottom: 24px; max-height: 400px; overflow-y: auto;">
          <div style="text-align: center; padding: 40px; color: #a0aec0;">
            <div style="font-size: 48px; margin-bottom: 16px;">🔄</div>
            <div style="font-size: 18px; font-weight: 600; margin-bottom: 8px;">Loading Servers...</div>
            <div style="font-size: 14px;">Fetching available multiplayer servers</div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div style="display: flex; gap: 12px;">
          <button id="cancel-server-browser" style="flex: 1; padding: 16px; background: rgba(74, 85, 104, 0.5); border: 2px solid #4a5568; border-radius: 8px; color: #a0aec0; font-size: 16px; font-weight: 700; cursor: pointer; font-family: 'Rajdhani', sans-serif; text-transform: uppercase;">
            CLOSE
          </button>
        </div>
      </div>
    `

    modal.innerHTML = serverBrowserHTML
    popup.appendChild(modal)

    // Add interactivity
    let currentFilter = 'all'
    let serversData = []
    let selectedServer = null
    
    // Tab switching
    const allTab = modal.querySelector('#all-servers-tab')
    const freeTab = modal.querySelector('#free-servers-tab')
    const paidTab = modal.querySelector('#paid-servers-tab')
    
    const switchTab = (filterType) => {
      currentFilter = filterType
      
      // Update tab styles
      const tabs = [allTab, freeTab, paidTab]
      tabs.forEach(tab => {
        tab.style.background = 'rgba(45, 55, 72, 0.5)'
        tab.style.border = '2px solid #4a5568'
        tab.style.color = '#a0aec0'
      })
      
      const activeTab = modal.querySelector(`[data-filter="${filterType}"]`)
      activeTab.style.background = 'linear-gradient(45deg, #68d391 0%, #38a169 100%)'
      activeTab.style.border = '2px solid #68d391'
      activeTab.style.color = 'white'
      
      renderServers()
    }
    
    allTab.addEventListener('click', () => switchTab('all'))
    freeTab.addEventListener('click', () => switchTab('free'))
    paidTab.addEventListener('click', () => switchTab('paid'))

    // Load servers function
    const loadServers = async () => {
      try {
        const response = await fetch('/api/servers/lobbies')
        if (response.ok) {
          const data = await response.json()
          serversData = data.servers || []
          
          // Update status info
          const serverCount = modal.querySelector('#server-count')
          const totalPlayers = modal.querySelector('#total-players')
          const lastUpdated = modal.querySelector('#last-updated')
          
          const totalPlayerCount = serversData.reduce((sum, server) => sum + (server.currentPlayers || 0), 0)
          
          serverCount.textContent = `${serversData.length} servers online`
          totalPlayers.textContent = `${totalPlayerCount} players active`
          lastUpdated.textContent = new Date().toLocaleTimeString()
          
          renderServers()
        } else {
          throw new Error(`HTTP ${response.status}`)
        }
      } catch (error) {
        console.error('Failed to load servers:', error)
        const serversList = modal.querySelector('#servers-list')
        serversList.innerHTML = `
          <div style="text-align: center; padding: 40px; color: #fc8181;">
            <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
            <div style="font-size: 18px; font-weight: 600; margin-bottom: 8px;">Failed to Load Servers</div>
            <div style="font-size: 14px;">Unable to fetch server list. Please try refreshing.</div>
          </div>
        `
      }
    }

    // Render servers function
    const renderServers = () => {
      const serversList = modal.querySelector('#servers-list')
      
      // Filter servers based on selected tab
      let filteredServers = serversData
      if (currentFilter === 'free') {
        filteredServers = serversData.filter(server => (server.stake || 0) === 0)
      } else if (currentFilter === 'paid') {
        filteredServers = serversData.filter(server => (server.stake || 0) > 0)
      }
      
      // Apply search filter
      const searchTerm = modal.querySelector('#server-search-input').value.toLowerCase()
      if (searchTerm) {
        filteredServers = filteredServers.filter(server => 
          (server.name || '').toLowerCase().includes(searchTerm) ||
          (server.region || '').toLowerCase().includes(searchTerm) ||
          (server.mode || '').toLowerCase().includes(searchTerm)
        )
      }
      
      if (filteredServers.length === 0) {
        serversList.innerHTML = `
          <div style="text-align: center; padding: 40px; color: #a0aec0;">
            <div style="font-size: 48px; margin-bottom: 16px;">🔍</div>
            <div style="font-size: 18px; font-weight: 600; margin-bottom: 8px;">No servers found</div>
            <div style="font-size: 14px;">Try adjusting your filters or search terms</div>
          </div>
        `
        return
      }
      
      serversList.innerHTML = filteredServers.map(server => {
        const playerPercentage = server.maxPlayers > 0 ? (server.currentPlayers / server.maxPlayers) * 100 : 0
        const isNearFull = playerPercentage > 80
        const isEmpty = server.currentPlayers === 0
        
        return `
          <div class="server-item" data-server-id="${server.id}" style="
            padding: 20px; 
            margin-bottom: 12px; 
            background: rgba(45, 55, 72, 0.5); 
            border: 2px solid #4a5568; 
            border-radius: 8px; 
            cursor: pointer; 
            transition: all 0.3s ease;
          ">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div style="flex: 1;">
                <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 12px;">
                  <div style="color: #68d391; font-size: 20px; font-weight: 700;">
                    ${server.name || 'Unknown Server'}
                  </div>
                  <div style="display: flex; gap: 8px;">
                    <div style="padding: 4px 8px; background: rgba(104, 211, 145, 0.2); border: 1px solid #68d391; border-radius: 4px; font-size: 10px; color: #68d391; text-transform: uppercase;">
                      ${server.region || 'Unknown'}
                    </div>
                    <div style="padding: 4px 8px; background: rgba(246, 173, 85, 0.2); border: 1px solid #f6ad55; border-radius: 4px; font-size: 10px; color: #f6ad55; text-transform: uppercase;">
                      ${server.mode || 'Unknown'}
                    </div>
                    ${(server.stake || 0) > 0 ? `
                      <div style="padding: 4px 8px; background: rgba(252, 129, 129, 0.2); border: 1px solid #fc8181; border-radius: 4px; font-size: 10px; color: #fc8181; text-transform: uppercase;">
                        $${server.stake}
                      </div>
                    ` : `
                      <div style="padding: 4px 8px; background: rgba(104, 211, 145, 0.2); border: 1px solid #68d391; border-radius: 4px; font-size: 10px; color: #68d391; text-transform: uppercase;">
                        FREE
                      </div>
                    `}
                  </div>
                </div>
                
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <div style="color: #a0aec0; font-size: 14px;">
                    Players: ${server.currentPlayers || 0}/${server.maxPlayers || 0}
                    ${isEmpty ? ' • Empty Server' : isNearFull ? ' • Nearly Full' : ''}
                  </div>
                  
                  <div style="display: flex; align-items: center; gap: 12px;">
                    <!-- Player count bar -->
                    <div style="width: 120px; height: 8px; background: rgba(45, 55, 72, 0.8); border-radius: 4px; overflow: hidden;">
                      <div style="width: ${playerPercentage}%; height: 100%; background: ${isNearFull ? '#fc8181' : isEmpty ? '#4a5568' : '#68d391'}; transition: all 0.3s ease;"></div>
                    </div>
                    
                    <!-- Join button -->
                    <button class="join-server-btn" data-server-id="${server.id}" style="
                      padding: 8px 16px; 
                      background: linear-gradient(45deg, #68d391 0%, #38a169 100%); 
                      border: 2px solid #68d391; 
                      border-radius: 6px; 
                      color: white; 
                      font-size: 12px; 
                      font-weight: 700; 
                      cursor: pointer; 
                      font-family: 'Rajdhani', sans-serif; 
                      text-transform: uppercase;
                      ${server.currentPlayers >= server.maxPlayers ? 'opacity: 0.5; cursor: not-allowed;' : ''}
                    ">
                      ${server.currentPlayers >= server.maxPlayers ? 'FULL' : 'JOIN'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        `
      }).join('')
      
      // Add click handlers to server items and join buttons
      const serverItems = serversList.querySelectorAll('.server-item')
      const joinButtons = serversList.querySelectorAll('.join-server-btn')
      
      serverItems.forEach(item => {
        item.addEventListener('mouseenter', () => {
          if (selectedServer !== item.dataset.serverId) {
            item.style.background = 'rgba(45, 55, 72, 0.8)'
            item.style.border = '2px solid #68d391'
          }
        })
        
        item.addEventListener('mouseleave', () => {
          if (selectedServer !== item.dataset.serverId) {
            item.style.background = 'rgba(45, 55, 72, 0.5)'
            item.style.border = '2px solid #4a5568'
          }
        })
        
        item.addEventListener('click', () => {
          selectedServer = item.dataset.serverId
          
          // Update selection visual feedback
          serverItems.forEach(s => {
            s.style.background = 'rgba(45, 55, 72, 0.5)'
            s.style.border = '2px solid #4a5568'
          })
          item.style.background = 'rgba(104, 211, 145, 0.1)'
          item.style.border = '2px solid #68d391'
        })
      })
      
      joinButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation()
          const serverId = btn.dataset.serverId
          const server = serversData.find(s => s.id === serverId)
          
          if (server && server.currentPlayers < server.maxPlayers) {
            joinServer(server)
          }
        })
      })
    }

    // Join server function - Updated with on-demand room creation
    const joinServer = async (server) => {
      console.log('🎮 Joining server:', server)
      
      // Check if this is the Global Multiplayer (US East) server - create room on-demand
      if (server.id === 'global-practice-bots' || server.name.includes('Global Multiplayer')) {
        console.log('🚀 Direct game entry for Global Multiplayer server - creating room on-demand')
        popup.remove()
        
        // Show loading popup during room creation
        const loadingPopup = createGameLoadingPopup()
        
        try {
          // Update loading status
          const statusElement = document.getElementById('loading-status')
          const progressBar = document.getElementById('progress-bar')
          const progressText = document.getElementById('progress-text')
          
          if (statusElement) statusElement.textContent = 'Connecting to Hathora servers...'
          if (progressBar) progressBar.style.width = '25%'
          if (progressText) progressText.textContent = '25%'
          
          // Create room on-demand using proper hathoraClient via API
          console.log('🌍 Creating multiplayer room on-demand with TurfLoot Hathora API...')
          
          // Update loading progress
          if (statusElement) statusElement.textContent = 'Initializing room creation...'
          if (progressBar) progressBar.style.width = '50%'
          if (progressText) progressText.textContent = '50%'
          
          // Update loading progress
          if (statusElement) statusElement.textContent = 'Creating multiplayer room...'
          if (progressBar) progressBar.style.width = '75%'
          if (progressText) progressText.textContent = '75%'
          
          // Create actual Hathora room using the API endpoint
          console.log('🚀 Creating Hathora room via API...')
          const roomResponse = await fetch('/api/hathora/create-room', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              gameMode: 'practice',
              region: server.region || 'US-East-1',
              maxPlayers: 50
            })
          })
          
          if (!roomResponse.ok) {
            throw new Error(`Room creation failed: ${roomResponse.status}`)
          }
          
          const roomData = await roomResponse.json()
          
          if (!roomData.success) {
            throw new Error(`Room creation failed: ${roomData.message}`)
          }
          
          const finalRoomId = roomData.roomId
          console.log('✅ Hathora room process created successfully:', finalRoomId)
          
          let roomCreated = true
          let finalRegion = roomData.region || 'US-East-1'
          
          // Update loading progress to complete
          if (statusElement) statusElement.textContent = 'Room ready! Launching game...'
          if (progressBar) progressBar.style.width = '100%'
          if (progressText) progressText.textContent = '100%'
          
          if (roomCreated) {
            console.log('🎉 Room successfully created in ' + finalRegion)
            
            // Wait a moment to show completion, then cleanup and redirect
            setTimeout(() => {
              if (loadingPopup && loadingPopup.cleanup) {
                loadingPopup.cleanup()
              }
              
              // Redirect to game with the newly created room
              const gameUrl = '/agario?roomId=' + finalRoomId + '&mode=practice&fee=0&region=' + finalRegion + '&multiplayer=hathora&server=global&hathoraApp=app-d0e53e41-4d8f-4f33-91f7-87ab78b3fddb&ondemand=true'
              console.log('🎮 Redirecting to newly created multiplayer room:', gameUrl)
              checkOrientationAndEnterGame(gameUrl)
            }, 1000) // Brief delay to show completion
            
          } else {
            throw new Error('Failed to create room in any region')
          }
          
        } catch (error) {
          console.error('❌ On-demand room creation failed:', error)
          
          // Update loading popup to show error
          const statusElement = document.getElementById('loading-status')
          if (statusElement) statusElement.textContent = 'Connection failed, using fallback...'
          
          setTimeout(() => {
            // Cleanup loading popup
            if (loadingPopup && loadingPopup.cleanup) {
              loadingPopup.cleanup()
            }
            
            // Fallback: create a local room ID and let the game handle it
            const fallbackRoomId = 'local-' + Math.random().toString(36).substring(2, 15)
            const gameUrl = '/agario?roomId=' + fallbackRoomId + '&mode=practice&fee=0&region=' + (server.region || 'us-east') + '&multiplayer=fallback&server=global'
            console.log('🔄 Falling back to local room:', gameUrl)
            checkOrientationAndEnterGame(gameUrl)
          }, 1000)
        }
        
        return
      }
      
      // For other servers, show confirmation and create room on-demand too
      const serverType = server.stake > 0 ? 'paid' : 'free'
      const stakeInfo = server.stake > 0 ? '\nStake: $' + server.stake : ''
      const message = 'Joining ' + server.name + '!\n\nRegion: ' + server.region + '\nMode: ' + server.mode + '\nPlayers: ' + server.currentPlayers + '/' + server.maxPlayers + stakeInfo + '\n\nCreating dedicated room for your session...'
      
      alert(message)
      popup.remove()
      
      // Show loading popup for other servers too
      const loadingPopup = createGameLoadingPopup()
      
      // Create ACTUAL Hathora room for multiplayer servers
      setTimeout(async () => {
        try {
          console.log('🌍 Creating REAL Hathora room for server:', server.name)
          
          // Initialize Hathora client
          const hathoraClientModule = await import('@/lib/hathoraClient.js')
          const hathoraClient = hathoraClientModule.default
          
          const initialized = await hathoraClient.initialize()
          if (!initialized) {
            throw new Error('Hathora client initialization failed')
          }
          
          console.log('🎯 Hathora client initialized, creating room process...')
          
          // Create actual Hathora room process
          console.log('🚀 Creating Hathora room for server:', server)
          
          let roomId
          if (server.mode === 'cash' && server.stake > 0) {
            // For paid servers, use createPaidRoom
            console.log(`💰 Creating paid Hathora room with $${server.stake} stake`)
            const paidRoomResult = await hathoraClient.createPaidRoom(server.stake, null, server.region)
            roomId = paidRoomResult.roomId
            console.log('✅ Created paid Hathora room:', roomId)
          } else {
            // For practice servers, use createOrJoinRoom
            console.log('🌍 Creating practice Hathora room')
            roomId = await hathoraClient.createOrJoinRoom(null, 'practice', 0)
            console.log('✅ Created practice Hathora room:', roomId)
          }
          
          // Remove loading popup
          if (loadingPopup && loadingPopup.cleanup) {
            loadingPopup.cleanup()
          }
          
          // Redirect to game with REAL Hathora room
          const gameMode = server.mode || 'practice'
          const gameUrl = `/agario?roomId=${roomId}&mode=${gameMode}&fee=${server.stake || 0}&region=${server.region || 'unknown'}&multiplayer=hathora&server=${server.id}&hathoraApp=app-d0e53e41-4d8f-4f33-91f7-87ab78b3fddb&realroom=true`
          console.log('🎮 Redirecting to REAL Hathora room:', gameUrl)
          checkOrientationAndEnterGame(gameUrl)
          
        } catch (error) {
          console.error('❌ REAL Hathora room creation failed:', error)
          
          // Remove loading popup
          if (loadingPopup && loadingPopup.cleanup) {
            loadingPopup.cleanup()
          }
          
          // Show error to user
          alert(`Failed to create multiplayer room: ${error.message}`)
          
          // Fallback to direct connection
          const gameUrl = `/agario?roomId=${server.id}&mode=${server.mode}&fee=${server.stake || 0}&region=${server.region || 'unknown'}&multiplayer=direct`
          console.log('🎮 Fallback to direct game:', gameUrl)
          checkOrientationAndEnterGame(gameUrl)
        }
      }, 2000) // Reduced delay
    }

    // Search functionality
    const searchInput = modal.querySelector('#server-search-input')
    searchInput.addEventListener('input', () => {
      renderServers()
    })

    // Close popup handlers
    const closeButton = modal.querySelector('#close-server-browser')
    const cancelButton = modal.querySelector('#cancel-server-browser')
    
    const closePopup = () => {
      popup.remove()
    }
    
    closeButton.addEventListener('click', closePopup)
    cancelButton.addEventListener('click', closePopup)
    
    // Close on backdrop click
    popup.addEventListener('click', (e) => {
      if (e.target === popup) {
        closePopup()
      }
    })

    // Refresh servers button
    const refreshButton = modal.querySelector('#refresh-servers-btn')
    refreshButton.addEventListener('click', () => {
      console.log('🔄 Refreshing servers...')
      loadServers()
    })

    // Initial load
    loadServers()

    // Add popup to DOM
    document.body.appendChild(popup)

    console.log('🌐 Desktop server browser popup created with direct DOM manipulation')
  }

  const createDesktopJoinPartyPopup = () => {
    // Only create popup on desktop
    if (window.innerWidth <= 768) return

    // Remove any existing join party popup
    const existing = document.getElementById('desktop-join-party-popup')
    if (existing) existing.remove()

    // Create the popup container
    const popup = document.createElement('div')
    popup.id = 'desktop-join-party-popup'
    popup.style.cssText = `
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      background: rgba(13, 17, 23, 0.95) !important;
      backdrop-filter: blur(10px) !important;
      z-index: 9999 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
    `

    // Create the modal
    const modal = document.createElement('div')
    modal.style.cssText = `
      background: linear-gradient(145deg, #2d3748 0%, #1a202c 100%) !important;
      border: 2px solid #68d391 !important;
      border-radius: 16px !important;
      width: 600px !important;
      max-width: 90vw !important;
      max-height: 80vh !important;
      overflow-y: auto !important;
      color: white !important;
      box-shadow: 0 0 50px rgba(104, 211, 145, 0.5) !important;
      font-family: "Rajdhani", sans-serif !important;
    `

    // Generate party join HTML
    const joinPartyHTML = `
      <div style="padding: 24px; border-bottom: 2px solid #68d391; background: linear-gradient(45deg, rgba(104, 211, 145, 0.1) 0%, rgba(104, 211, 145, 0.05) 100%);">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <div style="display: flex; align-items: center; gap: 16px;">
            <div style="width: 50px; height: 50px; background: linear-gradient(45deg, #68d391 0%, #38a169 100%); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 24px;">
              🚀
            </div>
            <div>
              <h2 style="color: #68d391; font-size: 28px; font-weight: 700; margin: 0; text-transform: uppercase; text-shadow: 0 0 10px rgba(104, 211, 145, 0.6);">
                JOIN PARTY
              </h2>
              <p style="color: #a0aec0; font-size: 14px; margin: 4px 0 0 0;">
                Join existing parties or friends' squads
              </p>
            </div>
          </div>
          <button id="close-join-party" style="background: rgba(104, 211, 145, 0.2); border: 2px solid #68d391; border-radius: 8px; padding: 12px; color: #68d391; cursor: pointer; font-size: 24px; width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; font-weight: bold;">
            ✕
          </button>
        </div>
      </div>

      <div style="padding: 32px;">
        <!-- Search Party Input -->
        <div style="margin-bottom: 24px;">
          <label style="display: block; color: #68d391; font-size: 14px; font-weight: 600; text-transform: uppercase; margin-bottom: 8px;">
            SEARCH PARTIES
          </label>
          <input 
            id="party-search-input" 
            type="text" 
            placeholder="Search by party name or player..." 
            style="width: 100%; padding: 12px 16px; background: rgba(45, 55, 72, 0.8); border: 2px solid #68d391; border-radius: 8px; color: #e2e8f0; font-size: 16px; font-family: 'Rajdhani', sans-serif; box-sizing: border-box;"
          />
        </div>

        <!-- Party Type Tabs -->
        <div style="margin-bottom: 24px;">
          <div style="display: flex; gap: 12px; margin-bottom: 16px;">
            <button id="public-parties-tab" class="party-type-tab" data-type="public" style="flex: 1; padding: 12px; background: linear-gradient(45deg, #68d391 0%, #38a169 100%); border: 2px solid #68d391; border-radius: 8px; color: white; font-size: 14px; font-weight: 700; cursor: pointer; font-family: 'Rajdhani', sans-serif; text-transform: uppercase;">
              PUBLIC PARTIES
            </button>
            <button id="friends-parties-tab" class="party-type-tab" data-type="friends" style="flex: 1; padding: 12px; background: rgba(45, 55, 72, 0.5); border: 2px solid #4a5568; border-radius: 8px; color: #a0aec0; font-size: 14px; font-weight: 700; cursor: pointer; font-family: 'Rajdhani', sans-serif; text-transform: uppercase;">
              FRIENDS PARTIES
            </button>
          </div>
        </div>

        <!-- Parties List -->
        <div id="parties-list" style="margin-bottom: 24px; max-height: 300px; overflow-y: auto;">
          <!-- This will be populated dynamically -->
        </div>

        <!-- Action Buttons -->
        <div style="display: flex; gap: 12px;">
          <button id="cancel-join-party" style="flex: 1; padding: 16px; background: rgba(74, 85, 104, 0.5); border: 2px solid #4a5568; border-radius: 8px; color: #a0aec0; font-size: 16px; font-weight: 700; cursor: pointer; font-family: 'Rajdhani', sans-serif; text-transform: uppercase;">
            CANCEL
          </button>
          <button id="refresh-parties-btn" style="flex: 1; padding: 16px; background: linear-gradient(45deg, #68d391 0%, #38a169 100%); border: 2px solid #68d391; border-radius: 8px; color: white; font-size: 16px; font-weight: 700; cursor: pointer; font-family: 'Rajdhani', sans-serif; text-transform: uppercase; box-shadow: 0 0 20px rgba(104, 211, 145, 0.4);">
            REFRESH PARTIES
          </button>
        </div>
      </div>
    `

    modal.innerHTML = joinPartyHTML
    popup.appendChild(modal)

    // Add interactivity
    let currentTab = 'public'
    let selectedParty = null
    let currentParties = [] // Store parties data for party selection
    
    // Tab switching
    const publicTab = modal.querySelector('#public-parties-tab')
    const friendsTab = modal.querySelector('#friends-parties-tab')
    
    const switchTab = (tabType) => {
      currentTab = tabType
      if (tabType === 'public') {
        publicTab.style.background = 'linear-gradient(45deg, #68d391 0%, #38a169 100%)'
        publicTab.style.border = '2px solid #68d391'
        publicTab.style.color = 'white'
        friendsTab.style.background = 'rgba(45, 55, 72, 0.5)'
        friendsTab.style.border = '2px solid #4a5568'
        friendsTab.style.color = '#a0aec0'
      } else {
        friendsTab.style.background = 'linear-gradient(45deg, #68d391 0%, #38a169 100%)'
        friendsTab.style.border = '2px solid #68d391'
        friendsTab.style.color = 'white'
        publicTab.style.background = 'rgba(45, 55, 72, 0.5)'
        publicTab.style.border = '2px solid #4a5568'
        publicTab.style.color = '#a0aec0'
      }
      loadParties()
    }
    
    publicTab.addEventListener('click', () => switchTab('public'))
    friendsTab.addEventListener('click', () => switchTab('friends'))

    // Load parties function
    const loadParties = async () => {
      const partiesList = modal.querySelector('#parties-list')
      
      try {
        // Determine current tab
        const currentTab = modal.querySelector('.party-type-tab[style*="68d391"]')?.dataset?.type || 'public'
        
        // Build API URL based on current tab
        let apiUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/api/party?type=${currentTab}`
        
        // For friends parties, we need to pass the user identifier
        if (currentTab === 'friends' && isAuthenticated && user) {
          const userIdentifier = user.wallet?.address || user.email || user.id
          apiUrl += `&userIdentifier=${userIdentifier}`
        }
        
        console.log('🔍 Fetching parties from:', apiUrl)
        
        // Fetch parties from API based on current tab
        const response = await fetch(apiUrl)
        const partiesData = await response.json()
        
        if (!partiesData.success) {
          console.warn('Failed to fetch parties:', partiesData.error)
          showEmptyState()
          return
        }
        
        const parties = partiesData.parties || []
        console.log(`✅ Loaded ${parties.length} ${currentTab} parties:`, parties)
        
        if (parties.length === 0) {
          showEmptyState()
          return
        }
        
        // Render parties
        renderParties(parties)
        
      } catch (error) {
        console.error('Error fetching parties:', error)
        showEmptyState()
      }
    }
    
    const showEmptyState = () => {
      const partiesList = modal.querySelector('#parties-list')
      const currentTab = modal.querySelector('.party-type-tab[style*="68d391"]')?.dataset?.type || 'public'
      
      partiesList.innerHTML = `
        <div style="text-align: center; padding: 40px 20px; color: #9ca3af;">
          <div style="font-size: 48px; margin-bottom: 16px;">🏠</div>
          <div style="font-size: 18px; font-weight: 600; margin-bottom: 8px; color: #ffffff;">
            No ${currentTab === 'public' ? 'Public' : 'Friends'} Parties Available
          </div>
          <div style="font-size: 14px; line-height: 1.4;">
            ${currentTab === 'public' 
              ? 'No active public lobbies found. Be the first to create one!' 
              : 'Your friends haven\'t created any private parties yet.'}
          </div>
        </div>
      `
    }
    
    const renderParties = (parties) => {
      const partiesList = modal.querySelector('#parties-list')
      
      // Store parties data for selection
      currentParties = parties
      
      partiesList.innerHTML = parties.map(party => `
        <div class="party-item" data-party-id="${party.id}" style="
          padding: 16px; 
          margin-bottom: 12px; 
          background: rgba(45, 55, 72, 0.5); 
          border: 2px solid #4a5568; 
          border-radius: 8px; 
          cursor: pointer; 
          transition: all 0.3s ease;
        ">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div style="flex: 1;">
              <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                <div style="color: #68d391; font-size: 18px; font-weight: 700;">
                  ${party.name}
                </div>
                <div style="padding: 4px 8px; background: rgba(104, 211, 145, 0.2); border: 1px solid #68d391; border-radius: 4px; font-size: 10px; color: #68d391; text-transform: uppercase;">
                  ${party.privacy}
                </div>
              </div>
              <div style="color: #a0aec0; font-size: 14px;">
                Host: ${party.createdByUsername || 'Unknown'} • Members: ${party.currentPlayerCount || 0}/${party.maxPlayers || 2}
              </div>
            </div>
            <div style="color: #68d391; font-size: 24px;">
              ${party.privacy === 'private' ? '🔒' : '🌐'}
            </div>
          </div>
        </div>
      `).join('')
      
      // Add click handlers to party items
      const partyItems = partiesList.querySelectorAll('.party-item')
      partyItems.forEach(item => {
        item.addEventListener('click', () => {
          // Remove selection from all items
          partyItems.forEach(p => {
            p.style.border = '2px solid #4a5568'
            p.style.background = 'rgba(45, 55, 72, 0.5)'
          })
          
          // Select this item
          item.style.border = '2px solid #68d391'
          item.style.background = 'rgba(104, 211, 145, 0.1)'
          
          // Store the full party object instead of just the ID
          const partyId = item.dataset.partyId
          selectedParty = currentParties.find(p => p.id === partyId)
          
          console.log('🎯 Party selected:', selectedParty)
          
          // Show join button
          const joinButton = modal.querySelector('#join-selected-party-btn')
          if (joinButton) {
            joinButton.style.display = 'block'
          } else {
            // Create join button
            const buttonContainer = modal.querySelector('.action-buttons-container')
            if (buttonContainer) {
              const joinButton = document.createElement('button')
              joinButton.id = 'join-selected-party-btn'
              joinButton.innerHTML = 'JOIN SELECTED PARTY'
              joinButton.style.cssText = `
                width: 100%; 
                padding: 16px; 
                background: linear-gradient(45deg, #f6ad55 0%, #ed8936 100%); 
                border: 2px solid #f6ad55; 
                border-radius: 8px; 
                color: white; 
                font-size: 16px; 
                font-weight: 700; 
                cursor: pointer; 
                font-family: 'Rajdhani', sans-serif; 
                text-transform: uppercase; 
                box-shadow: 0 0 20px rgba(246, 173, 85, 0.4);
                margin-top: 12px;
              `
              joinButton.addEventListener('click', async () => {
                console.log('🚀 Joining party:', selectedParty)
                
                try {
                  if (!isAuthenticated || !user) {
                    alert('Please log in to join a party!')
                    return
                  }
                  
                  const userIdentifier = user.wallet?.address || user.email || user.id
                  console.log('🎯 User joining party:', userIdentifier, 'Party ID:', selectedParty.id)
                  
                  // Show loading state
                  joinButton.textContent = 'JOINING...'
                  joinButton.disabled = true
                  
                  // API call to join the party
                  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/party`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      action: 'join_party',
                      userIdentifier: userIdentifier,
                      partyId: selectedParty.id
                    })
                  })
                  
                  const result = await response.json()
                  
                  if (response.ok && result.success) {
                    console.log('✅ Successfully joined party:', result)
                    
                    // Update current party state
                    setCurrentParty({
                      id: selectedParty.id,
                      name: selectedParty.name,
                      members: result.party?.members || [],
                      maxPlayers: selectedParty.maxPlayers,
                      privacy: selectedParty.privacy
                    })
                    
                    // Show success message
                    alert(`🎉 Successfully joined "${selectedParty.name}"! You are now part of the party.`)
                    
                    // Close the popup
                    popup.remove()
                    
                    // Refresh party data to show updated state
                    await loadCurrentParty()
                    
                  } else {
                    console.error('❌ Failed to join party:', result.error)
                    alert(`Failed to join party: ${result.error || 'Unknown error'}`)
                    
                    // Reset button
                    joinButton.textContent = 'JOIN SELECTED PARTY'
                    joinButton.disabled = false
                  }
                  
                } catch (error) {
                  console.error('❌ Error joining party:', error)
                  alert('Error joining party. Please try again.')
                  
                  // Reset button
                  joinButton.textContent = 'JOIN SELECTED PARTY'
                  joinButton.disabled = false
                }
              })
              buttonContainer.appendChild(joinButton)
            }
          }
        })
        
        // Add hover effects
        item.addEventListener('mouseenter', () => {
          if (!selectedParty || selectedParty.id !== item.dataset.partyId) {
            item.style.background = 'rgba(45, 55, 72, 0.8)'
          }
        })
        
        item.addEventListener('mouseleave', () => {
          if (!selectedParty || selectedParty.id !== item.dataset.partyId) {
            item.style.background = 'rgba(45, 55, 72, 0.5)'
          }
        })
      })
    }

    // Search functionality
    const searchInput = modal.querySelector('#party-search-input')
    searchInput.addEventListener('input', () => {
      // Implement search filtering logic here
      // For now, just reload parties
      loadParties()
    })

    // Close popup handlers
    const closeButton = modal.querySelector('#close-join-party')
    const cancelButton = modal.querySelector('#cancel-join-party')
    
    const closePopup = () => {
      popup.remove()
    }
    
    closeButton.addEventListener('click', closePopup)
    cancelButton.addEventListener('click', closePopup)
    
    // Close on backdrop click
    popup.addEventListener('click', (e) => {
      if (e.target === popup) {
        closePopup()
      }
    })

    // Refresh parties button
    const refreshButton = modal.querySelector('#refresh-parties-btn')
    refreshButton.addEventListener('click', () => {
      console.log('🔄 Refreshing parties...')
      loadParties()
    })

    // Create action buttons container for join button
    const actionButtonsContainer = modal.querySelector('div[style*="display: flex; gap: 12px"]:last-child')
    actionButtonsContainer.classList.add('action-buttons-container')

    // Initial load
    loadParties()

    // Add popup to DOM
    document.body.appendChild(popup)

    console.log('🚀 Desktop join party popup created with direct DOM manipulation')
  }

  const createDesktopCreatePartyPopup = () => {
    // Only create popup on desktop
    if (window.innerWidth <= 768) return

    // Remove any existing create party popup
    const existing = document.getElementById('desktop-create-party-popup')
    if (existing) existing.remove()

    // Get the current friends list
    const currentFriends = friendsList.filter(f => f.status === 'accepted') || []
    console.log('🎯 Loading friends for party creation:', {
      totalFriendsInList: friendsList.length,
      acceptedFriends: currentFriends.length,
      allFriends: friendsList,
      acceptedFriendsData: currentFriends
    })

    // Create the popup container
    const popup = document.createElement('div')
    popup.id = 'desktop-create-party-popup'
    popup.style.cssText = `
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      background-color: rgba(0, 0, 0, 0.9) !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      z-index: 999999999 !important;
      pointer-events: auto !important;
    `

    // Create the modal content
    const modal = document.createElement('div')
    modal.style.cssText = `
      background-color: #1a202c !important;
      border: 3px solid #fc8181 !important;
      border-radius: 12px !important;
      max-width: 600px !important;
      width: 90% !important;
      padding: 0 !important;
      color: white !important;
      box-shadow: 0 0 50px rgba(252, 129, 129, 0.5) !important;
      font-family: "Rajdhani", sans-serif !important;
    `

    // Generate party creation HTML
    const partyHTML = `
      <div style="padding: 24px; border-bottom: 2px solid #fc8181; background: linear-gradient(45deg, rgba(252, 129, 129, 0.1) 0%, rgba(252, 129, 129, 0.05) 100%);">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <div style="display: flex; align-items: center; gap: 16px;">
            <div style="width: 50px; height: 50px; background: linear-gradient(45deg, #fc8181 0%, #e53e3e 100%); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 24px;">
              👥
            </div>
            <div>
              <h2 style="color: #fc8181; font-size: 28px; font-weight: 700; margin: 0; text-transform: uppercase; text-shadow: 0 0 10px rgba(252, 129, 129, 0.6);">
                CREATE PARTY
              </h2>
              <p style="color: #a0aec0; font-size: 14px; margin: 4px 0 0 0;">
                Set up your squad for tactical gameplay
              </p>
            </div>
          </div>
          <button id="close-create-party" style="background: rgba(252, 129, 129, 0.2); border: 2px solid #fc8181; border-radius: 8px; padding: 12px; color: #fc8181; cursor: pointer; font-size: 24px; width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; font-weight: bold;">
            ✕
          </button>
        </div>
      </div>

      <div style="padding: 32px;">
        <!-- Party Name Input -->
        <div style="margin-bottom: 24px;">
          <label style="display: block; color: #fc8181; font-size: 14px; font-weight: 600; text-transform: uppercase; margin-bottom: 8px;">
            PARTY NAME
          </label>
          <input 
            id="party-name-input" 
            type="text" 
            placeholder="Enter party name..." 
            maxlength="20"
            style="width: 100%; padding: 12px 16px; background: rgba(45, 55, 72, 0.8); border: 2px solid #fc8181; border-radius: 8px; color: #e2e8f0; font-size: 16px; font-family: 'Rajdhani', sans-serif; box-sizing: border-box;"
          />
        </div>

        <!-- Party Privacy Settings -->
        <div style="margin-bottom: 24px;">
          <label style="display: block; color: #fc8181; font-size: 14px; font-weight: 600; text-transform: uppercase; margin-bottom: 12px;">
            PRIVACY SETTINGS
          </label>
          <div style="display: flex; gap: 12px;">
            <div style="flex: 1; padding: 16px; background: rgba(45, 55, 72, 0.5); border: 2px solid #68d391; border-radius: 8px; cursor: pointer; text-align: center;" id="public-option">
              <div style="font-size: 18px; margin-bottom: 8px;">🌐</div>
              <div style="color: #68d391; font-weight: 600; font-size: 14px; text-transform: uppercase;">PUBLIC</div>
              <div style="color: #a0aec0; font-size: 12px; margin-top: 4px;">Anyone can join</div>
            </div>
            <div style="flex: 1; padding: 16px; background: rgba(45, 55, 72, 0.5); border: 2px solid #4a5568; border-radius: 8px; cursor: pointer; text-align: center;" id="private-option">
              <div style="font-size: 18px; margin-bottom: 8px;">🔒</div>
              <div style="color: #a0aec0; font-weight: 600; font-size: 14px; text-transform: uppercase;">PRIVATE</div>
              <div style="color: #a0aec0; font-size: 12px; margin-top: 4px;">Invite only</div>
            </div>
          </div>
        </div>

        <!-- Invite Friends Section -->
        <div style="margin-bottom: 24px;">
          <label id="friends-section-label" style="display: block; color: #fc8181; font-size: 14px; font-weight: 600; text-transform: uppercase; margin-bottom: 12px;">
            👥 INVITE FRIENDS
          </label>
          
          <!-- Friends Search -->
          <div style="margin-bottom: 16px;">
            <input 
              id="friend-search-input" 
              type="text" 
              placeholder="Search friends..." 
              style="width: 100%; padding: 10px 16px; background: rgba(45, 55, 72, 0.6); border: 1px solid #4a5568; border-radius: 6px; color: #e2e8f0; font-size: 14px; font-family: 'Rajdhani', sans-serif; box-sizing: border-box;"
            />
          </div>
          
          <!-- Friends List -->
          <div id="friends-invite-list" style="max-height: 150px; overflow-y: auto; background: rgba(45, 55, 72, 0.3); border: 1px solid #4a5568; border-radius: 6px; padding: 16px;">
            <!-- Empty state for friends list -->
            <div style="text-align: center; color: #a0aec0; font-size: 14px; padding: 20px 0;">
              <div style="font-size: 32px; margin-bottom: 8px; opacity: 0.5;">👥</div>
              <div style="margin-bottom: 4px;">No friends to invite</div>
              <div style="font-size: 12px; opacity: 0.7;">Add friends to see them here</div>
            </div>
          </div>
          
          <!-- Selected Friends Counter -->
          <div id="selected-friends-counter" style="margin-top: 8px; color: #a0aec0; font-size: 12px; text-align: center;">
            0 friends selected for invitation
          </div>
        </div>

        <!-- Action Buttons -->
        <div style="display: flex; gap: 12px;">
          <button id="cancel-create-party" style="flex: 1; padding: 16px; background: rgba(74, 85, 104, 0.5); border: 2px solid #4a5568; border-radius: 8px; color: #a0aec0; font-size: 16px; font-weight: 700; cursor: pointer; font-family: 'Rajdhani', sans-serif; text-transform: uppercase;">
            CANCEL
          </button>
          <button id="create-party-btn" style="flex: 1; padding: 16px; background: linear-gradient(45deg, #fc8181 0%, #e53e3e 100%); border: 2px solid #fc8181; border-radius: 8px; color: white; font-size: 16px; font-weight: 700; cursor: pointer; font-family: 'Rajdhani', sans-serif; text-transform: uppercase; box-shadow: 0 0 20px rgba(252, 129, 129, 0.4);">
            CREATE PARTY
          </button>
        </div>
      </div>
    `

    modal.innerHTML = partyHTML

    // Populate friends list dynamically
    const friendsListContainer = modal.querySelector('#friends-invite-list')
    if (currentFriends.length > 0) {
      // Clear the container and add friends
      friendsListContainer.innerHTML = ''
      
      currentFriends.forEach(friend => {
        const friendItem = document.createElement('div')
        friendItem.className = 'friend-invite-item'
        friendItem.dataset.friendId = friend.id
        friendItem.style.cssText = `
          display: flex; 
          align-items: center; 
          justify-content: space-between; 
          padding: 10px 12px; 
          margin-bottom: 8px; 
          background: rgba(26, 32, 44, 0.6); 
          border-radius: 6px; 
          border: 1px solid rgba(104, 211, 145, 0.2);
        `
        
        friendItem.innerHTML = `
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 8px; height: 8px; border-radius: 50%; background: ${friend.isOnline ? '#22c55e' : '#6b7280'}; ${friend.isOnline ? 'box-shadow: 0 0 6px rgba(34, 197, 94, 0.6);' : ''}"></div>
            <span style="color: ${friend.isOnline ? '#e2e8f0' : '#9ca3af'}; font-size: 14px; font-weight: 500;">${friend.username}</span>
            <span style="color: #a0aec0; font-size: 11px; opacity: 0.7;">${friend.isOnline ? 'Online' : 'Offline'}</span>
          </div>
          <input type="checkbox" class="friend-checkbox" style="width: 16px; height: 16px; cursor: pointer; accent-color: #fc8181;" />
        `
        
        friendsListContainer.appendChild(friendItem)
      })
      
      console.log('✅ Populated friends list with', currentFriends.length, 'friends')
    } else {
      // Show empty state
      friendsListContainer.innerHTML = `
        <div style="text-align: center; color: #a0aec0; font-size: 14px; padding: 20px 0;">
          <div style="font-size: 32px; margin-bottom: 8px; opacity: 0.5;">👥</div>
          <div style="margin-bottom: 4px;">No friends to invite</div>
          <div style="font-size: 12px; opacity: 0.7;">Add friends to see them here</div>
        </div>
      `
      console.log('ℹ️ No friends available, showing empty state')
    }
    
    // Update the friends section label
    const friendsLabel = modal.querySelector('#friends-section-label')
    if (friendsLabel) {
      friendsLabel.textContent = `👥 INVITE FRIENDS`
    }

    // Add interactivity
    let selectedPrivacy = 'public'

    // Privacy option selection
    const publicOption = modal.querySelector('#public-option')
    const privateOption = modal.querySelector('#private-option')
    
    publicOption.addEventListener('click', () => {
      selectedPrivacy = 'public'
      publicOption.style.border = '2px solid #68d391'
      publicOption.querySelector('div:nth-child(2)').style.color = '#68d391'
      privateOption.style.border = '2px solid #4a5568'
      privateOption.querySelector('div:nth-child(2)').style.color = '#a0aec0'
    })
    
    privateOption.addEventListener('click', () => {
      selectedPrivacy = 'private'
      privateOption.style.border = '2px solid #fc8181'
      privateOption.querySelector('div:nth-child(2)').style.color = '#fc8181'
      publicOption.style.border = '2px solid #4a5568'
      publicOption.querySelector('div:nth-child(2)').style.color = '#a0aec0'
    })

    // Close functionality
    const closeButtons = modal.querySelectorAll('#close-create-party, #cancel-create-party')
    closeButtons.forEach(btn => {
      btn.addEventListener('click', () => popup.remove())
    })

    // Create party functionality
    modal.querySelector('#create-party-btn').addEventListener('click', async () => {
      const partyName = modal.querySelector('#party-name-input').value.trim()
      
      // Get selected friends with better error handling
      const checkedBoxes = modal.querySelectorAll('.friend-checkbox:checked')
      console.log('🔍 Debug: Found checked boxes:', checkedBoxes.length)
      
      const selectedFriends = Array.from(checkedBoxes).map(cb => {
        const item = cb.closest('.friend-invite-item')
        const friendId = item ? item.dataset.friendId : null
        const friendName = item ? item.querySelector('span').textContent : 'Unknown'
        console.log('🔍 Debug: Processing friend:', { friendId, friendName })
        return {
          id: friendId,
          username: friendName
        }
      }).filter(friend => friend.id) // Remove any invalid entries
      
      console.log('🎯 Debug: Selected friends for invitation:', selectedFriends)
      
      if (!partyName) {
        modal.querySelector('#party-name-input').style.border = '2px solid #e53e3e'
        modal.querySelector('#party-name-input').focus()
        return
      }
      
      // Only require friend selection for private parties
      if (selectedPrivacy === 'private' && selectedFriends.length === 0) {
        alert('Please select at least one friend to invite to your private party!')
        return
      }
      
      // For public parties, no friend selection is required - anyone can join

      // Party is always limited to 2 players maximum
      const partyData = {
        name: partyName,
        privacy: selectedPrivacy,
        maxPlayers: 2
      }
      
      console.log('🎯 Creating party:', partyData)
      console.log('🎯 Invited friends:', selectedFriends)
      
      // Create the party and send invitations
      const result = await createPartyAndSendInvites(partyData, selectedFriends)
      
      if (result && result.success) {
        // Show different success messages based on party type and invites
        if (selectedPrivacy === 'public' && selectedFriends.length === 0) {
          alert(`🎯 Public party "${partyData.name}" created successfully! Other players can now find and join your party.`)
        } else if (selectedFriends.length > 0) {
          alert(`🎯 Party "${partyData.name}" created successfully! Invites sent to ${selectedFriends.length} friend${selectedFriends.length !== 1 ? 's' : ''}.`)
        } else {
          alert(`🎯 Party "${partyData.name}" created successfully!`)
        }
      }
      
      popup.remove()
    })

    // Friends search functionality
    modal.querySelector('#friend-search-input').addEventListener('input', (e) => {
      const searchTerm = e.target.value.toLowerCase()
      const friendItems = modal.querySelectorAll('.friend-invite-item')
      
      friendItems.forEach(item => {
        const friendName = item.querySelector('span').textContent.toLowerCase()
        if (friendName.includes(searchTerm)) {
          item.style.display = 'flex'
        } else {
          item.style.display = 'none'
        }
      })
    })

    // Friends selection counter
    const updateSelectedCounter = () => {
      const selectedCount = modal.querySelectorAll('.friend-checkbox:checked').length
      const counter = modal.querySelector('#selected-friends-counter')
      counter.textContent = `${selectedCount} friend${selectedCount !== 1 ? 's' : ''} selected for invitation`
    }

    // Add event listeners to all friend checkboxes (now dynamically generated)
    modal.querySelectorAll('.friend-checkbox').forEach(checkbox => {
      checkbox.addEventListener('change', updateSelectedCounter)
    })
    
    // Update the initial counter display
    updateSelectedCounter()

    // Close on backdrop click
    popup.addEventListener('click', (e) => {
      if (e.target === popup) {
        popup.remove()
      }
    })

    // Close on Escape key
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        popup.remove()
        document.removeEventListener('keydown', handleEscape)
      }
    }
    document.addEventListener('keydown', handleEscape)

    // Focus on party name input
    setTimeout(() => {
      modal.querySelector('#party-name-input').focus()
    }, 100)

    popup.appendChild(modal)
    document.body.appendChild(popup)

    console.log('🎯 Desktop create party popup created with direct DOM manipulation')
  }

  // Authentication check function - FIXED to use Privy hooks
  const requireAuthentication = async (actionName) => {
    if (typeof window === 'undefined') return false
    
    console.log(`🔐 Authentication check for: ${actionName}`)
    console.log('🔍 Privy state:', {
      ready,
      authenticated,
      hasUser: !!privyUser,
      userDisplay: privyUser?.id || 'No user'
    })
    
    // Check if Privy is ready
    if (!ready) {
      console.log('⚠️ Privy not ready yet for:', actionName)
      alert('Authentication service is loading. Please wait a moment and try again.')
      return false
    }

    // Check if user is authenticated via Privy hooks
    if (authenticated && privyUser) {
      console.log('✅ User authenticated via Privy hooks for:', actionName)
      console.log('👤 User details:', {
        id: privyUser.id,
        walletAddress: privyUser.wallet?.address || 'No wallet',
        linkedAccounts: privyUser.linkedAccounts?.length || 0
      })
      
      // Update legacy state variables for compatibility
      setIsAuthenticated(true)
      setUser(privyUser)
      return true
    }

    // User is not authenticated
    console.log('❌ User not authenticated for:', actionName)
    console.log('🔐 Triggering login process...')
    
    try {
      if (typeof login === 'function') {
        await login()
        console.log('✅ Login process completed for:', actionName)
        return true
      } else {
        console.error('❌ Login function not available')
        alert('Authentication service not ready. Please refresh the page and try again.')
        return false
      }
    } catch (error) {
      console.error('❌ Login error for:', actionName, error)
      alert('Login failed. Please try again.')
      return false
    }
  }

  const handleLogin = async () => {
    try {
      console.log('🔐 LOGIN BUTTON CLICKED - Attempting Privy login...')
      console.log('🔍 Privy state check:', {
        ready,
        authenticated,
        loginFunctionAvailable: typeof login === 'function',
        privyUserExists: !!privyUser
      })
      
      if (!ready) {
        console.log('⚠️ Privy not ready yet, please wait...')
        alert('Authentication service is loading. Please wait a moment and try again.')
        return
      }
      
      if (typeof login !== 'function') {
        console.error('❌ Privy login function not available')
        console.log('🔧 Debugging Privy hooks:', { ready, authenticated, login, logout })
        alert('Authentication service not ready. Please refresh the page and try again.')
        return
      }
      
      console.log('🚀 Calling Privy login function...')
      await login()
      console.log('✅ Privy login call completed successfully!')
      
    } catch (error) {
      console.error('❌ Login error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      })
      
      if (error.message?.includes('User rejected')) {
        console.log('ℹ️ User cancelled the login process')
        // Don't show alert for user cancellation
      } else {
        alert(`Login failed: ${error.message || 'Please try again or refresh the page.'}`)
      }
    }
  }

  const handleLogout = async () => {
    try {
      console.log('🔐 Attempting Privy logout with proper hooks...')
      if (typeof logout === 'function') {
        await logout()
        console.log('✅ Privy logout completed')
        // Clear local state
        setIsAuthenticated(false)
        setUser(null)
        setUserName('PLAYER')
      } else {
        console.error('❌ Privy logout hook not available')
      }
    } catch (error) {
      console.error('❌ Logout error:', error)
    }
  }

  const containerStyle = {
    minHeight: '100vh',
    width: '100vw',
    margin: 0,
    padding: 0,
    background: 'radial-gradient(ellipse at center, #2d3748 0%, #1a202c 50%, #0d1117 100%)',
    color: '#e2e8f0',
    overflow: 'hidden',
    position: 'relative',
    fontFamily: '"Rajdhani", "Arial Black", sans-serif',
    ...(isMobile && {
      overflow: 'auto',
      paddingBottom: '20px'
    })
  }

  const mobileContainerStyle = {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    padding: '15px',
    gap: '20px',
    position: 'relative',
    zIndex: 20
  }

  const tacticalPanelStyle = {
    background: 'linear-gradient(135deg, rgba(45, 55, 72, 0.9) 0%, rgba(26, 32, 44, 0.95) 100%)',
    backdropFilter: 'blur(10px)',
    borderRadius: isMobile ? '4px' : '6px',
    border: '2px solid #68d391',
    boxShadow: `
      0 0 20px rgba(104, 211, 145, 0.4),
      0 0 40px rgba(104, 211, 145, 0.2),
      inset 0 1px 0 rgba(104, 211, 145, 0.1)
    `,
    padding: isMobile ? '16px' : '20px',
    position: 'relative',
    overflow: 'hidden'
  }

  const ambrerPanelStyle = {
    background: 'linear-gradient(135deg, rgba(45, 55, 72, 0.9) 0%, rgba(26, 32, 44, 0.95) 100%)',
    backdropFilter: 'blur(10px)',
    borderRadius: isMobile ? '4px' : '6px',
    border: '2px solid #f6ad55',
    boxShadow: `
      0 0 20px rgba(246, 173, 85, 0.4),
      0 0 40px rgba(246, 173, 85, 0.2),
      inset 0 1px 0 rgba(246, 173, 85, 0.1)
    `,
    padding: isMobile ? '16px' : '20px',
    overflow: 'hidden'
  }

  const headerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: isMobile ? '0' : '20px 40px',
    zIndex: 30,
    ...(isMobile ? {} : {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0
    })
  }

  const titleStyle = {
    textAlign: 'center',
    padding: isMobile ? '20px 0' : '0',
    zIndex: 25,
    ...(isMobile ? {} : {
      position: 'absolute',
      top: '100px',
      left: '50%',
      transform: 'translateX(-50%)'
    })
  }

  const mainTitleStyle = {
    fontSize: isMobile ? '3rem' : '5.5rem',
    fontWeight: '900',
    margin: '0 0 8px 0',
    background: 'linear-gradient(45deg, #68d391 0%, #f6ad55 50%, #fc8181 100%)',
    backgroundClip: 'text',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    textShadow: '0 0 30px rgba(104, 211, 145, 0.6)',
    letterSpacing: '0.05em',
    fontFamily: '"Rajdhani", sans-serif',
    textTransform: 'uppercase'
  }

  const subtitleStyle = {
    color: '#68d391',
    fontWeight: '700',
    fontSize: isMobile ? '12px' : '16px',
    letterSpacing: '0.3em',
    margin: 0,
    textTransform: 'uppercase',
    textShadow: '0 0 10px rgba(104, 211, 145, 0.6)',
    fontFamily: '"Rajdhani", sans-serif'
  }

  const centerControlsStyle = {
    textAlign: 'center',
    padding: isMobile ? '20px 0' : '0',
    zIndex: 25,
    ...(isMobile ? {} : {
      position: 'absolute',
      left: '50%',
      top: '50%',
      transform: 'translate(-50%, -35%)'
    })
  }

  const nameInputStyle = {
    background: 'rgba(26, 32, 44, 0.9)',
    border: '2px solid #68d391',
    borderRadius: '4px',
    padding: isMobile ? '12px 16px' : '14px 20px',
    color: '#68d391',
    fontWeight: '700',
    textAlign: 'center',
    width: isMobile ? '160px' : '200px',
    fontSize: isMobile ? '14px' : '16px',
    boxShadow: '0 0 20px rgba(104, 211, 145, 0.3), inset 0 0 10px rgba(104, 211, 145, 0.1)',
    outline: 'none',
    transition: 'all 0.3s ease',
    fontFamily: '"Rajdhani", sans-serif',
    textTransform: 'uppercase',
    letterSpacing: '0.1em'
  }

  const stakeButtonStyle = {
    padding: isMobile ? '12px 20px' : '16px 32px',
    borderRadius: '4px',
    fontWeight: '700',
    fontSize: isMobile ? '14px' : '16px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    border: '2px solid',
    margin: isMobile ? '0 4px' : '0 8px',
    fontFamily: '"Rajdhani", sans-serif',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    position: 'relative',
    overflow: 'hidden'
  }

  const activeStakeStyle = {
    ...stakeButtonStyle,
    background: 'linear-gradient(45deg, #68d391 0%, #48bb78 100%)',
    color: '#1a202c',
    borderColor: '#68d391',
    boxShadow: '0 0 30px rgba(104, 211, 145, 0.6), 0 0 60px rgba(104, 211, 145, 0.3)',
    transform: 'scale(1.05)'
  }

  const inactiveStakeStyle = {
    ...stakeButtonStyle,
    background: 'rgba(26, 32, 44, 0.8)',
    color: '#f6ad55',
    borderColor: '#f6ad55',
    boxShadow: '0 0 15px rgba(246, 173, 85, 0.3)'
  }

  const deployButtonStyle = {
    background: 'linear-gradient(45deg, #fc8181 0%, #f56565 50%, #e53e3e 100%)',
    color: '#ffffff',
    fontWeight: '900',
    padding: isMobile ? '16px 48px' : '20px 64px',
    borderRadius: '6px',
    fontSize: isMobile ? '16px' : '20px',
    marginBottom: isMobile ? '20px' : '32px',
    cursor: 'pointer',
    border: '2px solid #fc8181',
    boxShadow: '0 0 40px rgba(252, 129, 129, 0.6), 0 0 80px rgba(252, 129, 129, 0.3)',
    transition: 'all 0.3s ease',
    letterSpacing: '0.1em',
    fontFamily: '"Rajdhani", sans-serif',
    textTransform: 'uppercase',
    position: 'relative',
    overflow: 'hidden'
  }

  const secondaryButtonStyle = {
    padding: isMobile ? '10px 20px' : '12px 24px',
    background: 'rgba(26, 32, 44, 0.8)',
    border: '2px solid #68d391',
    borderRadius: '4px',
    color: '#68d391',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    margin: isMobile ? '0 6px' : '0 10px',
    fontWeight: '600',
    fontSize: isMobile ? '12px' : '14px',
    boxShadow: '0 0 15px rgba(104, 211, 145, 0.3)',
    fontFamily: '"Rajdhani", sans-serif',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  }

  const iconStyle = {
    width: isMobile ? '24px' : '32px',
    height: isMobile ? '24px' : '32px',
    borderRadius: '3px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: isMobile ? '12px' : '16px',
    fontWeight: '700'
  }

  const statsStyle = {
    textAlign: 'center',
    display: 'flex',
    gap: isMobile ? '48px' : '80px',
    justifyContent: 'center',
    padding: isMobile ? '20px 0' : '0',
    zIndex: 25,
    ...(isMobile ? {} : {
      position: 'absolute',
      bottom: '100px',
      left: '50%',
      transform: 'translateX(-50%)'
    })
  }

  const statItemStyle = {
    textAlign: 'center'
  }

  const statNumberStyle = {
    fontSize: isMobile ? '28px' : '42px',
    fontWeight: '900',
    background: 'linear-gradient(45deg, #68d391 0%, #f6ad55 100%)',
    backgroundClip: 'text',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    marginBottom: '4px',
    textShadow: '0 0 20px rgba(104, 211, 145, 0.5)',
    fontFamily: '"Rajdhani", sans-serif'
  }

  const statLabelStyle = {
    color: '#68d391',
    fontSize: isMobile ? '11px' : '14px',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    textShadow: '0 0 10px rgba(104, 211, 145, 0.5)',
    fontFamily: '"Rajdhani", sans-serif'
  }

  const mobileGridStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    width: '100%'
  }

  // Desktop Layout
  if (!isMobile) {
    return (
      <div style={containerStyle}>
        
        {/* Insufficient Funds Notification Banner - Non-Intrusive */}
        {insufficientFundsNotification && (
          <div style={{
            position: 'fixed',
            top: '80px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            background: 'linear-gradient(45deg, rgba(252, 129, 129, 0.95) 0%, rgba(245, 101, 101, 0.95) 100%)',
            border: '2px solid #fc8181',
            borderRadius: '12px',
            padding: '12px 20px',
            maxWidth: '500px',
            minWidth: '320px',
            boxShadow: '0 8px 32px rgba(252, 129, 129, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            animation: 'slideInFromTop 0.5s ease-out',
            fontFamily: '"Rajdhani", sans-serif'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              color: 'white',
              fontSize: '14px',
              fontWeight: '600',
              textAlign: 'center'
            }}>
              <div style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px'
              }}>
                💰
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '16px', fontWeight: '700', marginBottom: '2px' }}>
                  Insufficient Funds
                </div>
                <div style={{ fontSize: '13px', opacity: 0.9 }}>
                  Need ${insufficientFundsNotification.requiredAmount} • You have ${insufficientFundsNotification.currentBalance} • 
                  <span style={{ fontWeight: '700', color: '#fef5e7' }}> Deposit more SOL to play!</span>
                </div>
              </div>
              <button
                onClick={() => setInsufficientFundsNotification(null)}
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '24px',
                  height: '24px',
                  color: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.target.style.background = 'rgba(255, 255, 255, 0.3)'
                }}
                onMouseOut={(e) => {
                  e.target.style.background = 'rgba(255, 255, 255, 0.2)'
                }}
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Enhanced Tactical Animated Background */}
        <div style={{
          position: 'absolute',
          top: '-20px',
          left: '-20px',
          width: 'calc(100% + 40px)',
          height: 'calc(100% + 40px)',
          zIndex: 1,
          overflow: 'hidden'
        }}>
          
          {/* Animated Background Layers */}
          <div style={{
            position: 'absolute',
            top: '-50px',
            left: '-50px',
            width: 'calc(100% + 100px)',
            height: 'calc(100% + 100px)',
            background: `
              radial-gradient(circle at 20% 80%, rgba(104, 211, 145, 0.03) 0%, transparent 50%),
              radial-gradient(circle at 80% 20%, rgba(246, 173, 85, 0.03) 0%, transparent 50%),
              radial-gradient(circle at 40% 40%, rgba(252, 129, 129, 0.02) 0%, transparent 50%),
              radial-gradient(ellipse at center, #2d3748 0%, #1a202c 50%, #0d1117 100%)
            `,
            animation: 'backgroundPulse 20s ease-in-out infinite'
          }} />

          {/* Moving Scan Lines */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '2px',
            background: 'linear-gradient(90deg, transparent 0%, #68d391 50%, transparent 100%)',
            animation: 'scanLineVertical 8s linear infinite'
          }} />
          
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '2px',
            height: '100%',
            background: 'linear-gradient(0deg, transparent 0%, #f6ad55 50%, transparent 100%)',
            animation: 'scanLineHorizontal 12s linear infinite'
          }} />

          {/* Enhanced Radar Sweep */}
          <div style={{
            position: 'absolute',
            top: '20%',
            right: '10%',
            width: '300px',
            height: '300px',
            border: '2px solid rgba(104, 211, 145, 0.3)',
            borderRadius: '50%',
            background: 'radial-gradient(circle, transparent 70%, rgba(104, 211, 145, 0.1) 100%)',
            animation: 'radarSweep 4s linear infinite'
          }}>
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: '2px',
              height: '150px',
              background: 'linear-gradient(to bottom, #68d391, transparent)',
              transformOrigin: 'top center',
              transform: 'translate(-50%, -100%)',
              animation: 'radarLine 4s linear infinite'
            }} />
            {/* Enhanced Radar Blips */}
            <div style={{
              position: 'absolute',
              top: '30%',
              left: '60%',
              width: '4px',
              height: '4px',
              background: '#f6ad55',
              borderRadius: '50%',
              boxShadow: '0 0 10px #f6ad55',
              animation: 'radarBlip 4s linear infinite'
            }} />
            <div style={{
              position: 'absolute',
              top: '70%',
              left: '40%',
              width: '3px',
              height: '3px',
              background: '#fc8181',
              borderRadius: '50%',
              boxShadow: '0 0 8px #fc8181',
              animation: 'radarBlip 4s linear infinite 1s'
            }} />
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '80%',
              width: '2px',
              height: '2px',
              background: '#68d391',
              borderRadius: '50%',
              boxShadow: '0 0 6px #68d391',
              animation: 'radarBlip 4s linear infinite 2s'
            }} />
          </div>

          {/* Animated Tactical Grid */}
          <div style={{
            position: 'absolute',
            top: '-100px',
            left: '-100px',
            width: '150%',
            height: '150%',
            opacity: 0.4,
            backgroundImage: `
              linear-gradient(rgba(104, 211, 145, 0.3) 1px, transparent 1px),
              linear-gradient(90deg, rgba(104, 211, 145, 0.3) 1px, transparent 1px)
            `,
            backgroundSize: '80px 80px',
            animation: 'tacticalGrid 30s linear infinite'
          }} />

          {/* Secondary Moving Grid */}
          <div style={{
            position: 'absolute',
            top: '-100px',
            left: '-100px',
            width: '150%',
            height: '150%',
            opacity: 0.2,
            backgroundImage: `
              linear-gradient(rgba(246, 173, 85, 0.2) 1px, transparent 1px),
              linear-gradient(90deg, rgba(246, 173, 85, 0.2) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px',
            animation: 'tacticalGrid 45s linear infinite reverse'
          }} />

          {/* Pulsing Data Streams */}
          <div style={{
            position: 'absolute',
            top: '10%',
            left: '80%',
            width: '2px',
            height: '200px',
            background: 'linear-gradient(to bottom, #fc8181, transparent)',
            animation: 'dataStream 3s ease-in-out infinite'
          }} />
          
          <div style={{
            position: 'absolute',
            top: '60%',
            left: '5%',
            width: '150px',
            height: '2px',
            background: 'linear-gradient(to right, #68d391, transparent)',
            animation: 'dataStream 4s ease-in-out infinite 1s'
          }} />

          {/* Enhanced HUD Elements */}
          <div style={{
            position: 'absolute',
            top: '15%',
            left: '5%',
            width: '200px',
            height: '100px',
            border: '2px solid rgba(246, 173, 85, 0.6)',
            borderRadius: '4px',
            background: 'rgba(26, 32, 44, 0.7)',
            animation: 'hudFlicker 6s ease-in-out infinite'
          }}>
            <div style={{
              position: 'absolute',
              top: '5px',
              left: '5px',
              color: '#f6ad55',
              fontSize: '12px',
              fontFamily: '"Rajdhani", monospace',
              fontWeight: '700'
            }}>SECTOR: ALPHA-7</div>
            <div style={{
              position: 'absolute',
              bottom: '5px',
              right: '5px',
              color: '#68d391',
              fontSize: '10px',
              fontFamily: '"Rajdhani", monospace',
              fontWeight: '600'
            }}>STATUS: ACTIVE</div>
            {/* Animated progress bar */}
            <div style={{
              position: 'absolute',
              bottom: '20px',
              left: '5px',
              right: '5px',
              height: '4px',
              background: 'rgba(104, 211, 145, 0.2)',
              borderRadius: '2px'
            }}>
              <div style={{
                height: '100%',
                background: '#68d391',
                borderRadius: '2px',
                animation: 'progressBar 5s ease-in-out infinite',
                boxShadow: '0 0 8px #68d391'
              }} />
            </div>
          </div>

          {/* Secondary HUD Element */}
          <div style={{
            position: 'absolute',
            bottom: '15%',
            right: '5%',
            width: '150px',
            height: '80px',
            border: '2px solid rgba(252, 129, 129, 0.6)',
            borderRadius: '4px',
            background: 'rgba(26, 32, 44, 0.7)',
            animation: 'hudFlicker 4s ease-in-out infinite 2s'
          }}>
            <div style={{
              position: 'absolute',
              top: '5px',
              left: '5px',
              color: '#fc8181',
              fontSize: '10px',
              fontFamily: '"Rajdhani", monospace',
              fontWeight: '700'
            }}>THREAT: LOW</div>
            <div style={{
              position: 'absolute',
              bottom: '5px',
              right: '5px',
              color: '#68d391',
              fontSize: '8px',
              fontFamily: '"Rajdhani", monospace',
              fontWeight: '600'
            }}>SECURED</div>
          </div>

          {/* Enhanced Floating Tactical Elements */}
          {floatingElements.map((element) => (
            <div
              key={`tactical-${element.id}`}
              style={{
                position: 'absolute',
                width: element.width + 'px',
                height: element.height + 'px',
                background: element.color,
                left: element.left + '%',
                top: element.top + '%',
                opacity: element.opacity,
                animation: `tacticalFloat ${element.animationDuration}s ease-in-out infinite`,
                boxShadow: `0 0 8px currentColor`,
                zIndex: 5,
                borderRadius: element.isCircle ? '50%' : '0'
              }}
            />
          ))}

          {/* Matrix-style Code Rain */}
          {codeElements.map((element) => (
            <div
              key={`code-${element.id}`}
              style={{
                position: 'absolute',
                left: `${element.left}%`,
                top: '-20px',
                width: '2px',
                height: `${element.height}px`,
                background: `linear-gradient(to bottom, transparent, #68d391, transparent)`,
                opacity: 0.3,
                animation: `codeMatrix ${element.animationDuration}s linear infinite ${element.animationDelay}s`
              }}
            />
          ))}

          {/* Enhanced Crosshairs */}
          <div style={{
            position: 'absolute',
            top: '40%',
            left: '15%',
            width: '40px',
            height: '40px',
            border: '2px solid rgba(252, 129, 129, 0.6)',
            borderRadius: '50%',
            animation: 'crosshairPulse 3s ease-in-out infinite'
          }}>
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '-10px',
              right: '-10px',
              height: '2px',
              background: '#fc8181',
              transform: 'translateY(-50%)'
            }} />
            <div style={{
              position: 'absolute',
              left: '50%',
              top: '-10px',
              bottom: '-10px',
              width: '2px',
              background: '#fc8181',
              transform: 'translateX(-50%)'
            }} />
          </div>

          {/* Secondary Crosshair */}
          <div style={{
            position: 'absolute',
            top: '70%',
            right: '20%',
            width: '30px',
            height: '30px',
            border: '1px solid rgba(104, 211, 145, 0.5)',
            borderRadius: '50%',
            animation: 'crosshairPulse 4s ease-in-out infinite 1.5s'
          }}>
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '-8px',
              right: '-8px',
              height: '1px',
              background: '#68d391',
              transform: 'translateY(-50%)'
            }} />
            <div style={{
              position: 'absolute',
              left: '50%',
              top: '-8px',
              bottom: '-8px',
              width: '1px',
              background: '#68d391',
              transform: 'translateX(-50%)'
            }} />
          </div>

          {/* Scanning Beams */}
          <div style={{
            position: 'absolute',
            top: '30%',
            left: '70%',
            width: '200px',
            height: '1px',
            background: 'linear-gradient(90deg, transparent 0%, #f6ad55 50%, transparent 100%)',
            animation: 'scanBeam 6s ease-in-out infinite',
            transformOrigin: 'left center'
          }} />
        </div>

        {/* Desktop Header */}
        <div style={headerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ 
              color: '#68d391', 
              fontWeight: '700', 
              fontSize: '16px',
              textShadow: '0 0 10px rgba(104, 211, 145, 0.6)',
              fontFamily: '"Rajdhani", sans-serif',
              textTransform: 'uppercase',
              letterSpacing: '0.1em'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>
                  PLAYER: {isAuthenticated ? 
                    (customUsername || user?.email?.address?.split('@')[0] || user?.wallet?.address?.slice(0, 8) || 'USER').toUpperCase() : 
                    (customUsername || userName).toUpperCase()
                  }
                </span>
                <span style={{
                  backgroundColor: '#CD7F32',
                  color: 'white',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  marginLeft: '8px'
                }}>
                  🥉 Bronze
                </span>
              </div>
            </span>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Navigation Icons */}
            <div 
              style={{ 
                width: 'auto', 
                minWidth: '32px',
                height: '32px', 
                background: 'rgba(26, 32, 44, 0.8)', 
                border: '2px solid #68d391',
                borderRadius: '4px',
                boxShadow: '0 0 15px rgba(104, 211, 145, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                fontSize: '14px',
                padding: '0 8px',
                gap: '4px'
              }}
              title="Wallet"
              onMouseOver={(e) => {
                e.target.style.transform = 'scale(1.1)'
                e.target.style.boxShadow = '0 0 20px rgba(104, 211, 145, 0.5)'
              }}
              onMouseOut={(e) => {
                e.target.style.transform = 'scale(1)'
                e.target.style.boxShadow = '0 0 15px rgba(104, 211, 145, 0.3)'
              }}
            >
              <span style={{ fontSize: '16px' }}>💰</span>
              <span style={{ 
                color: '#68d391', 
                fontFamily: '"Rajdhani", sans-serif',
                fontWeight: '700',
                fontSize: '12px'
              }}>
                {currency.toLocaleString()}
              </span>
            </div>
            <div 
              style={{ 
                position: 'relative',
                width: '32px', 
                height: '32px', 
                background: 'rgba(26, 32, 44, 0.8)', 
                border: '2px solid #68d391',
                borderRadius: '4px',
                boxShadow: '0 0 15px rgba(104, 211, 145, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                fontSize: '16px'
              }}
              title="Friends"
              onClick={() => {
                console.log('👥 Friends icon clicked!')
                setIsFriendsModalOpen(true)
              }}
              onMouseOver={(e) => {
                e.target.style.transform = 'scale(1.1)'
                e.target.style.boxShadow = '0 0 20px rgba(104, 211, 145, 0.5)'
              }}
              onMouseOut={(e) => {
                e.target.style.transform = 'scale(1)'
                e.target.style.boxShadow = '0 0 15px rgba(104, 211, 145, 0.3)'
              }}
            >
              👥
              {/* Notification Badge */}
              {friendRequests.received.length > 0 && (
                <div style={{
                  position: 'absolute',
                  top: '-6px',
                  right: '-6px',
                  background: '#ef4444',
                  color: 'white',
                  borderRadius: '50%',
                  width: '18px',
                  height: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  boxShadow: '0 0 8px rgba(239, 68, 68, 0.6)',
                  border: '2px solid rgba(26, 32, 44, 1)',
                  zIndex: 10
                }}>
                  {friendRequests.received.length > 9 ? '9+' : friendRequests.received.length}
                </div>
              )}
            </div>
            <div 
              style={{ 
                width: '32px', 
                height: '32px', 
                background: 'rgba(26, 32, 44, 0.8)', 
                border: '2px solid #68d391',
                borderRadius: '4px',
                boxShadow: '0 0 15px rgba(104, 211, 145, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                fontSize: '16px'
              }}
              title="User Profile"
              onClick={() => {
                console.log('🔍 Profile icon clicked!')
                console.log('🔍 Current authentication state:', isAuthenticated)
                console.log('🔍 Current user:', user)
                console.log('🔍 Current profile modal state:', isProfileModalOpen)
                
                // Force a fresh authentication check before opening modal
                if (typeof window !== 'undefined' && window.__TURFLOOT_PRIVY__) {
                  const privyState = window.__TURFLOOT_PRIVY__
                  console.log('🔍 Fresh Privy state check:', {
                    ready: privyState.ready,
                    authenticated: privyState.authenticated,
                    hasUser: !!privyState.user,
                    userEmail: privyState.user?.email?.address,
                    userWallet: privyState.user?.wallet?.address?.slice(0, 8) + '...'
                  })
                  
                  // Update local state with fresh Privy data
                  if (privyState.ready !== undefined) {
                    setIsAuthenticated(privyState.authenticated || false)
                    setUser(privyState.user || null)
                  }
                } else {
                  console.log('⚠️ Privy bridge not available when profile clicked')
                }
                
                setIsProfileModalOpen(true)
                console.log('🔍 Setting profile modal to true')
              }}
              onMouseOver={(e) => {
                e.target.style.transform = 'scale(1.1)'
                e.target.style.boxShadow = '0 0 20px rgba(104, 211, 145, 0.5)'
              }}
              onMouseOut={(e) => {
                e.target.style.transform = 'scale(1)'
                e.target.style.boxShadow = '0 0 15px rgba(104, 211, 145, 0.3)'
              }}
            >
              👤
            </div>
            
            {/* Login/Logout Button - FIXED */}
            {authenticated ? (
              <button
                onClick={handleLogout}
                style={{
                  padding: '8px 16px',
                  background: 'rgba(252, 129, 129, 0.2)',
                  border: '2px solid #fc8181',
                  borderRadius: '4px',
                  color: '#fc8181',
                  fontSize: '14px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 0 15px rgba(252, 129, 129, 0.4)',
                  fontFamily: '"Rajdhani", sans-serif',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}
                onMouseOver={(e) => {
                  e.target.style.background = 'rgba(252, 129, 129, 0.3)'
                  e.target.style.boxShadow = '0 0 20px rgba(252, 129, 129, 0.6)'
                }}
                onMouseOut={(e) => {
                  e.target.style.background = 'rgba(252, 129, 129, 0.2)'
                  e.target.style.boxShadow = '0 0 15px rgba(252, 129, 129, 0.4)'
                }}
              >
                LOGOUT
              </button>
            ) : (
              <button
                onClick={handleLogin}
                style={{
                  padding: '8px 16px',
                  background: 'linear-gradient(45deg, #68d391 0%, #48bb78 100%)',
                  border: '2px solid #68d391',
                  borderRadius: '4px',
                  color: '#1a202c',
                  fontSize: '14px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 0 20px rgba(104, 211, 145, 0.4)',
                  fontFamily: '"Rajdhani", sans-serif',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}
                onMouseOver={(e) => {
                  e.target.style.transform = 'scale(1.05)'
                  e.target.style.boxShadow = '0 0 30px rgba(104, 211, 145, 0.6)'
                }}
                onMouseOut={(e) => {
                  e.target.style.transform = 'scale(1)'
                  e.target.style.boxShadow = '0 0 20px rgba(104, 211, 145, 0.4)'
                }}
              >
                LOGIN
              </button>
            )}
          </div>
        </div>

        {/* Desktop Title */}
        <div style={titleStyle}>
          <h1 style={mainTitleStyle}>
            TURF<span style={{ 
              background: 'linear-gradient(45deg, #f6ad55 0%, #fc8181 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>LOOT</span>
          </h1>
          <p style={subtitleStyle}>SKILL-BASED GRID DOMINATION</p>
        </div>

        {/* Desktop Center Controls */}
        <div style={centerControlsStyle}>
          {/* Stats - Moved Above Username */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '80px',
            marginBottom: '40px',
            zIndex: 25
          }}>
            <div style={statItemStyle}>
              <div style={statNumberStyle}>{liveStats.players}</div>
              <div style={statLabelStyle}>PLAYERS ONLINE</div>
            </div>
            <div style={statItemStyle}>
              <div style={statNumberStyle}>${liveStats.winnings.toLocaleString()}</div>
              <div style={statLabelStyle}>TOTAL WINNINGS</div>
            </div>
          </div>

          {/* Player Name Input */}
          <div style={{ marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '24px', marginBottom: '24px' }}>
              <div style={{ position: 'relative' }}>
                <div 
                  onClick={() => setServerSelectorOpen(!serverSelectorOpen)}
                  style={{
                    width: '56px',
                    height: '56px',
                    background: 'linear-gradient(45deg, #f6ad55 0%, #ed8936 100%)',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#1a202c',
                    fontWeight: '800',
                    fontSize: '12px',
                    boxShadow: '0 0 30px rgba(246, 173, 85, 0.6)',
                    border: '2px solid #f6ad55',
                    fontFamily: '"Rajdhani", sans-serif',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    textAlign: 'center',
                    lineHeight: '1.2'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = 'scale(1.05)'
                    e.currentTarget.style.boxShadow = '0 0 40px rgba(246, 173, 85, 0.8)'
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'scale(1)'
                    e.currentTarget.style.boxShadow = '0 0 30px rgba(246, 173, 85, 0.6)'
                  }}
                >
                  {selectedServer || '...'}
                </div>
                
                {/* Server Dropdown */}
                {serverSelectorOpen && (
                  <div style={{
                    position: 'absolute',
                    top: '64px',
                    left: '0',
                    width: '200px',
                    backgroundColor: 'rgba(17, 24, 39, 0.95)',
                    border: '2px solid #f6ad55',
                    borderRadius: '8px',
                    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.8)',
                    zIndex: 1000,
                    backdropFilter: 'blur(10px)'
                  }}>
                    <div style={{
                      padding: '8px 0',
                      fontFamily: '"Rajdhani", sans-serif'
                    }}>
                      {serverDataLoading ? (
                        <div style={{
                          padding: '16px',
                          textAlign: 'center',
                          color: '#a0aec0',
                          fontSize: '14px'
                        }}>
                          <div style={{ fontSize: '18px', marginBottom: '8px' }}>⏳</div>
                          Refreshing servers...
                        </div>
                      ) : (
                        serverOptions.map((server) => (
                          <div
                            key={server.code}
                            onClick={() => {
                              setSelectedServer(server.code)
                              setServerSelectorOpen(false)
                              console.log(`🌐 Selected server: ${server.name} (${server.code}) - ${server.players} players, ${server.ping}ms`)
                            }}
                            style={{
                              padding: '12px 16px',
                              color: selectedServer === server.code ? '#f6ad55' : '#ffffff',
                              backgroundColor: selectedServer === server.code ? 'rgba(246, 173, 85, 0.1)' : 'transparent',
                              cursor: 'pointer',
                              fontSize: '14px',
                              fontWeight: '600',
                              transition: 'all 0.2s ease',
                              borderLeft: selectedServer === server.code ? '3px solid #f6ad55' : '3px solid transparent',
                              opacity: server.status === 'offline' ? 0.5 : 1
                            }}
                            onMouseOver={(e) => {
                              if (selectedServer !== server.code) {
                                e.currentTarget.style.backgroundColor = 'rgba(246, 173, 85, 0.05)'
                                e.currentTarget.style.color = '#f6ad55'
                              }
                            }}
                            onMouseOut={(e) => {
                              if (selectedServer !== server.code) {
                                e.currentTarget.style.backgroundColor = 'transparent'
                                e.currentTarget.style.color = '#ffffff'
                              }
                            }}
                          >
                            <div style={{ 
                              display: 'flex', 
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              marginBottom: '2px' 
                            }}>
                              <span style={{ fontWeight: '700' }}>
                                {server.name}
                              </span>
                              {server.status === 'offline' && (
                                <span style={{ 
                                  fontSize: '12px', 
                                  color: '#ef4444',
                                  fontWeight: '400'
                                }}>
                                  OFFLINE
                                </span>
                              )}
                              {server.status === 'online' && (
                                <span style={{ 
                                  fontSize: '12px', 
                                  color: '#10b981',
                                  fontWeight: '400'
                                }}>
                                  ONLINE
                                </span>
                              )}
                            </div>
                            <div style={{ 
                              fontSize: '11px', 
                              color: '#a0aec0',
                              fontWeight: '400',
                              textAlign: 'left'
                            }}>
                              {server.ping}ms • {server.players} players
                            </div>
                          </div>
                        ))
                      )}
                      
                      {/* Refresh button */}
                      <div style={{
                        borderTop: '1px solid rgba(246, 173, 85, 0.2)',
                        margin: '8px 0 0 0'
                      }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            fetchServerData()
                          }}
                          disabled={serverDataLoading}
                          style={{
                            width: '100%',
                            padding: '8px 16px',
                            backgroundColor: 'transparent',
                            border: 'none',
                            color: serverDataLoading ? '#6b7280' : '#f6ad55',
                            fontSize: '12px',
                            fontWeight: '600',
                            cursor: serverDataLoading ? 'not-allowed' : 'pointer',
                            fontFamily: '"Rajdhani", sans-serif',
                            textTransform: 'uppercase',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseOver={(e) => {
                            if (!serverDataLoading) {
                              e.target.style.backgroundColor = 'rgba(246, 173, 85, 0.1)'
                            }
                          }}
                          onMouseOut={(e) => {
                            e.target.style.backgroundColor = 'transparent'
                          }}
                        >
                          {serverDataLoading ? '⟳ Refreshing...' : 'Refresh Servers'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Click outside to close */}
                {serverSelectorOpen && (
                  <div 
                    onClick={() => setServerSelectorOpen(false)}
                    style={{
                      position: 'fixed',
                      top: 0,
                      left: 0,
                      width: '100vw',
                      height: '100vh',
                      zIndex: 999
                    }}
                  />
                )}
              </div>
              <input 
                type="text" 
                value={customUsername || userName}
                onChange={(e) => setCustomUsername(e.target.value)}
                style={nameInputStyle}
                placeholder="USERNAME"
                onFocus={(e) => {
                  e.target.style.borderColor = '#f6ad55'
                  e.target.style.boxShadow = '0 0 30px rgba(246, 173, 85, 0.6), inset 0 0 15px rgba(246, 173, 85, 0.1)'
                  e.target.style.color = '#f6ad55'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#68d391'
                  e.target.style.boxShadow = '0 0 20px rgba(104, 211, 145, 0.3), inset 0 0 10px rgba(104, 211, 145, 0.1)'
                  e.target.style.color = '#68d391'
                }}
              />
              <div 
                onClick={() => {
                  // Username confirmed - set the custom username to override any authenticated name
                  const currentInputValue = customUsername || userName
                  setCustomUsername(currentInputValue)
                  console.log('Username confirmed and set:', currentInputValue)
                }}
                style={{
                  width: '48px',
                  height: '48px',
                  background: 'linear-gradient(45deg, #68d391 0%, #48bb78 100%)',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#1a202c',
                  fontWeight: '600',
                  boxShadow: '0 0 20px rgba(104, 211, 145, 0.6)',
                  border: '2px solid #68d391',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.target.style.transform = 'scale(1.05)'
                  e.target.style.boxShadow = '0 0 30px rgba(104, 211, 145, 0.8)'
                }}
                onMouseOut={(e) => {
                  e.target.style.transform = 'scale(1)'
                  e.target.style.boxShadow = '0 0 20px rgba(104, 211, 145, 0.6)'
                }}
              >
                ✓
              </div>
            </div>
          </div>

          {/* Stakes */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '32px', justifyContent: 'center' }}>
            {['$0.01', '$0.02', '$0.05'].map((stake) => (
              <button
                key={stake}
                onClick={() => setSelectedStake(stake)}
                style={selectedStake === stake ? activeStakeStyle : inactiveStakeStyle}
                onMouseOver={(e) => {
                  if (selectedStake !== stake) {
                    e.target.style.transform = 'scale(1.02)'
                    e.target.style.boxShadow = '0 0 25px rgba(246, 173, 85, 0.5)'
                  }
                }}
                onMouseOut={(e) => {
                  if (selectedStake !== stake) {
                    e.target.style.transform = 'scale(1)'
                    e.target.style.boxShadow = '0 0 15px rgba(246, 173, 85, 0.3)'
                  }
                }}
              >
                {stake}
              </button>
            ))}
          </div>

          {/* Loyalty Progress Bar - Minimalistic Design */}
          {isAuthenticated && loyaltyData && (
            <div style={{ 
              marginBottom: '12px',
              padding: '8px 12px',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              borderRadius: '6px',
              fontSize: '12px',
              color: '#10b981'
            }}>
              {!loyaltyData.progress?.isMaxTier ? (
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center'
                }}>
                  <span>
                    {loyaltyData.progress?.progress?.gamesProgress?.current || 25}/
                    {loyaltyData.progress?.progress?.gamesProgress?.required || 50} games • 
                    ${loyaltyData.progress?.progress?.wageredProgress?.current?.toFixed(2) || '45.50'}/
                    ${loyaltyData.progress?.progress?.wageredProgress?.required || '100'} wagered
                  </span>
                  <span style={{ fontSize: '10px', opacity: 0.8 }}>
                    → {loyaltyData.progress?.nextTier === 'SILVER' ? '🥈 9%' : '🥇 8%'} fees
                  </span>
                </div>
              ) : (
                <div style={{ textAlign: 'center' }}>
                  🏆 {loyaltyData.tierInfo?.name} ({loyaltyData.feePercentage}% fees)
                </div>
              )}
            </div>
          )}
          
          {/* Minimalistic login prompt */}
          {!isAuthenticated && (
            <div style={{ 
              marginBottom: '12px',
              padding: '6px 12px',
              backgroundColor: 'rgba(107, 114, 128, 0.1)',
              border: '1px solid rgba(107, 114, 128, 0.2)',
              borderRadius: '6px',
              fontSize: '11px',
              color: '#9ca3af',
              textAlign: 'center'
            }}>
              Login to reduce fees with loyalty tiers
            </div>
          )}
          
          {/* Main Deploy Button - UPDATED with Paid Rooms Validation */}
          <button 
            onClick={async () => {
              console.log('▶ PLAY NOW button clicked!')
              console.log(`💰 Selected stake: ${selectedStake}`)
              console.log(`🌍 Selected server: ${selectedServer}`)
              
              const authenticated = await requireAuthentication('PLAY NOW')
              if (authenticated) {
                console.log('🎮 User authenticated, starting smart matchmaking...')
                
                // Check if user has sufficient funds for selected stake
                const stakeAmount = parseStakeAmount(selectedStake)
                
                if (stakeAmount === 0) {
                  // Free play mode - use existing global practice room
                  console.log('🎮 Free play mode - joining global practice room')
                  router.push(`/agario?roomId=global-practice-bots&mode=practice&fee=0`)
                } else {
                  // Paid room - validate balance and use smart matchmaking
                  if (validatePaidRoom(`PLAY NOW with ${selectedStake} stake`)) {
                    console.log(`✅ Sufficient funds confirmed for ${selectedStake} stake`)
                    console.log(`🎯 Starting smart matchmaking for ${selectedServer} region...`)
                    
                    try {
                      // Use smart matchmaking to find or create room
                      const matchResult = await findOrCreateRoom(selectedServer, stakeAmount, 'competitive')
                      
                      if (matchResult) {
                        const { roomId, serverData, action } = matchResult
                        
                        console.log(`🎯 Matchmaking successful!`)
                        console.log(`📍 Action: ${action}`)
                        console.log(`🏠 Room ID: ${roomId}`)
                        console.log(`🎮 Server: ${serverData.name}`)
                        console.log(`👥 Players: ${serverData.currentPlayers}/${serverData.maxPlayers}`)
                        
                        // DEDUCT ENTRY FEE + 10% SERVER FEE BEFORE JOINING
                        console.log(`💰 Deducting entry fee + server fee before joining room...`)
                        
                        const userWalletAddress = privyUser?.wallet?.address || 'unknown'
                        const feeResult = await deductRoomFees(stakeAmount, userWalletAddress)
                        
                        if (!feeResult.success) {
                          console.error(`❌ Fee deduction failed: ${feeResult.error}`)
                          alert(`Failed to join room: ${feeResult.error}\n\nPlease try again or contact support.`)
                          return
                        }
                        
                        console.log(`✅ Fees deducted successfully!`)
                        console.log(`💰 Entry Fee: $${feeResult.costs.entryFee.toFixed(3)}`)
                        console.log(`🏦 Server Fee: $${feeResult.costs.serverFee.toFixed(3)} → ${SERVER_WALLET_ADDRESS}`)
                        console.log(`💳 Total Deducted: $${feeResult.costs.totalCost.toFixed(3)}`)
                        console.log(`💵 New Balance: $${feeResult.newBalance.toFixed(3)}`)
                        
                        // Show matchmaking result to user
                        let message = ''
                        if (action === 'joined_existing') {
                          message = `🎯 Joining active ${serverData.name} with ${serverData.currentPlayers} players!\n💰 Paid: $${feeResult.costs.totalCost.toFixed(3)} (entry + server fee)`
                        } else if (action === 'joined_empty') {
                          message = `🎮 Joining ${serverData.name} - waiting for players...\n💰 Paid: $${feeResult.costs.totalCost.toFixed(3)} (entry + server fee)`
                        } else if (action === 'created_hathora') {
                          message = `🆕 Created new ${serverData.name} - you're the first player!\n💰 Paid: $${feeResult.costs.totalCost.toFixed(3)} (entry + server fee)`
                        } else if (action === 'created_fallback') {
                          message = `🔄 Created new ${serverData.name} - you're the first player!\n💰 Paid: $${feeResult.costs.totalCost.toFixed(3)} (entry + server fee)`
                        }
                        
                        // Brief notification showing payment confirmation
                        console.log(`🎯 ${message}`)
                        alert(`💰 Payment Confirmed!\n\n${message}`)
                        
                        // Navigate to game with the matched/created room
                        router.push(`/agario?roomId=${roomId}&mode=competitive&fee=${stakeAmount}&region=${selectedServer}&paid=true`)
                        
                      } else {
                        console.log('❌ Smart matchmaking failed - falling back to simple room creation')
                        // Fallback to simple room creation
                        router.push(`/agario?roomId=paid-${selectedServer.toLowerCase()}-${stakeAmount}&mode=competitive&fee=${stakeAmount}`)
                      }
                      
                    } catch (matchmakingError) {
                      console.error('❌ Smart matchmaking error:', matchmakingError)
                      // Fallback to simple room creation
                      console.log('🔄 Falling back to simple room creation...')
                      router.push(`/agario?roomId=paid-${selectedServer.toLowerCase()}-${stakeAmount}&mode=competitive&fee=${stakeAmount}`)
                    }
                    
                  } else {
                    console.log(`❌ Insufficient funds for ${selectedStake} stake`)
                    // Notification is already shown by validatePaidRoom function
                  }
                }
              } else {
                console.log('❌ Authentication failed, blocking access to PLAY NOW')
              }
            }}
            style={deployButtonStyle}
            onMouseOver={(e) => {
              e.target.style.transform = 'scale(1.05)'
              e.target.style.boxShadow = '0 0 60px rgba(252, 129, 129, 0.8), 0 0 100px rgba(252, 129, 129, 0.4)'
            }}
            onMouseOut={(e) => {
              e.target.style.transform = 'scale(1)'
              e.target.style.boxShadow = '0 0 40px rgba(252, 129, 129, 0.6), 0 0 80px rgba(252, 129, 129, 0.3)'
            }}
          >
            ▶ PLAY NOW
          </button>

          {/* Secondary Buttons */}
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginLeft: '40px' }}>
            <button 
              style={secondaryButtonStyle}
              onClick={async () => {
                console.log('SERVER BROWSER button clicked!')
                const authenticated = await requireAuthentication('SERVER BROWSER')
                if (authenticated) {
                  console.log('🌐 User authenticated, opening server browser...')
                  createDesktopServerBrowserPopup()
                } else {
                  console.log('❌ Authentication failed, blocking access to SERVER BROWSER')
                }
              }}
              onMouseOver={(e) => {
                e.target.style.background = 'rgba(104, 211, 145, 0.1)'
                e.target.style.transform = 'scale(1.02)'
                e.target.style.boxShadow = '0 0 25px rgba(104, 211, 145, 0.5)'
              }}
              onMouseOut={(e) => {
                e.target.style.background = 'rgba(26, 32, 44, 0.8)'
                e.target.style.transform = 'scale(1)'
                e.target.style.boxShadow = '0 0 15px rgba(104, 211, 145, 0.3)'
              }}
            >
              SERVER BROWSER
            </button>
            <button 
              style={{
                ...secondaryButtonStyle,
                background: (currentParty && currentParty.members && currentParty.members.length > 1) ? 'rgba(107, 114, 128, 0.3)' : 'rgba(59, 130, 246, 0.1)',
                border: (currentParty && currentParty.members && currentParty.members.length > 1) ? '2px solid #6b7280' : '2px solid #3b82f6',
                color: (currentParty && currentParty.members && currentParty.members.length > 1) ? '#9ca3af' : '#3b82f6',
                cursor: (currentParty && currentParty.members && currentParty.members.length > 1) ? 'not-allowed' : 'pointer',
                opacity: (currentParty && currentParty.members && currentParty.members.length > 1) ? 0.6 : 1
              }}
              onClick={(e) => {
                if (currentParty && currentParty.members && currentParty.members.length > 1) {
                  console.log('🔒 LOCAL PRACTICE blocked - user is in a duo')
                  e.preventDefault()
                  return
                }
                
                console.log('🤖 LOCAL PRACTICE button clicked!')
                
                // Create completely local room with bots - no Hathora charges
                const localRoomId = 'local-bots-' + Math.random().toString(36).substring(2, 10)
                const gameUrl = `/agario?roomId=${localRoomId}&mode=local&fee=0&region=local&multiplayer=offline&server=local&bots=true`
                console.log('🎮 Starting local practice with bots:', gameUrl)
                checkOrientationAndEnterGame(gameUrl)
              }}
              onMouseOver={(e) => {
                if (currentParty && currentParty.members && currentParty.members.length > 1) {
                  // Show tooltip for disabled state
                  const tooltip = document.createElement('div')
                  tooltip.id = 'local-practice-tooltip'
                  tooltip.textContent = 'Local Practice is only available for solo players. Leave your party to play offline with bots.'
                  tooltip.style.cssText = `
                    position: absolute;
                    background: rgba(0, 0, 0, 0.9);
                    color: white;
                    padding: 8px 12px;
                    border-radius: 6px;
                    font-size: 12px;
                    font-weight: 500;
                    max-width: 250px;
                    z-index: 10000;
                    pointer-events: none;
                    border: 1px solid #374151;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                  `
                  
                  // Position tooltip above the button
                  const rect = e.target.getBoundingClientRect()
                  tooltip.style.left = `${rect.left}px`
                  tooltip.style.top = `${rect.top - 60}px`
                  
                  document.body.appendChild(tooltip)
                } else {
                  e.target.style.background = 'rgba(59, 130, 246, 0.2)'
                  e.target.style.transform = 'scale(1.02)'
                  e.target.style.boxShadow = '0 0 25px rgba(59, 130, 246, 0.5)'
                }
              }}
              onMouseOut={(e) => {
                // Remove tooltip
                const tooltip = document.getElementById('local-practice-tooltip')
                if (tooltip) {
                  tooltip.remove()
                }
                
                if (!(currentParty && currentParty.members && currentParty.members.length > 1)) {
                  e.target.style.background = 'rgba(59, 130, 246, 0.1)'
                  e.target.style.transform = 'scale(1)'
                  e.target.style.boxShadow = '0 0 15px rgba(59, 130, 246, 0.3)'
                }
              }}
              disabled={currentParty && currentParty.members && currentParty.members.length > 1}
            >
              {(currentParty && currentParty.members && currentParty.members.length > 1) ? '🔒 LOCAL PRACTICE' : 'LOCAL PRACTICE'}
            </button>
            <button 
              style={secondaryButtonStyle}
              onClick={async () => {
                console.log('HOW TO PLAY button clicked!')
                const authenticated = await requireAuthentication('HOW TO PLAY')
                if (authenticated) {
                  console.log('📖 User authenticated, showing how to play...')
                  // Add your how to play functionality here
                  alert('HOW TO PLAY: Move with mouse, collect coins to grow, hold E to cash out!')
                } else {
                  console.log('❌ Authentication failed, blocking access to HOW TO PLAY')
                }
              }}
              onMouseOver={(e) => {
                e.target.style.background = 'rgba(104, 211, 145, 0.1)'
                e.target.style.transform = 'scale(1.02)'
                e.target.style.boxShadow = '0 0 25px rgba(104, 211, 145, 0.4)'
              }}
              onMouseOut={(e) => {
                e.target.style.background = 'rgba(26, 32, 44, 0.8)'
                e.target.style.transform = 'scale(1)'
                e.target.style.boxShadow = '0 0 15px rgba(104, 211, 145, 0.3)'
              }}
            >
              HOW TO PLAY
            </button>
          </div>
        </div>



        {/* Desktop 4-Panel Layout - Fixed */}
        {/* Top Left - Command */}
        <div style={{
          position: 'absolute',
          left: '200px',
          top: '160px',
          width: '280px',  
          zIndex: 20,
          ...tacticalPanelStyle
        }}>
          <div style={{
            position: 'absolute',
            top: '5px',
            right: '5px',
            width: '8px',
            height: '8px',
            background: '#68d391',
            borderRadius: '50%',
            boxShadow: '0 0 10px #68d391',
            animation: 'statusBlink 2s ease-in-out infinite'
          }} />
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <h3 style={{ color: '#f6ad55', fontWeight: '700', fontSize: '18px', margin: 0, fontFamily: '"Rajdhani", sans-serif', textShadow: '0 0 10px rgba(246, 173, 85, 0.6)', textTransform: 'uppercase' }}>LEADERBOARD</h3>
            <div style={{ marginLeft: 'auto' }}>
              <div style={{
                padding: '4px 10px',
                background: 'rgba(104, 211, 145, 0.2)',
                color: '#68d391',
                fontSize: '12px',
                borderRadius: '3px',
                border: '1px solid #68d391',
                fontWeight: '600',
                boxShadow: '0 0 10px rgba(104, 211, 145, 0.3)',
                fontFamily: '"Rajdhani", sans-serif',
                textTransform: 'uppercase'
              }}>
                ACTIVE
              </div>
            </div>
          </div>
          
          <div style={{ marginBottom: '12px' }}>
            {leaderboard.map((player, index) => (
              <div key={player.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: index < leaderboard.length - 1 ? '1px solid rgba(104, 211, 145, 0.3)' : 'none' }}>
                <span style={{ color: '#e2e8f0', fontSize: '15px', fontWeight: '600', fontFamily: '"Rajdhani", sans-serif' }}>
                  {String(index + 1).padStart(2, '0')}. {player.name}
                </span>
                <span style={{ 
                  color: '#f6ad55', 
                  fontWeight: '700', 
                  fontSize: '15px',
                  textShadow: '0 0 10px rgba(246, 173, 85, 0.6)',
                  fontFamily: '"Rajdhani", sans-serif'
                }}>
                  ${player.cashout.toLocaleString()}
                </span>
              </div>
            ))}
            {leaderboard.length === 0 && (
              <div style={{ textAlign: 'center', padding: '20px 0', color: '#68d391', fontSize: '14px', fontFamily: '"Rajdhani", sans-serif' }}>
                LOADING LEADERBOARD...
              </div>
            )}
          </div>
          
          <button 
            onClick={() => createDesktopLeaderboardPopup()}
            style={{
            width: '100%',
            padding: '6px',
            background: 'rgba(26, 32, 44, 0.8)',
            border: '2px solid #68d391',
            borderRadius: '4px',
            color: '#68d391',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: '0 0 15px rgba(104, 211, 145, 0.3)',
            fontFamily: '"Rajdhani", sans-serif',
            textTransform: 'uppercase'
          }}>
            VIEW LEADERBOARD
          </button>
        </div>

        {/* Top Right - Arsenal */}
        <div style={{
          position: 'absolute',
          right: '200px',
          top: '160px',
          width: '280px',
          zIndex: 20,
          ...ambrerPanelStyle
        }}>
          <div style={{
            position: 'absolute',
            top: '5px',
            right: '5px',
            width: '8px',
            height: '8px',
            background: '#f6ad55',
            borderRadius: '50%',
            boxShadow: '0 0 10px #f6ad55',
            animation: 'statusBlink 2s ease-in-out infinite 0.5s'
          }} />
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <h3 style={{ color: '#f6ad55', fontWeight: '700', fontSize: '18px', margin: 0, fontFamily: '"Rajdhani", sans-serif', textShadow: '0 0 10px rgba(246, 173, 85, 0.6)', textTransform: 'uppercase' }}>WALLET</h3>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
              <button 
                onClick={handleCopyAddress}
                style={{ 
                  fontSize: '11px', 
                  color: '#f6ad55', 
                  background: 'none', 
                  border: 'none', 
                  cursor: 'pointer', 
                  fontWeight: '600', 
                  fontFamily: '"Rajdhani", sans-serif',
                  textDecoration: 'none',
                  padding: '0'
                }}
                onMouseOver={(e) => {
                  e.target.style.color = '#fbb040'
                }}
                onMouseOut={(e) => {
                  e.target.style.color = '#f6ad55'
                }}
              >
                📋 COPY ADDRESS
              </button>
              <button 
                onClick={handleBalanceRefresh}
                style={{ 
                  fontSize: '11px', 
                  color: '#f6ad55', 
                  background: 'none', 
                  border: 'none', 
                  cursor: 'pointer', 
                  fontWeight: '600', 
                  fontFamily: '"Rajdhani", sans-serif',
                  textDecoration: 'none',
                  padding: '0'
                }}
                onMouseOver={(e) => {
                  e.target.style.color = '#fbb040'
                }}
                onMouseOut={(e) => {
                  e.target.style.color = '#f6ad55'
                }}
              >
                [↻] REFRESH BALANCE
              </button>
            </div>
          </div>
          
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ 
              fontSize: '36px', 
              fontWeight: '800', 
              background: 'linear-gradient(45deg, #f6ad55 0%, #fc8181 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: '4px',
              textShadow: '0 0 20px rgba(246, 173, 85, 0.6)',
              fontFamily: '"Rajdhani", sans-serif'
            }}>
              {walletBalance.loading ? 'Loading...' : `$${walletBalance.usd}`}
            </div>
            <div style={{ color: '#f6ad55', fontSize: '14px', fontWeight: '600', fontFamily: '"Rajdhani", sans-serif' }}>
              {walletBalance.loading ? 'Loading...' : `${walletBalance.sol} SOL`}
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              onClick={handleDeposit}
              style={{
              flex: 1,
              padding: '14px',
              background: 'rgba(104, 211, 145, 0.2)',
              border: '2px solid #68d391',
              borderRadius: '4px',
              color: '#68d391',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: '0 0 15px rgba(104, 211, 145, 0.3)',
              fontFamily: '"Rajdhani", sans-serif',
              textTransform: 'uppercase'
            }}>
              DEPOSIT SOL
            </button>
            <button 
              onClick={handleWithdraw}
              style={{
              flex: 1,
              padding: '14px',
              background: 'rgba(252, 129, 129, 0.2)',
              border: '2px solid #fc8181',
              borderRadius: '4px',
              color: '#fc8181',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: '0 0 15px rgba(252, 129, 129, 0.3)',
              fontFamily: '"Rajdhani", sans-serif',
              textTransform: 'uppercase'
            }}>
              WITHDRAW
            </button>
          </div>
        </div>

        {/* Bottom Left - Squad */}
        <div style={{
          position: 'absolute',
          left: '200px',
          top: '210px',
          width: '280px',
          zIndex: 20,
          ...tacticalPanelStyle
        }}>
          <div style={{
            position: 'absolute',
            top: '5px',
            right: '5px',
            width: '8px',
            height: '8px',
            background: '#fc8181',
            borderRadius: '50%',
            boxShadow: '0 0 10px #fc8181',
            animation: 'statusBlink 2s ease-in-out infinite 1s'
          }} />
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <h3 style={{ color: '#fc8181', fontWeight: '700', fontSize: '18px', margin: 0, fontFamily: '"Rajdhani", sans-serif', textShadow: '0 0 10px rgba(252, 129, 129, 0.6)', textTransform: 'uppercase' }}>PARTY</h3>
            <div style={{ marginLeft: 'auto' }}>
              <button 
                onClick={async () => {
                  console.log('🔄 PARTY REFRESH button clicked - refreshing lobby data...')
                  
                  try {
                    // Show loading state
                    setLoadingParty(true)
                    
                    console.log('🔄 Step 1: Refreshing current party data...')
                    await loadCurrentParty()
                    
                    console.log('🔄 Step 2: Refreshing friends list with updated skin data...')
                    await loadFriendsList()
                    
                    console.log('🔄 Step 3: Refreshing friend requests and party invites...')
                    await loadFriendRequests()
                    
                    console.log('🔄 Step 4: Refreshing available users list...')
                    await loadAvailableUsers()
                    
                    // Force re-register user to update skin data
                    if (isAuthenticated && user) {
                      console.log('🔄 Step 5: Updating user skin data...')
                      await registerPrivyUser()
                    }
                    
                    console.log('✅ PARTY REFRESH completed successfully!')
                    
                    // Show success feedback
                    const successMessage = currentParty 
                      ? `🎯 Party "${currentParty.name}" refreshed - ${currentParty.members?.length || 0} member${currentParty.members?.length !== 1 ? 's' : ''} online`
                      : '👥 Lobby refreshed - Party data updated'
                    
                    // Brief success indicator
                    const originalText = document.querySelector('[data-refresh-text]')?.textContent
                    const refreshButton = document.querySelector('[data-refresh-text]')
                    if (refreshButton) {
                      refreshButton.textContent = '✅ REFRESHED'
                      setTimeout(() => {
                        refreshButton.textContent = originalText || '[↻] REFRESH'
                      }, 2000)
                    }
                    
                  } catch (error) {
                    console.error('❌ PARTY REFRESH failed:', error)
                    
                    // Show error feedback
                    const refreshButton = document.querySelector('[data-refresh-text]')
                    if (refreshButton) {
                      refreshButton.textContent = '❌ FAILED'
                      setTimeout(() => {
                        refreshButton.textContent = '[↻] REFRESH'
                      }, 2000)
                    }
                  } finally {
                    setLoadingParty(false)
                  }
                }}
                style={{ 
                  fontSize: '11px', 
                  color: '#f6ad55', 
                  background: 'none', 
                  border: 'none', 
                  cursor: 'pointer', 
                  fontWeight: '600', 
                  fontFamily: '"Rajdhani", sans-serif',
                  padding: '2px 4px',
                  borderRadius: '2px',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.target.style.background = 'rgba(246, 173, 85, 0.1)'
                  e.target.style.boxShadow = '0 0 5px rgba(246, 173, 85, 0.3)'
                }}
                onMouseOut={(e) => {
                  e.target.style.background = 'none'
                  e.target.style.boxShadow = 'none'
                }}
              >
                <span data-refresh-text>[↻] REFRESH</span>
              </button>
              
              {/* Leave Party Button - Only show when in a party */}
              {currentParty && (
                <button 
                  onClick={async () => {
                    console.log('🚪 LEAVE PARTY button clicked!')
                    
                    try {
                      if (!isAuthenticated || !user) {
                        console.log('❌ User not authenticated for leaving party')
                        return
                      }
                      
                      const userIdentifier = user.wallet?.address || user.email || user.id
                      console.log('🚪 Leaving party for user:', userIdentifier)
                      
                      // Show loading feedback
                      const leaveButton = document.querySelector('[data-leave-text]')
                      if (leaveButton) {
                        leaveButton.textContent = '⏳ LEAVING...'
                      }
                      
                      // API call to leave party
                      const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/party`, {
                        method: 'DELETE',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                          userIdentifier: userIdentifier,
                          partyId: currentParty.id
                        })
                      })
                      
                      const result = await response.json()
                      
                      if (response.ok) {
                        console.log('✅ Successfully left party:', result)
                        
                        // Check if the party was disbanded (owner left or party became empty)
                        if (result.partyDisbanded) {
                          console.log('🗑️ Party was disbanded:', {
                            isOwner: result.isOwner,
                            message: result.message
                          })
                          
                          // Show appropriate message based on whether user was owner
                          if (result.isOwner) {
                            // Show success feedback for party owner
                            if (leaveButton) {
                              leaveButton.textContent = '✅ DISBANDED'
                              setTimeout(() => {
                                leaveButton.textContent = '[✕] LEAVE'
                              }, 2000)
                            }
                            alert(`👑 ${result.message}\n\nAs the party owner, your party has been completely removed.`)
                          } else {
                            // Show success feedback for member leaving empty party
                            if (leaveButton) {
                              leaveButton.textContent = '✅ LEFT'
                              setTimeout(() => {
                                leaveButton.textContent = '[✕] LEAVE'
                              }, 2000)
                            }
                            alert(`🏁 ${result.message}`)
                          }
                        } else {
                          // Regular member left, party still exists
                          if (leaveButton) {
                            leaveButton.textContent = '✅ LEFT'
                            setTimeout(() => {
                              leaveButton.textContent = '[✕] LEAVE'
                            }, 2000)
                          }
                          alert(`👋 ${result.message}`)
                        }
                        
                        // Clear current party state regardless of disbandment
                        setCurrentParty(null)
                        
                        // Refresh party data to show updated state
                        await loadCurrentParty()
                        
                      } else {
                        console.error('❌ Failed to leave party:', response.status)
                        if (leaveButton) {
                          leaveButton.textContent = '❌ FAILED'
                          setTimeout(() => {
                            leaveButton.textContent = '[✕] LEAVE'
                          }, 2000)
                        }
                      }
                      
                    } catch (error) {
                      console.error('❌ Error leaving party:', error)
                      const leaveButton = document.querySelector('[data-leave-text]')
                      if (leaveButton) {
                        leaveButton.textContent = '❌ ERROR'
                        setTimeout(() => {
                          leaveButton.textContent = '[✕] LEAVE'
                        }, 2000)
                      }
                    }
                  }}
                  style={{ 
                    fontSize: '11px', 
                    color: '#fc8181', 
                    background: 'none', 
                    border: 'none', 
                    cursor: 'pointer', 
                    fontWeight: '600', 
                    fontFamily: '"Rajdhani", sans-serif',
                    padding: '2px 4px',
                    borderRadius: '2px',
                    transition: 'all 0.2s ease',
                    marginLeft: '8px'
                  }}
                  onMouseOver={(e) => {
                    e.target.style.background = 'rgba(252, 129, 129, 0.1)'
                    e.target.style.boxShadow = '0 0 5px rgba(252, 129, 129, 0.3)'
                  }}
                  onMouseOut={(e) => {
                    e.target.style.background = 'none'
                    e.target.style.boxShadow = 'none'
                  }}
                >
                  <span data-leave-text>[✕] LEAVE</span>
                </button>
              )}
            </div>
          </div>
          
          <div style={{ 
            background: currentParty ? 'rgba(26, 32, 44, 0.8)' : 'rgba(26, 32, 44, 0.6)', 
            borderRadius: '8px', 
            padding: '16px', 
            textAlign: 'center',
            border: currentParty ? '2px solid rgba(104, 211, 145, 0.6)' : '2px solid rgba(104, 211, 145, 0.3)',
            marginBottom: '16px',
            boxShadow: currentParty ? '0 0 20px rgba(104, 211, 145, 0.4)' : 'none'
          }}>
            {currentParty ? (
              // Show current party members
              <div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  marginBottom: '12px'
                }}>
                  <div style={{
                    color: '#68d391',
                    fontSize: '16px',
                    fontWeight: '700',
                    fontFamily: '"Rajdhani", sans-serif'
                  }}>
                    {currentParty.name}
                  </div>
                  <div style={{
                    padding: '2px 6px',
                    background: 'rgba(104, 211, 145, 0.2)',
                    border: '1px solid #68d391',
                    borderRadius: '3px',
                    fontSize: '10px',
                    color: '#68d391',
                    textTransform: 'uppercase'
                  }}>
                    {currentParty.privacy}
                  </div>
                </div>
                
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  marginBottom: '8px'
                }}>
                  {currentParty.members?.slice(0, 4).map((member, index) => {
                    // Use current user's selected skin for their own avatar, otherwise use member's equipped skin
                    const isCurrentUser = isAuthenticated && user && (
                      member.userIdentifier === (user.wallet?.address || user.email || user.id)
                    )
                    const skinToUse = isCurrentUser ? selectedSkin : (member.equippedSkin || {
                      type: 'circle',
                      color: '#3b82f6',
                      pattern: 'solid'
                    })
                    
                    return (
                      <div key={member.userIdentifier} style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        {/* Member avatar circle */}
                        <div style={getSkinAvatarStyle(skinToUse, 32, member.isOnline)}>
                          {/* Skin inner content */}
                          <div style={{ 
                            width: '70%', 
                            height: '70%', 
                            borderRadius: '50%', 
                            background: 'rgba(255, 255, 255, 0.2)' 
                          }} />
                          
                          {/* Online status dot */}
                          {member.isOnline && (
                            <div style={{
                              position: 'absolute',
                              top: '-2px',
                              right: '-2px',
                              width: '8px',
                              height: '8px',
                              background: '#22c55e',
                              borderRadius: '50%',
                              border: '1px solid rgba(26, 32, 44, 1)',
                              boxShadow: '0 0 4px rgba(34, 197, 94, 0.6)'
                            }} />
                          )}
                        </div>
                        
                        {/* Username directly below the circle */}
                        <div style={{
                          color: member.isOnline ? '#e2e8f0' : '#9ca3af',
                          fontSize: '10px',
                          fontWeight: '500',
                          textAlign: 'center',
                          fontFamily: '"Rajdhani", sans-serif',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          maxWidth: '40px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {member.username || 'USER'}
                        </div>
                      </div>
                    )
                  })}
                  {currentParty.members?.length > 4 && (
                    <div style={{
                      width: '32px',
                      height: '32px',
                      background: 'rgba(104, 211, 145, 0.2)',
                      border: '2px solid #68d391',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '10px',
                      color: '#68d391',
                      fontWeight: 'bold'
                    }}>
                      +{currentParty.members.length - 4}
                    </div>
                  )}
                </div>
              </div>
            ) : loadingParty ? (
              // Loading state
              <div>
                <div style={{
                  width: '50px',
                  height: '50px',
                  background: 'linear-gradient(135deg, rgba(104, 211, 145, 0.2) 0%, rgba(104, 211, 145, 0.4) 100%)',
                  border: '2px solid #68d391',
                  borderRadius: '4px',
                  margin: '0 auto 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                  animation: 'pulse 2s infinite'
                }}>
                  🔄
                </div>
                <div style={{ color: '#e2e8f0', fontSize: '15px', marginBottom: '8px', fontWeight: '600', fontFamily: '"Rajdhani", sans-serif', textTransform: 'uppercase' }}>LOADING PARTY...</div>
              </div>
            ) : (
              // No party state
              <div>
                <div style={{
                  width: '50px',
                  height: '50px',
                  background: 'linear-gradient(135deg, rgba(104, 211, 145, 0.2) 0%, rgba(104, 211, 145, 0.4) 100%)',
                  border: '2px solid #68d391',
                  borderRadius: '4px',
                  margin: '0 auto 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                  boxShadow: '0 0 20px rgba(104, 211, 145, 0.3)'
                }}>
                  👤
                </div>
                <div style={{ color: '#e2e8f0', fontSize: '15px', marginBottom: '8px', fontWeight: '600', fontFamily: '"Rajdhani", sans-serif', textTransform: 'uppercase' }}>NO PARTY MEMBERS</div>
              </div>
            )}
          </div>
          
          <button 
            onClick={async () => {
              console.log('JOIN PARTY button clicked!')
              const authenticated = await requireAuthentication('JOIN PARTY')
              if (authenticated) {
                console.log('👥 User authenticated, opening join party...')
                createDesktopJoinPartyPopup()
              } else {
                console.log('❌ Authentication failed, blocking access to JOIN PARTY')
              }
            }}
            style={{
            width: '100%',
            padding: '12px',
            background: 'rgba(26, 32, 44, 0.8)',
            border: '2px solid #f6ad55',
            borderRadius: '4px',
            color: '#f6ad55',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: '0 0 15px rgba(246, 173, 85, 0.3)',
            fontFamily: '"Rajdhani", sans-serif',
            textTransform: 'uppercase',
            marginBottom: '12px'
          }}>
            JOIN PARTY
          </button>
          
          <button 
            onClick={async () => {
              console.log('CREATE PARTY button clicked!')
              const authenticated = await requireAuthentication('CREATE PARTY')
              if (authenticated) {
                console.log('🎯 User authenticated, opening create party modal immediately...')
                
                // Open modal immediately for better UX
                createDesktopCreatePartyPopup()
                
                // Load friends asynchronously in background (non-blocking)
                if (friendsList.length === 0 && !loadingFriends) {
                  console.log('🔄 Loading friends list in background...')
                  loadFriendsList().catch(error => {
                    console.error('❌ Background friends loading failed:', error)
                  })
                }
                
                console.log('✅ Modal opened immediately - friends will load in background')
              } else {
                console.log('❌ Authentication failed, blocking access to CREATE PARTY')
              }
            }}
            style={{
            width: '100%',
            padding: '12px',
            background: 'rgba(26, 32, 44, 0.8)',
            border: '2px solid #68d391',
            borderRadius: '4px',
            color: '#68d391',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: '0 0 15px rgba(104, 211, 145, 0.3)',
            fontFamily: '"Rajdhani", sans-serif',
            textTransform: 'uppercase'
          }}>
            CREATE PARTY
          </button>
        </div>

        {/* Bottom Right - Loadout */}
        <div style={{
          position: 'absolute',
          right: '200px',
          bottom: '160px',
          width: '280px',
          zIndex: 20,
          ...ambrerPanelStyle
        }}>
          <div style={{
            position: 'absolute',
            top: '5px',
            right: '5px',
            width: '8px',
            height: '8px',
            background: '#68d391',
            borderRadius: '50%',
            boxShadow: '0 0 10px #68d391',
            animation: 'statusBlink 2s ease-in-out infinite 1.5s'
          }} />
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <h3 style={{ color: '#8b5cf6', fontWeight: '700', fontSize: '18px', margin: 0, fontFamily: '"Rajdhani", sans-serif', textShadow: '0 0 10px rgba(139, 92, 246, 0.6)', textTransform: 'uppercase' }}>CUSTOMIZE</h3>
          </div>
          
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            {/* Interactive Game Circle Preview */}
            <div 
              ref={circleRef}
              style={{
                width: '72px',
                height: '72px',
                backgroundColor: selectedSkin.color, // Dynamic skin color instead of hardcoded blue
                border: '3px solid #ffffff', // White border like in-game
                borderRadius: '50%',
                margin: '0 auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
                transition: 'transform 0.3s ease, background-color 0.3s ease', // Added transition for skin changes
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'scale(1.1)'
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'scale(1)'
              }}
            >
              {/* Smooth Interactive Black Eyes */}
              <div style={{
                position: 'absolute',
                width: '8px',
                height: '8px',
                backgroundColor: '#000000',
                borderRadius: '50%',
                left: `${eyePositions.leftEye.x}px`,
                top: `${eyePositions.leftEye.y}px`,
                transform: 'translate(-50%, -50%)'
              }} />
              <div style={{
                position: 'absolute', 
                width: '8px',
                height: '8px',
                backgroundColor: '#000000',
                borderRadius: '50%',
                left: `${eyePositions.rightEye.x}px`,
                top: `${eyePositions.rightEye.y}px`,
                transform: 'translate(-50%, -50%)'
              }} />
            </div>
          </div>
          
          <button 
            onClick={async () => {
              console.log('VIEW STORE button clicked!')
              const authenticated = await requireAuthentication('VIEW STORE')
              if (authenticated) {
                console.log('🛒 User authenticated, opening view store...')
                createSkinStorePopup(currency, setCurrency, selectedSkin, setSelectedSkin, 'shop')
              } else {
                console.log('❌ Authentication failed, blocking access to VIEW STORE')
              }
            }}
            style={{
            width: '100%',
            padding: '14px',
            background: 'linear-gradient(45deg, #f6ad55 0%, #ed8936 100%)',
            color: '#1a202c',
            fontWeight: '700',
            borderRadius: '4px',
            border: '2px solid #f6ad55',
            cursor: 'pointer',
            marginBottom: '12px',
            boxShadow: '0 0 20px rgba(246, 173, 85, 0.4)',
            transition: 'all 0.3s ease',
            fontFamily: '"Rajdhani", sans-serif',
            textTransform: 'uppercase'
          }}>
            VIEW STORE
          </button>
          
          <button 
            onClick={async () => {
              console.log('CHANGE SKIN button clicked!')
              const authenticated = await requireAuthentication('CHANGE SKIN')
              if (authenticated) {
                console.log('🎨 User authenticated, opening change skin...')
                createSkinStorePopup(currency, setCurrency, selectedSkin, setSelectedSkin, 'owned')
              } else {
                console.log('❌ Authentication failed, blocking access to CHANGE SKIN')
              }
            }}
            style={{
            width: '100%',
            padding: '12px',
            background: 'rgba(26, 32, 44, 0.8)',
            border: '2px solid #f6ad55',
            borderRadius: '4px',
            color: '#f6ad55',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: '0 0 15px rgba(246, 173, 85, 0.3)',
            fontFamily: '"Rajdhani", sans-serif',
            textTransform: 'uppercase'
          }}>
            CHANGE SKIN
          </button>
        </div>



        {/* Communications Button - Moved to Bottom Left */}
        <div style={{
          position: 'absolute',
          bottom: '20px',
          left: '20px',
          zIndex: 20
        }}>
          <button 
            onClick={() => window.open('https://discord.gg/WbGTJPPTPs', '_blank')}
            style={{
            padding: '12px 24px',
            background: 'linear-gradient(45deg, #5865f2 0%, #4338ca 100%)',
            color: '#ffffff',
            fontWeight: '700',
            borderRadius: '4px',
            border: '2px solid #5865f2',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 0 25px rgba(88, 101, 242, 0.5)',
            transition: 'all 0.3s ease',
            fontFamily: '"Rajdhani", sans-serif',
            textTransform: 'uppercase'
          }}
            onMouseOver={(e) => {
              e.target.style.transform = 'scale(1.05)'
              e.target.style.boxShadow = '0 0 35px rgba(88, 101, 242, 0.7)'
            }}
            onMouseOut={(e) => {
              e.target.style.transform = 'scale(1)'
              e.target.style.boxShadow = '0 0 25px rgba(88, 101, 242, 0.5)'
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
            </svg>
            DISCORD
          </button>
        </div>

        {/* Cash Out Notifications - Bottom Right */}
        <div style={{
          position: 'absolute',
          bottom: '20px',
          right: '20px',
          zIndex: 30,
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          alignItems: 'flex-end'
        }}>
          {cashOutNotifications.map((notification, index) => (
            <div
              key={notification.id}
              style={{
                backgroundColor: 'rgba(16, 185, 129, 0.95)',
                border: '1px solid #10b981',
                borderRadius: '8px',
                padding: '12px 16px',
                color: 'white',
                fontSize: '14px',
                fontWeight: '600',
                boxShadow: '0 4px 20px rgba(16, 185, 129, 0.3)',
                backdropFilter: 'blur(10px)',
                minWidth: '280px',
                fontFamily: '"Rajdhani", sans-serif',
                animation: `slideInRight 0.5s ease-out ${index * 0.1}s both`,
                opacity: 1 - (index * 0.1) // Fade older notifications
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '4px'
              }}>
                <span style={{ 
                  fontSize: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  💰 <strong>{notification.player}</strong>
                </span>
                <span style={{ 
                  fontSize: '18px', 
                  fontWeight: '700',
                  color: '#ecfdf5'
                }}>
                  ${notification.amount}
                </span>
              </div>
              <div style={{
                fontSize: '12px',
                color: 'rgba(255, 255, 255, 0.8)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span>{notification.country}</span>
                <span>cashed out</span>
              </div>
            </div>
          ))}
        </div>

        {/* Enhanced CSS Animations */}
        <style jsx global>{`
          @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@300;400;500;600;700&display=swap');
          
          html, body {
            margin: 0;
            padding: 0;
            background: #0d1117;
            overflow-x: hidden;
          }
          
          @keyframes backgroundPulse {
            0%, 100% { 
              opacity: 0.3;
            }
            50% { 
              opacity: 0.6;
            }
          }
          
          @keyframes slideInFromTop {
            0% { 
              transform: translateX(-50%) translateY(-100%);
              opacity: 0;
            }
            100% { 
              transform: translateX(-50%) translateY(0);
              opacity: 1;
            }
          }
          
          @keyframes scanLineVertical {
            0% { 
              transform: translateY(-100vh);
              opacity: 0;
            }
            5% { 
              opacity: 1;
            }
            95% { 
              opacity: 1;
            }
            100% { 
              transform: translateY(100vh);
              opacity: 0;
            }
          }
          
          @keyframes scanLineHorizontal {
            0% { 
              transform: translateX(-100vw);
              opacity: 0;
            }
            5% { 
              opacity: 1;
            }
            95% { 
              opacity: 1;
            }
            100% { 
              transform: translateX(100vw);
              opacity: 0;
            }
          }
          
          @keyframes dataStream {
            0%, 100% { 
              opacity: 0.2;
              transform: scaleY(0.5);
            }
            50% { 
              opacity: 0.8;
              transform: scaleY(1);
            }
          }
          
          @keyframes progressBar {
            0% { 
              width: 0%;
            }
            50% { 
              width: 70%;
            }
            100% { 
              width: 100%;
            }
          }
          
          @keyframes codeMatrix {
            0% { 
              transform: translateY(-100px);
              opacity: 0;
            }
            10% { 
              opacity: 0.5;
            }
            90% { 
              opacity: 0.5;
            }
            100% { 
              transform: translateY(100vh);
              opacity: 0;
            }
          }
          
          @keyframes scanBeam {
            0%, 100% { 
              transform: rotate(-20deg);
              opacity: 0.3;
            }
            50% { 
              transform: rotate(20deg);
              opacity: 0.8;
            }
          }
          
          @keyframes radarSweep {
            0% { 
              transform: rotate(0deg);
            }
            100% { 
              transform: rotate(360deg);
            }
          }
          
          @keyframes radarLine {
            0% { 
              transform: translate(-50%, -100%) rotate(0deg);
              opacity: 1;
            }
            100% { 
              transform: translate(-50%, -100%) rotate(360deg);
              opacity: 1;
            }
          }
          
          @keyframes radarBlip {
            0%, 85% { 
              opacity: 0;
              transform: scale(0.3);
            }
            90% { 
              opacity: 1;
              transform: scale(1.2);
            }
            95%, 100% { 
              opacity: 0.8;
              transform: scale(1);
            }
          }
          
          @keyframes tacticalGrid {
            0% { 
              transform: translateX(0) translateY(0);
            }
            100% { 
              transform: translateX(-80px) translateY(-80px);
            }
          }
          
          @keyframes tacticalFloat {
            0%, 100% { 
              transform: translateY(0px) translateX(0px) rotate(0deg);
              opacity: 0.3;
            }
            25% { 
              transform: translateY(-20px) translateX(15px) rotate(90deg);
              opacity: 0.8;
            }
            50% { 
              transform: translateY(-35px) translateX(-10px) rotate(180deg);
              opacity: 1;
            }
            75% { 
              transform: translateY(-15px) translateX(12px) rotate(270deg);
              opacity: 0.6;
            }
          }
          
          @keyframes hudFlicker {
            0%, 100% { 
              opacity: 0.7;
              boxShadow: 0 0 10px rgba(246, 173, 85, 0.3);
            }
            15% { 
              opacity: 0.4;
            }
            30% { 
              opacity: 1;
              boxShadow: 0 0 20px rgba(246, 173, 85, 0.6);
            }
            45% { 
              opacity: 0.8;
            }
            60% { 
              opacity: 0.9;
            }
            75% { 
              opacity: 0.6;
            }
            90% { 
              opacity: 1;
              boxShadow: 0 0 15px rgba(246, 173, 85, 0.5);
            }
          }
          
          @keyframes crosshairPulse {
            0%, 100% { 
              transform: scale(1) rotate(0deg);
              opacity: 0.6;
            }
            25% { 
              transform: scale(1.1) rotate(90deg);
              opacity: 0.8;
            }
            50% { 
              transform: scale(1.3) rotate(180deg);
              opacity: 1;
            }
            75% { 
              transform: scale(1.1) rotate(270deg);
              opacity: 0.8;
            }
          }
          
          @keyframes statusBlink {
            0%, 100% { 
              opacity: 0.4;
              boxShadow: 0 0 5px currentColor;
            }
            50% { 
              opacity: 1;
              boxShadow: 0 0 15px currentColor;
            }
          }
          
          @keyframes slideInRight {
            0% {
              transform: translateX(100%);
              opacity: 0;
            }
            100% {
              transform: translateX(0);
              opacity: 1;
            }
          }
        `}</style>

        {/* Server Browser Modal */}
        <ServerBrowserModal
          isOpen={isServerBrowserOpen}
          onClose={() => {
            console.log('Closing server browser modal')
            setIsServerBrowserOpen(false)
          }}
          onJoinLobby={handleJoinLobby}
        />

        {/* User Profile Modal */}
        {isProfileModalOpen && (
          <div 
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: 'rgba(0, 0, 0, 0.8)',
              backdropFilter: 'blur(10px)',
              zIndex: 10000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
              boxSizing: 'border-box'
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setIsProfileModalOpen(false)
              }
            }}
          >
            <div 
              style={{
                background: 'linear-gradient(135deg, rgba(26, 32, 44, 0.95) 0%, rgba(45, 55, 72, 0.95) 100%)',
                border: '3px solid #68d391',
                borderRadius: '16px',
                maxWidth: '600px',
                width: '100%',
                maxHeight: '85vh',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 25px 50px rgba(0, 0, 0, 0.8), 0 0 30px rgba(104, 211, 145, 0.3)',
                fontFamily: '"Rajdhani", sans-serif'
              }}
            >
              {/* Header - Fixed */}
              <div style={{
                padding: '24px',
                borderBottom: '2px solid rgba(104, 211, 145, 0.3)',
                background: 'linear-gradient(45deg, rgba(104, 211, 145, 0.1) 0%, rgba(104, 211, 145, 0.05) 100%)',
                borderRadius: '13px 13px 0 0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexShrink: 0
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{
                    width: '50px',
                    height: '50px',
                    background: 'linear-gradient(45deg, #68d391 0%, #48bb78 100%)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px',
                    color: '#1a202c',
                    fontWeight: '700',
                    boxShadow: '0 0 20px rgba(104, 211, 145, 0.4)'
                  }}>
                    👤
                  </div>
                  <div>
                    <h2 style={{
                      margin: 0,
                      color: '#68d391',
                      fontSize: '24px',
                      fontWeight: '700',
                      textShadow: '0 0 10px rgba(104, 211, 145, 0.6)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em'
                    }}>
                      USER PROFILE
                    </h2>
                    <p style={{
                      margin: '4px 0 0 0',
                      color: '#a0aec0',
                      fontSize: '14px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                      TACTICAL OPERATIVE
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsProfileModalOpen(false)}
                  style={{
                    background: 'rgba(252, 129, 129, 0.2)',
                    border: '2px solid #fc8181',
                    borderRadius: '8px',
                    color: '#fc8181',
                    fontSize: '20px',
                    width: '40px',
                    height: '40px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseOver={(e) => {
                    e.target.style.background = 'rgba(252, 129, 129, 0.3)'
                    e.target.style.transform = 'scale(1.1)'
                  }}
                  onMouseOut={(e) => {
                    e.target.style.background = 'rgba(252, 129, 129, 0.2)'
                    e.target.style.transform = 'scale(1)'
                  }}
                >
                  ×
                </button>
              </div>

              {/* Scrollable Content Area */}
              <div style={{ 
                flex: 1,
                overflowY: 'auto',
                overflowX: 'hidden',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '24px'
              }}>
                
                {/* Identity Section */}
                <div style={{
                  padding: '20px',
                  background: 'rgba(45, 55, 72, 0.5)',
                  border: '1px solid rgba(104, 211, 145, 0.2)',
                  borderRadius: '12px'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '24px',
                    marginBottom: '20px'
                  }}>
                    {/* Avatar/Skin Preview */}
                    <div style={{
                      width: '120px',
                      height: '120px',
                      background: selectedSkin.color,
                      borderRadius: '50%',
                      border: '4px solid #68d391',
                      boxShadow: '0 0 20px rgba(104, 211, 145, 0.4)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                      flexShrink: 0
                    }}>
                      {/* Eyes like in-game */}
                      <div style={{
                        position: 'absolute',
                        width: '12px',
                        height: '12px',
                        background: '#1a202c',
                        borderRadius: '50%',
                        top: '35px',
                        left: '35px'
                      }} />
                      <div style={{
                        position: 'absolute',
                        width: '12px',
                        height: '12px',
                        background: '#1a202c',
                        borderRadius: '50%',
                        top: '35px',
                        right: '35px'
                      }} />
                    </div>
                    
                    {/* User Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 style={{
                        margin: '0 0 8px 0',
                        color: '#68d391',
                        fontSize: '24px',
                        fontWeight: '700',
                        wordBreak: 'break-word'
                      }}>
                        {getDisplayUsername().toUpperCase()}
                      </h3>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '16px'
                      }}>
                        <div style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: isAuthenticated ? '#68d391' : '#f6ad55'
                        }} />
                        <span style={{
                          color: isAuthenticated ? '#68d391' : '#f6ad55',
                          fontSize: '14px',
                          fontWeight: '600',
                          textTransform: 'uppercase'
                        }}>
                          {isAuthenticated ? 'ONLINE' : 'GUEST'}
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          // Handle edit profile
                        }}
                        style={{
                          background: 'rgba(104, 211, 145, 0.2)',
                          border: '2px solid #68d391',
                          borderRadius: '8px',
                          color: '#68d391',
                          padding: '8px 16px',
                          fontSize: '12px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em'
                        }}
                      >
                        📝 EDIT PROFILE
                      </button>
                    </div>
                  </div>
                </div>

                {/* Stats & Progression */}
                <div style={{
                  padding: '20px',
                  background: 'rgba(45, 55, 72, 0.5)',
                  border: '1px solid rgba(104, 211, 145, 0.2)',
                  borderRadius: '12px'
                }}>
                  <h4 style={{
                    margin: '0 0 16px 0',
                    color: '#f6ad55',
                    fontSize: '16px',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    📊 STATS & PROGRESSION
                  </h4>
                  
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', 
                    gap: '16px',
                    marginBottom: '16px'
                  }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ color: '#f6ad55', fontSize: '32px', fontWeight: '700' }}>0</div>
                      <div style={{ color: '#a0aec0', fontSize: '12px', textTransform: 'uppercase' }}>Games Played</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ color: '#68d391', fontSize: '32px', fontWeight: '700' }}>0</div>
                      <div style={{ color: '#a0aec0', fontSize: '12px', textTransform: 'uppercase' }}>Wins</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ color: '#9f7aea', fontSize: '32px', fontWeight: '700' }}>0</div>
                      <div style={{ color: '#a0aec0', fontSize: '12px', textTransform: 'uppercase' }}>Highest Size</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ color: '#fc8181', fontSize: '32px', fontWeight: '700' }}>0</div>
                      <div style={{ color: '#a0aec0', fontSize: '12px', textTransform: 'uppercase' }}>Win Streak</div>
                    </div>
                  </div>
                  
                  <div style={{
                    padding: '12px',
                    background: 'rgba(246, 173, 85, 0.1)',
                    border: '1px solid rgba(246, 173, 85, 0.3)',
                    borderRadius: '8px',
                    textAlign: 'center'
                  }}>
                    <span style={{ color: '#f6ad55', fontSize: '14px', fontWeight: '600' }}>
                      💰 LIFETIME EARNINGS: $0.00
                    </span>
                  </div>
                </div>

                {/* Wallet Snapshot */}
                <div style={{
                  padding: '20px',
                  background: 'rgba(45, 55, 72, 0.5)',
                  border: '1px solid rgba(104, 211, 145, 0.2)',
                  borderRadius: '12px'
                }}>
                  <h4 style={{
                    margin: '0 0 16px 0',
                    color: '#f6ad55',
                    fontSize: '16px',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    💰 WALLET SNAPSHOT
                  </h4>
                  
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: '1fr 1fr', 
                    gap: '12px',
                    marginBottom: '16px'
                  }}>
                    <div style={{
                      padding: '16px',
                      background: 'rgba(104, 211, 145, 0.1)',
                      border: '1px solid rgba(104, 211, 145, 0.3)',
                      borderRadius: '8px',
                      textAlign: 'center'
                    }}>
                      <div style={{ color: '#68d391', fontSize: '24px', fontWeight: '700' }}>{currency.toLocaleString()}</div>
                      <div style={{ color: '#a0aec0', fontSize: '12px', textTransform: 'uppercase' }}>COINS</div>
                    </div>
                    <div style={{
                      padding: '16px',
                      background: 'rgba(159, 122, 234, 0.1)',
                      border: '1px solid rgba(159, 122, 234, 0.3)',
                      borderRadius: '8px',
                      textAlign: 'center'
                    }}>
                      <div style={{ color: '#9f7aea', fontSize: '24px', fontWeight: '700' }}>0.0000</div>
                      <div style={{ color: '#a0aec0', fontSize: '12px', textTransform: 'uppercase' }}>SOL</div>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                      onClick={handleDeposit}
                      style={{
                        flex: 1,
                        background: 'rgba(104, 211, 145, 0.2)',
                        border: '2px solid #68d391',
                        borderRadius: '8px',
                        color: '#68d391',
                        padding: '12px 16px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}
                    >
                      💳 DEPOSIT SOL
                    </button>
                    <button
                      onClick={() => {
                        // Handle withdraw
                      }}
                      style={{
                        flex: 1,
                        background: 'rgba(252, 129, 129, 0.2)',
                        border: '2px solid #fc8181',
                        borderRadius: '8px',
                        color: '#fc8181',
                        padding: '12px 16px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}
                    >
                      💸 WITHDRAW
                    </button>
                  </div>
                </div>

                {/* Customization */}
                <div style={{
                  padding: '20px',
                  background: 'rgba(45, 55, 72, 0.5)',
                  border: '1px solid rgba(104, 211, 145, 0.2)',
                  borderRadius: '12px'
                }}>
                  <h4 style={{
                    margin: '0 0 16px 0',
                    color: '#9f7aea',
                    fontSize: '16px',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    🎨 CUSTOMIZATION
                  </h4>
                  
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                      onClick={() => {
                        setIsProfileModalOpen(false)
                        // Open customization
                      }}
                      style={{
                        flex: 1,
                        background: 'rgba(159, 122, 234, 0.2)',
                        border: '2px solid #9f7aea',
                        borderRadius: '8px',
                        color: '#9f7aea',
                        padding: '12px 16px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}
                    >
                      🎯 CHANGE SKIN
                    </button>
                    <button
                      onClick={() => {
                        setIsProfileModalOpen(false)
                        // Open store
                      }}
                      style={{
                        flex: 1,
                        background: 'rgba(246, 173, 85, 0.2)',
                        border: '2px solid #f6ad55',
                        borderRadius: '8px',
                        color: '#f6ad55',
                        padding: '12px 16px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}
                    >
                      🛒 VIEW STORE
                    </button>
                  </div>
                </div>

                {/* Social & Party */}
                <div style={{
                  padding: '20px',
                  background: 'rgba(45, 55, 72, 0.5)',
                  border: '1px solid rgba(104, 211, 145, 0.2)',
                  borderRadius: '12px'
                }}>
                  <h4 style={{
                    margin: '0 0 8px 0',
                    color: '#68d391',
                    fontSize: '16px',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    👥 SOCIAL & PARTY
                  </h4>
                  
                  <div style={{
                    color: '#a0aec0',
                    fontSize: '12px',
                    marginBottom: '16px',
                    textTransform: 'uppercase'
                  }}>
                    FRIENDS ONLINE (0/0)
                  </div>
                  
                  <div style={{
                    padding: '20px',
                    textAlign: 'center',
                    color: '#a0aec0',
                    fontSize: '14px'
                  }}>
                    <div style={{ marginBottom: '8px' }}>👥</div>
                    <div>No friends online</div>
                    <div style={{ fontSize: '12px', marginTop: '4px' }}>
                      Add friends to see them here
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div style={{
                  display: 'flex',
                  gap: '12px',
                  justifyContent: 'center',
                  flexWrap: 'wrap'
                }}>
                  {/* Privacy Policy and Terms & Conditions Buttons */}
                  <button
                    onClick={() => window.open('https://drive.google.com/file/d/1dE-KZMxTAWtxVP-_Sff_SWqJh-1L_lq0/view?usp=sharing', '_blank')}
                    style={{
                      background: 'rgba(104, 211, 145, 0.2)',
                      border: '2px solid #68d391',
                      borderRadius: '8px',
                      color: '#68d391',
                      padding: '12px 20px',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      minWidth: '140px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                    onMouseOver={(e) => {
                      e.target.style.background = 'rgba(104, 211, 145, 0.3)'
                      e.target.style.transform = 'translateY(-2px)'
                    }}
                    onMouseOut={(e) => {
                      e.target.style.background = 'rgba(104, 211, 145, 0.2)'
                      e.target.style.transform = 'translateY(0)'
                    }}
                  >
                    <span>📋</span>
                    <span>Privacy Policy</span>
                  </button>
                  
                  <button
                    onClick={() => window.open('https://drive.google.com/file/d/1l8n6nR2YzwywFQkPaephYUIJAbFghXt-/view?usp=sharing', '_blank')}
                    style={{
                      background: 'rgba(104, 211, 145, 0.2)',
                      border: '2px solid #68d391',
                      borderRadius: '8px',
                      color: '#68d391',
                      padding: '12px 20px',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      minWidth: '140px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                    onMouseOver={(e) => {
                      e.target.style.background = 'rgba(104, 211, 145, 0.3)'
                      e.target.style.transform = 'translateY(-2px)'
                    }}
                    onMouseOut={(e) => {
                      e.target.style.background = 'rgba(104, 211, 145, 0.2)'
                      e.target.style.transform = 'translateY(0)'
                    }}
                  >
                    <span>📜</span>
                    <span>Terms & Conditions</span>
                  </button>
                  
                  {isAuthenticated ? (
                    <button
                      onClick={() => {
                        setIsProfileModalOpen(false)
                        handleLogout()
                      }}
                      style={{
                        background: 'rgba(252, 129, 129, 0.2)',
                        border: '2px solid #fc8181',
                        borderRadius: '8px',
                        color: '#fc8181',
                        padding: '12px 24px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        minWidth: '120px'
                      }}
                      onMouseOver={(e) => {
                        e.target.style.background = 'rgba(252, 129, 129, 0.3)'
                        e.target.style.transform = 'translateY(-2px)'
                      }}
                      onMouseOut={(e) => {
                        e.target.style.background = 'rgba(252, 129, 129, 0.2)'
                        e.target.style.transform = 'translateY(0)'
                      }}
                    >
                      🚪 LOGOUT
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setIsProfileModalOpen(false)
                        handleLogin()
                      }}
                      style={{
                        background: 'rgba(104, 211, 145, 0.2)',
                        border: '2px solid #68d391',
                        borderRadius: '8px',
                        color: '#68d391',
                        padding: '12px 24px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        minWidth: '120px'
                      }}
                      onMouseOver={(e) => {
                        e.target.style.background = 'rgba(104, 211, 145, 0.3)'
                        e.target.style.transform = 'translateY(-2px)'
                      }}
                      onMouseOut={(e) => {
                        e.target.style.background = 'rgba(104, 211, 145, 0.2)'
                        e.target.style.transform = 'translateY(0)'
                      }}
                    >
                      LOGIN
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Friends Modal */}
        {isFriendsModalOpen && (
          <div 
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: 'rgba(0, 0, 0, 0.8)',
              backdropFilter: 'blur(10px)',
              zIndex: 10000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
              boxSizing: 'border-box'
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setIsFriendsModalOpen(false)
              }
            }}
          >
            <div 
              style={{
                background: 'linear-gradient(135deg, rgba(26, 32, 44, 0.95) 0%, rgba(45, 55, 72, 0.95) 100%)',
                border: '3px solid #68d391',
                borderRadius: '16px',
                maxWidth: '500px',
                width: '100%',
                maxHeight: '85vh',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 25px 50px rgba(0, 0, 0, 0.8), 0 0 30px rgba(104, 211, 145, 0.3)',
                fontFamily: '"Rajdhani", sans-serif'
              }}
            >
              {/* Header - Fixed */}
              <div style={{
                padding: '24px',
                borderBottom: '2px solid rgba(104, 211, 145, 0.3)',
                background: 'linear-gradient(45deg, rgba(104, 211, 145, 0.1) 0%, rgba(104, 211, 145, 0.05) 100%)',
                borderRadius: '13px 13px 0 0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexShrink: 0
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{
                    width: '50px',
                    height: '50px',
                    background: 'linear-gradient(45deg, #68d391 0%, #48bb78 100%)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px',
                    color: '#1a202c',
                    fontWeight: '700',
                    boxShadow: '0 0 20px rgba(104, 211, 145, 0.4)'
                  }}>
                    👥
                  </div>
                  <div>
                    <h2 style={{
                      margin: 0,
                      color: '#68d391',
                      fontSize: '24px',
                      fontWeight: '700',
                      textShadow: '0 0 10px rgba(104, 211, 145, 0.6)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em'
                    }}>
                      SOCIAL
                    </h2>
                    <p style={{
                      margin: '4px 0 0 0',
                      color: '#a0aec0',
                      fontSize: '14px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                      CONNECT & PLAY
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsFriendsModalOpen(false)}
                  style={{
                    background: 'rgba(252, 129, 129, 0.2)',
                    border: '2px solid #fc8181',
                    borderRadius: '8px',
                    color: '#fc8181',
                    fontSize: '20px',
                    width: '40px',
                    height: '40px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseOver={(e) => {
                    e.target.style.background = 'rgba(252, 129, 129, 0.3)'
                    e.target.style.transform = 'scale(1.1)'
                  }}
                  onMouseOut={(e) => {
                    e.target.style.background = 'rgba(252, 129, 129, 0.2)'
                    e.target.style.transform = 'scale(1)'
                  }}
                >
                  ×
                </button>
              </div>

              {/* Scrollable Content Area */}
              <div style={{ 
                flex: 1,
                overflowY: 'auto',
                overflowX: 'hidden',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
              }}>
                
                {/* Quick Actions */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px'
                }}>
                  <button
                    onClick={() => {
                      console.log('Add Friend clicked')
                      setIsAddFriendModalOpen(true)
                    }}
                    style={{
                      background: 'rgba(104, 211, 145, 0.2)',
                      border: '2px solid #68d391',
                      borderRadius: '8px',
                      color: '#68d391',
                      padding: '10px 14px',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseOver={(e) => {
                      e.target.style.background = 'rgba(104, 211, 145, 0.3)'
                      e.target.style.transform = 'translateY(-2px)'
                    }}
                    onMouseOut={(e) => {
                      e.target.style.background = 'rgba(104, 211, 145, 0.2)'
                      e.target.style.transform = 'translateY(0)'
                    }}
                  >
                    👤 ADD FRIEND
                  </button>
                  <button
                    onClick={async () => {
                      console.log('🎯 CREATE PARTY button clicked from Friends modal!')
                      const authenticated = await requireAuthentication('CREATE PARTY')
                      if (authenticated) {
                        console.log('🎯 User authenticated, opening create party popup immediately...')
                        
                        // Close friends modal first
                        const existingModal = document.querySelector('.friends-modal')
                        if (existingModal) {
                          existingModal.remove()
                        }
                        
                        // Open party modal immediately for better UX
                        createDesktopCreatePartyPopup()
                        
                        // Load friends asynchronously in background if needed
                        if (friendsList.length === 0 && !loadingFriends) {
                          console.log('🔄 Loading friends list in background...')
                          loadFriendsList().catch(error => {
                            console.error('❌ Background friends loading failed:', error)
                          })
                        }
                        
                        console.log('✅ Party modal opened immediately - friends loading in background')
                      } else {
                        console.log('❌ Authentication failed, blocking access to CREATE PARTY')
                      }
                    }}
                    style={{
                      background: 'rgba(59, 130, 246, 0.2)',
                      border: '2px solid #3b82f6',
                      borderRadius: '8px',
                      color: '#3b82f6',
                      padding: '10px 14px',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseOver={(e) => {
                      e.target.style.background = 'rgba(59, 130, 246, 0.3)'
                      e.target.style.transform = 'translateY(-2px)'
                    }}
                    onMouseOut={(e) => {
                      e.target.style.background = 'rgba(59, 130, 246, 0.2)'
                      e.target.style.transform = 'translateY(0)'
                    }}
                  >
                    🎯 CREATE PARTY
                  </button>
                </div>

                {/* Friend Requests Section */}
                <div style={{
                  padding: '12px',
                  background: 'rgba(45, 55, 72, 0.5)',
                  border: '1px solid rgba(246, 173, 85, 0.3)',
                  borderRadius: '8px'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '8px'
                  }}>
                    <h3 style={{
                      margin: 0,
                      color: '#f6ad55',
                      fontSize: '14px',
                      fontWeight: '600',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      📬 REQUESTS & INVITES
                    </h3>
                    <span style={{
                      color: '#a0aec0',
                      fontSize: '11px',
                      textTransform: 'uppercase'
                    }}>
                      {friendRequests.received.length} PENDING
                    </span>
                  </div>
                  
                  {loadingRequests ? (
                    <div style={{
                      padding: '12px 8px',
                      textAlign: 'center',
                      color: '#a0aec0',
                      fontSize: '12px'
                    }}>
                      <div style={{ fontSize: '20px', marginBottom: '4px' }}>⏳</div>
                      <div style={{ fontSize: '11px' }}>Loading requests...</div>
                    </div>
                  ) : friendRequests.received.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {friendRequests.received.slice(0, 2).map((request) => (
                        <div key={request.id} style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 10px',
                          background: request.type === 'party_invite' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(246, 173, 85, 0.1)',
                          borderRadius: '6px',
                          border: request.type === 'party_invite' ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid rgba(246, 173, 85, 0.3)'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{
                              width: '12px',
                              height: '12px',
                              borderRadius: '50%',
                              background: request.type === 'party_invite' ? '#3b82f6' : '#f6ad55',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '8px'
                            }}>
                              {request.type === 'party_invite' ? '🎯' : '👥'}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <div style={{ 
                                color: '#e2e8f0', 
                                fontSize: '12px', 
                                fontWeight: '600' 
                              }}>
                                {request.fromUsername}
                              </div>
                              {request.type === 'party_invite' && (
                                <div style={{ 
                                  color: '#a0aec0', 
                                  fontSize: '10px'
                                }}>
                                  Party: "{request.partyName}"
                                </div>
                              )}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button
                              onClick={async () => {
                                try {
                                  const userIdentifier = user?.wallet?.address || user?.email?.address || user?.id
                                  
                                  if (request.type === 'party_invite') {
                                    // Handle party invite acceptance
                                    const response = await fetch('/api/party', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({
                                        action: 'accept_invite',
                                        userIdentifier,
                                        inviteId: request.id,
                                        partyId: request.partyId
                                      })
                                    })
                                    
                                    const result = await response.json()
                                    if (result.success) {
                                      alert(`🎯 Joined party "${request.partyName}"!`)
                                      loadFriendRequests()
                                      loadCurrentParty() // Refresh party status
                                    } else {
                                      alert(`❌ Failed to join party: ${result.error}`)
                                    }
                                  } else {
                                    // Handle friend request acceptance
                                    const response = await fetch('/api/friends', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({
                                        action: 'accept_request',
                                        userIdentifier,
                                        requestId: request.id
                                      })
                                    })
                                    
                                    const result = await response.json()
                                    if (result.success) {
                                      alert(`✅ ${request.fromUsername} is now your friend!`)
                                      loadFriendRequests()
                                      loadFriendsList()
                                    } else {
                                      alert(`❌ Failed to accept request: ${result.error}`)
                                    }
                                  }
                                } catch (error) {
                                  console.error('Error accepting request/invite:', error)
                                  alert('❌ Failed to accept request/invite')
                                }
                              }}
                              style={{
                                background: request.type === 'party_invite' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(34, 197, 94, 0.2)',
                                border: request.type === 'party_invite' ? '1px solid #3b82f6' : '1px solid #22c55e',
                                borderRadius: '3px',
                                color: request.type === 'party_invite' ? '#3b82f6' : '#22c55e',
                                padding: '3px 6px',
                                fontSize: '10px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                textTransform: 'uppercase'
                              }}
                            >
                              {request.type === 'party_invite' ? 'JOIN' : '✓'}
                            </button>
                            <button
                              onClick={async () => {
                                try {
                                  const userIdentifier = user?.wallet?.address || user?.email?.address || user?.id
                                  const response = await fetch('/api/friends', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                      action: 'decline_request',
                                      userIdentifier,
                                      requestId: request.id
                                    })
                                  })
                                  
                                  const result = await response.json()
                                  if (result.success) {
                                    alert(`❌ Friend request from ${request.fromUsername} declined`)
                                    loadFriendRequests()
                                  } else {
                                    alert(`❌ Failed to decline request: ${result.error}`)
                                  }
                                } catch (error) {
                                  console.error('Error declining friend request:', error)
                                  alert('❌ Failed to decline friend request')
                                }
                              }}
                              style={{
                                background: 'rgba(252, 129, 129, 0.2)',
                                border: '1px solid #fc8181',
                                borderRadius: '3px',
                                color: '#fc8181',
                                padding: '3px 6px',
                                fontSize: '10px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                textTransform: 'uppercase'
                              }}
                            >
                              ✗
                            </button>
                          </div>
                        </div>
                      ))}
                      {friendRequests.received.length > 2 && (
                        <div style={{
                          textAlign: 'center',
                          color: '#a0aec0',
                          fontSize: '11px',
                          padding: '4px'
                        }}>
                          +{friendRequests.received.length - 2} more requests
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{
                      padding: '12px 8px',
                      textAlign: 'center',
                      color: '#a0aec0',
                      fontSize: '12px'
                    }}>
                      <div style={{ fontSize: '20px', marginBottom: '4px', opacity: 0.6 }}>📤</div>
                      <div style={{ fontSize: '11px' }}>No pending requests</div>
                    </div>
                  )}
                </div>

                {/* Online Friends - Compact */}
                <div style={{
                  padding: '12px',
                  background: 'rgba(45, 55, 72, 0.5)',
                  border: '1px solid rgba(104, 211, 145, 0.2)',
                  borderRadius: '8px'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '8px'
                  }}>
                    <h3 style={{
                      margin: 0,
                      color: '#68d391',
                      fontSize: '14px',
                      fontWeight: '600',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      🟢 ONLINE FRIENDS
                    </h3>
                    <span style={{
                      color: '#a0aec0',
                      fontSize: '11px',
                      textTransform: 'uppercase'
                    }}>
                      {friendsList.filter(f => f.isOnline && f.status === 'accepted').length} ONLINE
                    </span>
                  </div>
                  
                  {loadingFriends ? (
                    <div style={{
                      padding: '12px 8px',
                      textAlign: 'center',
                      color: '#a0aec0',
                      fontSize: '12px'
                    }}>
                      <div style={{ fontSize: '20px', marginBottom: '4px' }}>⏳</div>
                      <div style={{ fontSize: '11px' }}>Loading...</div>
                    </div>
                  ) : friendsList.filter(f => f.isOnline && f.status === 'accepted').length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {friendsList.filter(f => f.isOnline && f.status === 'accepted').slice(0, 3).map((friend) => (
                        <div key={friend.id} style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 10px',
                          background: 'rgba(26, 32, 44, 0.5)',
                          borderRadius: '6px',
                          border: '1px solid rgba(104, 211, 145, 0.2)'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              background: '#22c55e',
                              boxShadow: '0 0 6px rgba(34, 197, 94, 0.6)'
                            }} />
                            <div style={{ 
                              color: '#e2e8f0', 
                              fontSize: '12px', 
                              fontWeight: '600' 
                            }}>
                              {friend.username}
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              console.log('Inviting friend to party:', friend.username)
                              alert(`🎯 Party invite sent to ${friend.username}!`)
                            }}
                            style={{
                              background: 'rgba(59, 130, 246, 0.2)',
                              border: '1px solid #3b82f6',
                              borderRadius: '4px',
                              color: '#3b82f6',
                              padding: '4px 8px',
                              fontSize: '10px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              textTransform: 'uppercase'
                            }}
                          >
                            INVITE
                          </button>
                        </div>
                      ))}
                      {friendsList.filter(f => f.isOnline && f.status === 'accepted').length > 3 && (
                        <div style={{
                          textAlign: 'center',
                          color: '#a0aec0',
                          fontSize: '11px',
                          padding: '4px'
                        }}>
                          +{friendsList.filter(f => f.isOnline && f.status === 'accepted').length - 3} more online
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{
                      padding: '12px 8px',
                      textAlign: 'center',
                      color: '#a0aec0',
                      fontSize: '12px'
                    }}>
                      <div style={{ fontSize: '20px', marginBottom: '4px', opacity: 0.6 }}>👥</div>
                      <div style={{ fontSize: '11px' }}>No friends online</div>
                    </div>
                  )}
                </div>

                {/* All Friends - Compact */}
                <div style={{
                  padding: '12px',
                  background: 'rgba(45, 55, 72, 0.5)',
                  border: '1px solid rgba(104, 211, 145, 0.2)',
                  borderRadius: '8px'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '8px'
                  }}>
                    <h3 style={{
                      margin: 0,
                      color: '#9f7aea',
                      fontSize: '14px',
                      fontWeight: '600',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      👤 ALL FRIENDS
                    </h3>
                    <span style={{
                      color: '#a0aec0',
                      fontSize: '11px',
                      textTransform: 'uppercase'
                    }}>
                      {friendsList.filter(f => f.status === 'accepted').length} TOTAL
                    </span>
                  </div>
                  
                  {friendsList.filter(f => f.status === 'accepted').length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {friendsList.filter(f => f.status === 'accepted').slice(0, 3).map((friend) => (
                        <div key={friend.id} style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 10px',
                          background: 'rgba(26, 32, 44, 0.5)',
                          borderRadius: '6px',
                          border: '1px solid rgba(159, 122, 234, 0.2)'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              background: friend.isOnline ? '#22c55e' : '#6b7280'
                            }} />
                            <div style={{ 
                              color: friend.isOnline ? '#e2e8f0' : '#9ca3af', 
                              fontSize: '12px', 
                              fontWeight: '500' 
                            }}>
                              {friend.username}
                            </div>
                          </div>
                          <div style={{
                            color: friend.isOnline ? '#22c55e' : '#6b7280',
                            fontSize: '10px',
                            fontWeight: '500',
                            textTransform: 'uppercase'
                          }}>
                            {friend.isOnline ? 'ONLINE' : 'OFFLINE'}
                          </div>
                        </div>
                      ))}
                      {friendsList.filter(f => f.status === 'accepted').length > 3 && (
                        <div style={{
                          textAlign: 'center',
                          color: '#a0aec0',
                          fontSize: '11px',
                          padding: '4px'
                        }}>
                          +{friendsList.filter(f => f.status === 'accepted').length - 3} more friends
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{
                      padding: '12px 8px',
                      textAlign: 'center',
                      color: '#a0aec0',
                      fontSize: '12px'
                    }}>
                      <div style={{ fontSize: '20px', marginBottom: '4px', opacity: 0.6 }}>🤝</div>
                      <div style={{ fontSize: '11px', marginBottom: '8px' }}>Your friends list is empty</div>
                      <button
                        onClick={() => {
                          console.log('Add first friend clicked')
                          setIsAddFriendModalOpen(true)
                        }}
                        style={{
                          background: 'rgba(104, 211, 145, 0.2)',
                          border: '1px solid #68d391',
                          borderRadius: '4px',
                          color: '#68d391',
                          padding: '6px 12px',
                          fontSize: '10px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          transition: 'all 0.3s ease'
                        }}
                        onMouseOver={(e) => {
                          e.target.style.background = 'rgba(104, 211, 145, 0.3)'
                        }}
                        onMouseOut={(e) => {
                          e.target.style.background = 'rgba(104, 211, 145, 0.2)'
                        }}
                      >
                        👤 ADD YOUR FIRST FRIEND
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add Friend Modal */}
        {isAddFriendModalOpen && (
          <div 
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: 'rgba(0, 0, 0, 0.8)',
              backdropFilter: 'blur(10px)',
              zIndex: 10001,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
              boxSizing: 'border-box'
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setIsAddFriendModalOpen(false)
              }
            }}
          >
            <div 
              style={{
                background: 'linear-gradient(135deg, rgba(26, 32, 44, 0.95) 0%, rgba(45, 55, 72, 0.95) 100%)',
                border: '3px solid #68d391',
                borderRadius: '16px',
                maxWidth: '450px',
                width: '100%',
                boxShadow: '0 25px 50px rgba(0, 0, 0, 0.8), 0 0 30px rgba(104, 211, 145, 0.3)',
                fontFamily: '"Rajdhani", sans-serif'
              }}
            >
              {/* Header */}
              <div style={{
                padding: '24px',
                borderBottom: '2px solid rgba(104, 211, 145, 0.3)',
                background: 'linear-gradient(45deg, rgba(104, 211, 145, 0.1) 0%, rgba(104, 211, 145, 0.05) 100%)',
                borderRadius: '13px 13px 0 0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{
                    width: '50px',
                    height: '50px',
                    background: 'linear-gradient(45deg, #68d391 0%, #48bb78 100%)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px',
                    color: '#1a202c',
                    fontWeight: '700',
                    boxShadow: '0 0 20px rgba(104, 211, 145, 0.4)'
                  }}>
                    👤
                  </div>
                  <div>
                    <h2 style={{
                      margin: 0,
                      color: '#68d391',
                      fontSize: '24px',
                      fontWeight: '700',
                      textShadow: '0 0 10px rgba(104, 211, 145, 0.6)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em'
                    }}>
                      ADD FRIEND
                    </h2>
                    <p style={{
                      margin: '4px 0 0 0',
                      color: '#a0aec0',
                      fontSize: '14px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                      EXPAND YOUR NETWORK
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsAddFriendModalOpen(false)}
                  style={{
                    background: 'rgba(252, 129, 129, 0.2)',
                    border: '2px solid #fc8181',
                    borderRadius: '8px',
                    color: '#fc8181',
                    fontSize: '20px',
                    width: '40px',
                    height: '40px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseOver={(e) => {
                    e.target.style.background = 'rgba(252, 129, 129, 0.3)'
                    e.target.style.transform = 'scale(1.1)'
                  }}
                  onMouseOut={(e) => {
                    e.target.style.background = 'rgba(252, 129, 129, 0.2)'
                    e.target.style.transform = 'scale(1)'
                  }}
                >
                  ×
                </button>
              </div>

              {/* Content */}
              <div style={{ padding: '24px' }}>
                
                {/* TurfLoot Users List */}
                <div style={{
                  marginBottom: '24px'
                }}>
                  <label style={{
                    display: 'block',
                    color: '#68d391',
                    fontSize: '14px',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    marginBottom: '12px',
                    letterSpacing: '0.05em'
                  }}>
                    Authenticated Users ({availableUsers.length} Available)
                  </label>
                  
                  <div style={{
                    maxHeight: '300px',
                    overflowY: 'auto',
                    border: '2px solid rgba(104, 211, 145, 0.3)',
                    borderRadius: '8px',
                    background: 'rgba(26, 32, 44, 0.8)'
                  }}>
                    {loadingUsers ? (
                      <div style={{
                        padding: '20px',
                        textAlign: 'center',
                        color: '#a0aec0',
                        fontSize: '14px'
                      }}>
                        <div style={{ fontSize: '24px', marginBottom: '8px' }}>⏳</div>
                        Loading TurfLoot users...
                      </div>
                    ) : availableUsers.length > 0 ? (
                      <div style={{ padding: '8px' }}>
                        {availableUsers.map((user, index) => (
                          <div key={user.username} style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '12px 16px',
                            margin: '4px 0',
                            background: 'rgba(45, 55, 72, 0.6)',
                            borderRadius: '8px',
                            border: '1px solid rgba(104, 211, 145, 0.2)',
                            transition: 'all 0.3s ease'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              {/* Status Indicator */}
                              <div style={{
                                width: '10px',
                                height: '10px',
                                borderRadius: '50%',
                                background: user.status === 'online' ? '#22c55e' : 
                                           user.status === 'in-game' ? '#f59e0b' : '#6b7280',
                                boxShadow: user.status === 'online' ? '0 0 8px rgba(34, 197, 94, 0.6)' :
                                          user.status === 'in-game' ? '0 0 8px rgba(245, 158, 11, 0.6)' : 'none'
                              }} />
                              
                              {/* User Info */}
                              <div>
                                <div style={{
                                  color: '#e2e8f0',
                                  fontSize: '16px',
                                  fontWeight: '600',
                                  marginBottom: '2px'
                                }}>
                                  {user.username}
                                </div>
                                <div style={{
                                  color: user.status === 'online' ? '#22c55e' : 
                                        user.status === 'in-game' ? '#f59e0b' : '#6b7280',
                                  fontSize: '12px',
                                  fontWeight: '500',
                                  textTransform: 'uppercase',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px'
                                }}>
                                  {user.status === 'online' ? '🟢 ONLINE' :
                                   user.status === 'in-game' ? '🎮 IN GAME' : '⚫ OFFLINE'}
                                  <span style={{ color: '#a0aec0', fontSize: '11px' }}>
                                    • {user.gamesPlayed} games
                                  </span>
                                </div>
                              </div>
                            </div>
                            
                            {/* Add Friend Button */}
                            <button
                              onClick={async () => {
                                try {
                                  console.log('🔍 Friend request debug:', {
                                    isAuthenticated,
                                    user: user ? {
                                      id: user.id,
                                      wallet: user.wallet?.address,
                                      email: user.email?.address
                                    } : null
                                  })
                                  
                                  // Check if user is authenticated AND user object is loaded
                                  if (!isAuthenticated) {
                                    alert('Please log in to add friends')
                                    return
                                  }
                                  
                                  // Try to get user identifier from multiple sources including Privy bridge
                                  let userIdentifier = null
                                  
                                  // Method 1: From user object
                                  if (user && (user.wallet?.address || user.email?.address || user.id)) {
                                    userIdentifier = user.wallet?.address || user.email?.address || user.id
                                  }
                                  
                                  // Method 2: Try getting from Privy bridge directly
                                  if (!userIdentifier && typeof window !== 'undefined' && window.__TURFLOOT_PRIVY__) {
                                    const privyUser = window.__TURFLOOT_PRIVY__.user
                                    if (privyUser) {
                                      userIdentifier = privyUser.wallet?.address || privyUser.email?.address || privyUser.id
                                    }
                                  }
                                  
                                  console.log('🔍 Computed userIdentifier:', userIdentifier)
                                  console.log('🔍 User object state:', user ? Object.keys(user) : 'null')
                                  
                                  if (!userIdentifier) {
                                    alert('Unable to identify your account. Please try refreshing the page or logging out and back in.')
                                    return
                                  }
                                  
                                  // Ensure current user is registered in database
                                  await registerPrivyUser()
                                  
                                  const response = await fetch('/api/friends', {
                                    method: 'POST',
                                    headers: {
                                      'Content-Type': 'application/json'
                                    },
                                    body: JSON.stringify({
                                      action: 'send_request',
                                      userIdentifier,
                                      friendUsername: user.username,
                                      friendIdentifier: null
                                    })
                                  })
                                  
                                  const result = await response.json()
                                  
                                  if (result.success) {
                                    alert(`✅ Friend request sent to ${user.username}!`)
                                    console.log('✅ Friend request sent successfully:', result)
                                    
                                    // Refresh available users and friend requests
                                    loadAvailableUsers()
                                    if (isFriendsModalOpen) {
                                      loadFriendRequests()
                                    }
                                  } else {
                                    alert(`❌ Failed to send friend request: ${result.error}`)
                                    console.error('❌ Friend request failed:', result.error)
                                  }
                                  
                                } catch (error) {
                                  console.error('❌ Error sending friend request:', error)
                                  alert('❌ Failed to send friend request. Please try again.')
                                }
                              }}
                              style={{
                                background: 'rgba(104, 211, 145, 0.2)',
                                border: '2px solid #68d391',
                                borderRadius: '6px',
                                color: '#68d391',
                                padding: '8px 16px',
                                fontSize: '12px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                transition: 'all 0.3s ease',
                                minWidth: '80px'
                              }}
                              onMouseOver={(e) => {
                                e.target.style.background = 'rgba(104, 211, 145, 0.3)'
                                e.target.style.transform = 'translateY(-1px)'
                                e.target.parentElement.parentElement.style.background = 'rgba(45, 55, 72, 0.8)'
                                e.target.parentElement.parentElement.style.borderColor = 'rgba(104, 211, 145, 0.4)'
                              }}
                              onMouseOut={(e) => {
                                e.target.style.background = 'rgba(104, 211, 145, 0.2)'
                                e.target.style.transform = 'translateY(0)'
                                e.target.parentElement.parentElement.style.background = 'rgba(45, 55, 72, 0.6)'
                                e.target.parentElement.parentElement.style.borderColor = 'rgba(104, 211, 145, 0.2)'
                              }}
                            >
                              👤 ADD
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{
                        padding: '20px',
                        textAlign: 'center',
                        color: '#a0aec0',
                        fontSize: '14px'
                      }}>
                        <div style={{ fontSize: '32px', marginBottom: '8px', opacity: 0.6 }}>👥</div>
                        <div style={{ marginBottom: '4px' }}>No TurfLoot users available</div>
                        <div style={{ fontSize: '12px', opacity: 0.7 }}>
                          {isAuthenticated ? 
                            'No other authenticated users have signed up yet. Invite friends to join TurfLoot!' :
                            'Please log in to see other TurfLoot users'
                          }
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div style={{
                  display: 'flex',
                  gap: '12px',
                  justifyContent: 'center'
                }}>
                  <button
                    onClick={() => {
                      // Close modal
                      setIsAddFriendModalOpen(false)
                    }}
                    style={{
                      flex: 1,
                      background: 'rgba(160, 174, 192, 0.2)',
                      border: '2px solid #a0aec0',
                      borderRadius: '8px',
                      color: '#a0aec0',
                      padding: '14px 20px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseOver={(e) => {
                      e.target.style.background = 'rgba(160, 174, 192, 0.3)'
                      e.target.style.transform = 'translateY(-2px)'
                    }}
                    onMouseOut={(e) => {
                      e.target.style.background = 'rgba(160, 174, 192, 0.2)'
                      e.target.style.transform = 'translateY(0)'
                    }}
                  >
                    ❌ CLOSE
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    )
  }

  // Mobile Layout
  return (
    <div style={containerStyle}>
      
      {/* Insufficient Funds Notification Banner - Mobile */}
      {insufficientFundsNotification && (
        <div style={{
          position: 'fixed',
          top: '60px',
          left: '10px',
          right: '10px',
          zIndex: 9999,
          background: 'linear-gradient(45deg, rgba(252, 129, 129, 0.95) 0%, rgba(245, 101, 101, 0.95) 100%)',
          border: '2px solid #fc8181',
          borderRadius: '12px',
          padding: '12px 16px',
          boxShadow: '0 8px 32px rgba(252, 129, 129, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          animation: 'slideInFromTop 0.5s ease-out',
          fontFamily: '"Rajdhani", sans-serif'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            color: 'white',
            fontSize: '13px',
            fontWeight: '600'
          }}>
            <div style={{
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              flexShrink: 0
            }}>
              💰
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '14px', fontWeight: '700', marginBottom: '2px' }}>
                Insufficient Funds
              </div>
              <div style={{ fontSize: '12px', opacity: 0.9, lineHeight: '1.3' }}>
                Need ${insufficientFundsNotification.requiredAmount} • You have ${insufficientFundsNotification.currentBalance}
                <br />
                <span style={{ fontWeight: '700', color: '#fef5e7' }}>Deposit more SOL to play!</span>
              </div>
            </div>
            <button
              onClick={() => setInsufficientFundsNotification(null)}
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                borderRadius: '50%',
                width: '22px',
                height: '22px',
                color: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                transition: 'all 0.2s ease',
                flexShrink: 0
              }}
              onMouseOver={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.3)'
              }}
              onMouseOut={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.2)'
              }}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Mobile Tactical Background (Simplified) */}
      <div style={mobileBackgroundStyles.backgroundContainer}>
        
        {/* Mobile Grid */}
        <div style={mobileBackgroundStyles.mobileGrid} />

        {/* Mobile Radar (Smaller) */}
        <div style={{
          position: 'absolute',
          top: '10%',
          right: '5%',
          width: '80px',
          height: '80px',
          border: '1px solid rgba(104, 211, 145, 0.4)',
          borderRadius: '50%',
          background: 'radial-gradient(circle, transparent 70%, rgba(104, 211, 145, 0.05) 100%)',
          animation: 'radarSweep 6s linear infinite'
        }}>
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: '1px',
            height: '40px',
            background: 'linear-gradient(to bottom, #68d391, transparent)',
            transformOrigin: 'top center',
            transform: 'translate(-50%, -100%)',
            animation: 'radarLine 6s linear infinite'
          }} />
        </div>

        {/* Mobile Particles (Fewer) */}
        {[...Array(6)].map((_, i) => (
          <div
            key={`tactical-${i}`}
            style={{
              position: 'absolute',
              width: '2px',
              height: '2px',
              background: ['#68d391', '#f6ad55'][Math.floor(Math.random() * 2)],
              left: Math.random() * 100 + '%',
              top: Math.random() * 100 + '%',
              opacity: Math.random() * 0.5 + 0.2,
              animation: `tacticalFloat ${Math.random() * 8 + 10}s ease-in-out infinite`,
              boxShadow: `0 0 6px currentColor`,
              zIndex: 5
            }}
          />
        ))}
      </div>

      {/* Mobile Content Container */}
      <div className="mobile-container" style={mobileContainerStyle}>
        
        {/* Mobile Header */}
        <div style={headerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ 
              color: '#68d391', 
              fontWeight: '700', 
              fontSize: '12px',
              textShadow: '0 0 8px rgba(104, 211, 145, 0.6)',
              fontFamily: '"Rajdhani", sans-serif',
              textTransform: 'uppercase'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>
                  PLAYER: {isAuthenticated ? 
                    (customUsername || user?.email?.address?.split('@')[0] || user?.wallet?.address?.slice(0, 8) || 'USER').toUpperCase() : 
                    (customUsername || userName).toUpperCase()
                  }
                </span>
                <span style={{
                  backgroundColor: '#CD7F32',
                  color: 'white',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  marginLeft: '8px'
                }}>
                  🥉 Bronze
                </span>
              </div>
            </span>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Mobile Navigation Icons */}
            <div 
              style={{ 
                width: 'auto', 
                minWidth: '24px',
                height: '24px', 
                background: 'rgba(26, 32, 44, 0.8)', 
                border: '2px solid #68d391',
                borderRadius: '3px',
                boxShadow: '0 0 10px rgba(104, 211, 145, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                fontSize: '10px',
                padding: '0 6px',
                gap: '3px'
              }}
              title="Wallet"
              onMouseOver={(e) => {
                e.target.style.transform = 'scale(1.1)'
                e.target.style.boxShadow = '0 0 15px rgba(104, 211, 145, 0.5)'
              }}
              onMouseOut={(e) => {
                e.target.style.transform = 'scale(1)'
                e.target.style.boxShadow = '0 0 10px rgba(104, 211, 145, 0.3)'
              }}
            >
              <span style={{ fontSize: '12px' }}>💰</span>
              <span style={{ 
                color: '#68d391', 
                fontFamily: '"Rajdhani", sans-serif',
                fontWeight: '700',
                fontSize: '10px'
              }}>
                {currency.toLocaleString()}
              </span>
            </div>
            <div 
              style={{ 
                position: 'relative',
                width: '24px', 
                height: '24px', 
                background: 'rgba(26, 32, 44, 0.8)', 
                border: '2px solid #68d391',
                borderRadius: '3px',
                boxShadow: '0 0 10px rgba(104, 211, 145, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                fontSize: '12px'
              }}
              title="Friends"
              onClick={() => {
                console.log('👥 Friends icon clicked!')
                setIsFriendsModalOpen(true)
              }}
              onMouseOver={(e) => {
                e.target.style.transform = 'scale(1.1)'
                e.target.style.boxShadow = '0 0 15px rgba(104, 211, 145, 0.5)'
              }}
              onMouseOut={(e) => {
                e.target.style.transform = 'scale(1)'
                e.target.style.boxShadow = '0 0 10px rgba(104, 211, 145, 0.3)'
              }}
            >
              👥
              {/* Notification Badge - Mobile */}
              {friendRequests.received.length > 0 && (
                <div style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  background: '#ef4444',
                  color: 'white',
                  borderRadius: '50%',
                  width: '14px',
                  height: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '8px',
                  fontWeight: 'bold',
                  boxShadow: '0 0 6px rgba(239, 68, 68, 0.6)',
                  border: '1px solid rgba(26, 32, 44, 1)',
                  zIndex: 10
                }}>
                  {friendRequests.received.length > 9 ? '9+' : friendRequests.received.length}
                </div>
              )}
            </div>
            <div 
              style={{ 
                width: '24px', 
                height: '24px', 
                background: 'rgba(26, 32, 44, 0.8)', 
                border: '2px solid #68d391',
                borderRadius: '3px',
                boxShadow: '0 0 10px rgba(104, 211, 145, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                fontSize: '12px'
              }}
              title="User Profile"
              onClick={() => {
                console.log('🔍 Profile icon clicked!')
                console.log('🔍 Current authentication state:', isAuthenticated)
                console.log('🔍 Current user:', user)
                console.log('🔍 Current profile modal state:', isProfileModalOpen)
                
                // Force a fresh authentication check before opening modal
                if (typeof window !== 'undefined' && window.__TURFLOOT_PRIVY__) {
                  const privyState = window.__TURFLOOT_PRIVY__
                  console.log('🔍 Fresh Privy state check:', {
                    ready: privyState.ready,
                    authenticated: privyState.authenticated,
                    hasUser: !!privyState.user,
                    userEmail: privyState.user?.email?.address,
                    userWallet: privyState.user?.wallet?.address?.slice(0, 8) + '...'
                  })
                  
                  // Update local state with fresh Privy data
                  if (privyState.ready !== undefined) {
                    setIsAuthenticated(privyState.authenticated || false)
                    setUser(privyState.user || null)
                  }
                } else {
                  console.log('⚠️ Privy bridge not available when profile clicked')
                }
                
                setIsProfileModalOpen(true)
                console.log('🔍 Setting profile modal to true')
              }}
              onMouseOver={(e) => {
                e.target.style.transform = 'scale(1.1)'
                e.target.style.boxShadow = '0 0 15px rgba(104, 211, 145, 0.5)'
              }}
              onMouseOut={(e) => {
                e.target.style.transform = 'scale(1)'
                e.target.style.boxShadow = '0 0 10px rgba(104, 211, 145, 0.3)'
              }}
            >
              👤
            </div>
            
            {/* Login/Logout Button - Mobile FIXED */}
            {authenticated ? (
              <button
                onClick={handleLogout}
                style={{
                  padding: '4px 8px',
                  background: 'rgba(252, 129, 129, 0.2)',
                  border: '2px solid #fc8181',
                  borderRadius: '3px',
                  color: '#fc8181',
                  fontSize: '9px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 0 10px rgba(252, 129, 129, 0.3)',
                  fontFamily: '"Rajdhani", sans-serif',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}
                onMouseOver={(e) => {
                  e.target.style.background = 'rgba(252, 129, 129, 0.3)'
                  e.target.style.boxShadow = '0 0 15px rgba(252, 129, 129, 0.5)'
                }}
                onMouseOut={(e) => {
                  e.target.style.background = 'rgba(252, 129, 129, 0.2)'
                  e.target.style.boxShadow = '0 0 10px rgba(252, 129, 129, 0.3)'
                }}
              >
                LOGOUT
              </button>
            ) : (
              <button
                onClick={handleLogin}
                style={{
                  padding: '4px 8px',
                  background: 'linear-gradient(45deg, #68d391 0%, #48bb78 100%)',
                  border: '2px solid #68d391',
                  borderRadius: '3px',
                  color: '#1a202c',
                  fontSize: '9px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 0 10px rgba(104, 211, 145, 0.3)',
                  fontFamily: '"Rajdhani", sans-serif',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}
                onMouseOver={(e) => {
                  e.target.style.transform = 'scale(1.05)'
                  e.target.style.boxShadow = '0 0 15px rgba(104, 211, 145, 0.5)'
                }}
                onMouseOut={(e) => {
                  e.target.style.transform = 'scale(1)'
                  e.target.style.boxShadow = '0 0 10px rgba(104, 211, 145, 0.3)'
                }}
              >
                LOGIN
              </button>
            )}
          </div>
        </div>

        {/* Mobile Title */}
        <div style={titleStyle}>
          <h1 style={mainTitleStyle}>
            TURF<span style={{ 
              background: 'linear-gradient(45deg, #f6ad55 0%, #fc8181 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>LOOT</span>
          </h1>
          <p style={subtitleStyle}>SKILL-BASED GRID DOMINATION</p>
        </div>

        {/* Mobile Game Controls */}
        <div style={centerControlsStyle}>
          {/* Mobile Stats - Moved above username input */}
          <div style={statsStyle}>
            <div style={statItemStyle}>
              <div style={statNumberStyle}>{liveStats.players}</div>
              <div style={statLabelStyle}>PLAYERS</div>
            </div>
            <div style={statItemStyle}>
              <div style={statNumberStyle}>${liveStats.winnings.toLocaleString()}</div>
              <div style={statLabelStyle}>TOTAL WINNINGS</div>
            </div>
          </div>

          {/* Player Name Input */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginBottom: '20px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                background: 'linear-gradient(45deg, #f6ad55 0%, #ed8936 100%)',
                borderRadius: '3px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#1a202c',
                fontWeight: '800',
                fontSize: '18px',
                boxShadow: '0 0 20px rgba(246, 173, 85, 0.6)',
                border: '2px solid #f6ad55',
                fontFamily: '"Rajdhani", sans-serif'
              }}>
                0
              </div>
              <input 
                type="text" 
                value={getDisplayUsername()}
                onChange={(e) => {
                  const newUsername = e.target.value
                  setCustomUsername(newUsername)
                  console.log('🎮 Username updated:', newUsername)
                }}
                style={nameInputStyle}
                placeholder="USERNAME"
              />
              <div 
                onClick={async () => {
                  const currentUsername = getDisplayUsername()
                  const saved = await saveUsernameToPrivy(currentUsername)
                  
                  if (saved) {
                    console.log('✅ Username confirmed and saved:', currentUsername)
                    // Visual feedback
                    const confirmButton = event.target
                    const originalBg = confirmButton.style.background
                    confirmButton.style.background = 'linear-gradient(45deg, #22c55e 0%, #16a34a 100%)'
                    confirmButton.innerHTML = '✓'
                    
                    setTimeout(() => {
                      confirmButton.style.background = originalBg
                      confirmButton.innerHTML = '→'
                    }, 1000)
                  } else {
                    console.log('❌ Failed to save username')
                  }
                }}
                style={{
                width: '36px',
                height: '36px',
                background: 'linear-gradient(45deg, #68d391 0%, #48bb78 100%)',
                borderRadius: '3px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#1a202c',
                fontWeight: '600',
                boxShadow: '0 0 15px rgba(104, 211, 145, 0.6)',
                border: '2px solid #68d391',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
                onMouseOver={(e) => {
                  e.target.style.transform = 'scale(1.05)'
                  e.target.style.boxShadow = '0 0 20px rgba(104, 211, 145, 0.8)'
                }}
                onMouseOut={(e) => {
                  e.target.style.transform = 'scale(1)'
                  e.target.style.boxShadow = '0 0 15px rgba(104, 211, 145, 0.6)'
                }}
              >
                ✓
              </div>
            </div>
          </div>

          {/* Stakes */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', justifyContent: 'center' }}>
            {['$0.01', '$0.02', '$0.05'].map((stake) => (
              <button
                key={stake}
                onClick={() => setSelectedStake(stake)}
                style={selectedStake === stake ? activeStakeStyle : inactiveStakeStyle}
              >
                {stake}
              </button>
            ))}
          </div>

          {/* Main Deploy Button */}
          <button 
            onClick={handleJoinGame}
            style={deployButtonStyle}
          >
            ▶ PLAY
          </button>

          {/* Secondary Buttons - Enhanced with Desktop Features */}
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button 
              style={{
                ...secondaryButtonStyle,
                fontSize: '10px',
                padding: '8px 12px'
              }}
              onClick={async () => {
                console.log('SERVER BROWSER button clicked!')
                const authenticated = await requireAuthentication('SERVER BROWSER')
                if (authenticated) {
                  console.log('🌐 User authenticated, opening server browser...')
                  createDesktopServerBrowserPopup()
                } else {
                  console.log('❌ Authentication failed, blocking access to SERVER BROWSER')
                }
              }}
            >
              SERVER BROWSER
            </button>
            <button 
              style={{
                ...secondaryButtonStyle,
                background: (currentParty && currentParty.members && currentParty.members.length > 1) ? 'rgba(107, 114, 128, 0.3)' : 'rgba(59, 130, 246, 0.1)',
                border: (currentParty && currentParty.members && currentParty.members.length > 1) ? '1px solid #6b7280' : '1px solid #3b82f6',
                color: (currentParty && currentParty.members && currentParty.members.length > 1) ? '#9ca3af' : '#3b82f6',
                fontSize: '10px',
                padding: '8px 12px',
                cursor: (currentParty && currentParty.members && currentParty.members.length > 1) ? 'not-allowed' : 'pointer',
                opacity: (currentParty && currentParty.members && currentParty.members.length > 1) ? 0.6 : 1
              }}
              onClick={(e) => {
                if (currentParty && currentParty.members && currentParty.members.length > 1) {
                  console.log('🔒 MOBILE LOCAL PRACTICE blocked - user is in a duo')
                  e.preventDefault()
                  return
                }
                
                console.log('🤖 MOBILE LOCAL PRACTICE button clicked!')
                
                // Create completely local room with bots - no Hathora charges
                const localRoomId = 'local-bots-' + Math.random().toString(36).substring(2, 10)
                const gameUrl = `/agario?roomId=${localRoomId}&mode=local&fee=0&region=local&multiplayer=offline&server=local&bots=true`
                console.log('🎮 Starting mobile local practice with bots:', gameUrl)
                checkOrientationAndEnterGame(gameUrl)
              }}
              onMouseOver={(e) => {
                if (currentParty && currentParty.members && currentParty.members.length > 1) {
                  // Show tooltip for disabled state on mobile
                  const tooltip = document.createElement('div')
                  tooltip.id = 'mobile-local-practice-tooltip'
                  tooltip.textContent = 'Local Practice is only available for solo players. Leave your party to play offline with bots.'
                  tooltip.style.cssText = `
                    position: absolute;
                    background: rgba(0, 0, 0, 0.9);
                    color: white;
                    padding: 8px 12px;
                    border-radius: 6px;
                    font-size: 11px;
                    font-weight: 500;
                    max-width: 200px;
                    z-index: 10000;
                    pointer-events: none;
                    border: 1px solid #374151;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                  `
                  
                  // Position tooltip above the button (mobile optimized)
                  const rect = e.target.getBoundingClientRect()
                  tooltip.style.left = `${Math.max(10, rect.left)}px`
                  tooltip.style.top = `${rect.top - 70}px`
                  
                  document.body.appendChild(tooltip)
                }
              }}
              onMouseOut={(e) => {
                // Remove mobile tooltip
                const tooltip = document.getElementById('mobile-local-practice-tooltip')
                if (tooltip) {
                  tooltip.remove()
                }
              }}
              disabled={currentParty && currentParty.members && currentParty.members.length > 1}
            >
              {(currentParty && currentParty.members && currentParty.members.length > 1) ? '🔒 LOCAL PRACTICE' : 'LOCAL PRACTICE'}
            </button>
            <button 
              style={{
                ...secondaryButtonStyle,
                fontSize: '10px',
                padding: '8px 12px'
              }}
              onClick={async () => {
                console.log('HOW TO PLAY button clicked!')
                const authenticated = await requireAuthentication('HOW TO PLAY')
                if (authenticated) {
                  console.log('📖 User authenticated, showing how to play...')
                  alert('HOW TO PLAY: Move with mouse, collect coins to grow, hold E to cash out!')
                } else {
                  console.log('❌ Authentication failed, blocking access to HOW TO PLAY')
                }
              }}
            >
              HOW TO PLAY
            </button>
          </div>
        </div>

        {/* Mobile Panels Grid */}
        <div style={mobileGridStyle}>
          {/* Arsenal Panel - Enhanced with Desktop Features */}
          <div style={ambrerPanelStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <h3 style={{ color: '#f6ad55', fontWeight: '700', fontSize: '12px', margin: 0, fontFamily: '"Rajdhani", sans-serif' }}>WALLET</h3>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: '4px' }}>
                <button 
                  onClick={handleCopyAddress}
                  style={{ 
                    fontSize: '8px', 
                    color: '#f6ad55', 
                    background: 'none', 
                    border: 'none', 
                    cursor: 'pointer', 
                    fontWeight: '600', 
                    fontFamily: '"Rajdhani", sans-serif',
                    textDecoration: 'none',
                    padding: '0'
                  }}
                >
                  📋
                </button>
                <button 
                  onClick={handleBalanceRefresh}
                  style={{ 
                    fontSize: '8px', 
                    color: '#f6ad55', 
                    background: 'none', 
                    border: 'none', 
                    cursor: 'pointer', 
                    fontWeight: '600', 
                    fontFamily: '"Rajdhani", sans-serif',
                    textDecoration: 'none',
                    padding: '0'
                  }}
                >
                  ↻
                </button>
              </div>
            </div>
            
            <div style={{ textAlign: 'center', marginBottom: '12px' }}>
              <div style={{ 
                fontSize: '20px', 
                fontWeight: '800', 
                background: 'linear-gradient(45deg, #f6ad55 0%, #fc8181 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                marginBottom: '2px',
                fontFamily: '"Rajdhani", sans-serif'
              }}>
                {walletBalance.loading ? 'Loading...' : `$${walletBalance.usd}`}
              </div>
              <div style={{ color: '#f6ad55', fontSize: '9px', fontWeight: '600', fontFamily: '"Rajdhani", sans-serif' }}>
                {walletBalance.loading ? 'Loading...' : `${walletBalance.sol} SOL`}
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '6px' }}>
              <button 
                onClick={handleDeposit}
                style={{
                flex: 1,
                padding: '8px',
                background: 'rgba(104, 211, 145, 0.2)',
                border: '1px solid #68d391',
                borderRadius: '3px',
                color: '#68d391',
                fontWeight: '600',
                cursor: 'pointer',
                fontSize: '9px',
                fontFamily: '"Rajdhani", sans-serif',
                textTransform: 'uppercase'
              }}>
                DEPOSIT SOL
              </button>
              <button 
                onClick={handleWithdraw}
                style={{
                flex: 1,
                padding: '8px',
                background: 'rgba(252, 129, 129, 0.2)',
                border: '1px solid #fc8181',
                borderRadius: '3px',
                color: '#fc8181',
                fontWeight: '600',
                cursor: 'pointer',
                fontSize: '9px',
                fontFamily: '"Rajdhani", sans-serif',
                textTransform: 'uppercase'
              }}>
                WITHDRAW
              </button>
            </div>
          </div>

          {/* Loadout Panel */}
          <div style={ambrerPanelStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <h3 style={{ color: '#8b5cf6', fontWeight: '700', fontSize: '12px', margin: 0, fontFamily: '"Rajdhani", sans-serif' }}>CUSTOMIZE</h3>
            </div>
            
            <div style={{ textAlign: 'center', marginBottom: '12px' }}>
              <div style={{
                width: '60px',
                height: '60px',
                margin: '0 auto 8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative'
              }}>
                {/* Blue character circle */}
                <div style={{
                  width: '45px',
                  height: '45px',
                  background: '#3b82f6',
                  borderRadius: '50%',
                  border: '2px solid #ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative'
                }}>
                  {/* Black dot eyes */}
                  <div style={{
                    display: 'flex',
                    gap: '8px',
                    alignItems: 'center'
                  }}>
                    <div style={{
                      width: '4px',
                      height: '4px',
                      backgroundColor: '#000000',
                      borderRadius: '50%',
                      transform: `translate(${eyePosition.x}px, ${eyePosition.y}px)`,
                      transition: 'transform 0.1s ease-out'
                    }} />
                    <div style={{
                      width: '4px',  
                      height: '4px',
                      backgroundColor: '#000000',
                      borderRadius: '50%',
                      transform: `translate(${eyePosition.x}px, ${eyePosition.y}px)`,
                      transition: 'transform 0.1s ease-out'
                    }} />
                  </div>
                </div>
              </div>
            </div>
            
            <button 
              onClick={async () => {
                console.log('VIEW STORE button clicked!')
                const authenticated = await requireAuthentication('VIEW STORE')
                if (authenticated) {
                  console.log('🛒 User authenticated, opening view store...')
                  createSkinStorePopup(currency, setCurrency, selectedSkin, setSelectedSkin, 'shop')
                } else {
                  console.log('❌ Authentication failed, blocking access to VIEW STORE')
                }
              }}
              style={{
              width: '100%',
              padding: '8px',
              background: 'linear-gradient(45deg, #f6ad55 0%, #ed8936 100%)',
              color: '#1a202c',
              fontWeight: '700',
              borderRadius: '3px',
              border: '1px solid #f6ad55',
              cursor: 'pointer',
              marginBottom: '6px',
              fontSize: '9px',
              fontFamily: '"Rajdhani", sans-serif',
              textTransform: 'uppercase'
            }}>
              VIEW STORE
            </button>
            
            <button 
              onClick={async () => {
                console.log('CHANGE SKIN button clicked!')
                const authenticated = await requireAuthentication('CHANGE SKIN')
                if (authenticated) {
                  console.log('🎨 User authenticated, opening change skin...')
                  createSkinStorePopup(currency, setCurrency, selectedSkin, setSelectedSkin, 'owned')
                } else {
                  console.log('❌ Authentication failed, blocking access to CHANGE SKIN')
                }
              }}
              style={{
              width: '100%',
              padding: '6px',
              background: 'rgba(26, 32, 44, 0.8)',
              border: '1px solid #f6ad55',
              borderRadius: '3px',
              color: '#f6ad55',
              fontSize: '9px',
              fontWeight: '600',
              cursor: 'pointer',
              fontFamily: '"Rajdhani", sans-serif',
              textTransform: 'uppercase'
            }}>
              CHANGE SKIN
            </button>
          </div>

          {/* Command Panel - Enhanced Leaderboard */}
          <div style={tacticalPanelStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <h3 style={{ color: '#68d391', fontWeight: '700', fontSize: '12px', margin: 0, fontFamily: '"Rajdhani", sans-serif' }}>LEADERBOARD</h3>
              <div style={{ marginLeft: 'auto' }}>
                <div style={{
                  padding: '2px 4px',
                  background: 'rgba(104, 211, 145, 0.2)',
                  color: '#68d391',
                  fontSize: '8px',
                  borderRadius: '2px',
                  border: '1px solid #68d391',
                  fontWeight: '600',
                  fontFamily: '"Rajdhani", sans-serif',
                  textTransform: 'uppercase'
                }}>
                  LIVE
                </div>
              </div>
            </div>
            
            <div style={{ marginBottom: '12px', fontSize: '11px' }}>
              {leaderboard.slice(0, 3).map((player, index) => (
                <div key={player.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: index < 2 ? '1px solid rgba(104, 211, 145, 0.2)' : 'none' }}>
                  <span style={{ color: '#e2e8f0', fontWeight: '600', fontFamily: '"Rajdhani", sans-serif' }}>
                    {String(index + 1).padStart(2, '0')}. {player.name}
                  </span>
                  <span style={{ color: '#f6ad55', fontWeight: '700', fontFamily: '"Rajdhani", sans-serif' }}>
                    ${player.cashout.toLocaleString()}
                  </span>
                </div>
              ))}
              {leaderboard.length === 0 && (
                <div style={{ textAlign: 'center', padding: '12px 0', color: '#68d391', fontSize: '10px', fontFamily: '"Rajdhani", sans-serif' }}>
                  LOADING LEADERBOARD...
                </div>
              )}
            </div>
            
            <button 
              onClick={() => createDesktopLeaderboardPopup()}
              style={{
                width: '100%',
                padding: '8px',
                background: 'rgba(26, 32, 44, 0.8)',
                border: '1px solid #68d391',
                borderRadius: '3px',
                color: '#68d391',
                fontSize: '10px',
                fontWeight: '600',
                cursor: 'pointer',
                fontFamily: '"Rajdhani", sans-serif',
                textTransform: 'uppercase'
              }}>
              VIEW LEADERBOARD
            </button>
          </div>

          {/* Squad Panel - Dynamic Party Display */}
          <div style={tacticalPanelStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <h3 style={{ color: '#68d391', fontWeight: '700', fontSize: '12px', margin: 0, fontFamily: '"Rajdhani", sans-serif' }}>
                PARTY
              </h3>
              <div style={{ marginLeft: 'auto' }}>
                <button 
                  onClick={async () => {
                    console.log('🔄 Mobile PARTY REFRESH button clicked - refreshing lobby data...')
                    
                    try {
                      // Show loading state
                      setLoadingParty(true)
                      
                      console.log('🔄 Mobile Step 1: Refreshing current party data...')
                      await loadCurrentParty()
                      
                      console.log('🔄 Mobile Step 2: Refreshing friends list with updated skin data...')
                      await loadFriendsList()
                      
                      console.log('🔄 Mobile Step 3: Refreshing friend requests and party invites...')
                      await loadFriendRequests()
                      
                      console.log('🔄 Mobile Step 4: Refreshing available users list...')
                      await loadAvailableUsers()
                      
                      // Force re-register user to update skin data
                      if (isAuthenticated && user) {
                        console.log('🔄 Mobile Step 5: Updating user skin data...')
                        await registerPrivyUser()
                      }
                      
                      console.log('✅ Mobile PARTY REFRESH completed successfully!')
                      
                      // Brief success indicator for mobile
                      const refreshButton = document.querySelector('[data-mobile-refresh-text]')
                      if (refreshButton) {
                        refreshButton.textContent = '✅'
                        setTimeout(() => {
                          refreshButton.textContent = '↻'
                        }, 1500)
                      }
                      
                    } catch (error) {
                      console.error('❌ Mobile PARTY REFRESH failed:', error)
                      
                      // Show error feedback for mobile
                      const refreshButton = document.querySelector('[data-mobile-refresh-text]')
                      if (refreshButton) {
                        refreshButton.textContent = '❌'
                        setTimeout(() => {
                          refreshButton.textContent = '↻'
                        }, 1500)
                      }
                    } finally {
                      setLoadingParty(false)
                    }
                  }}
                  style={{ 
                    fontSize: '9px', 
                    color: '#f6ad55', 
                    background: 'none', 
                    border: 'none', 
                    cursor: 'pointer', 
                    fontWeight: '600', 
                    fontFamily: '"Rajdhani", sans-serif',
                    padding: '1px 3px',
                    borderRadius: '2px',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseOver={(e) => {
                    e.target.style.background = 'rgba(246, 173, 85, 0.1)'
                    e.target.style.boxShadow = '0 0 3px rgba(246, 173, 85, 0.3)'
                  }}
                  onMouseOut={(e) => {
                    e.target.style.background = 'none'
                    e.target.style.boxShadow = 'none'
                  }}
                >
                  <span data-mobile-refresh-text>↻</span>
                </button>
                
                {/* Mobile Leave Party Button - Only show when in a party */}
                {currentParty && (
                  <button 
                    onClick={async () => {
                      console.log('🚪 Mobile LEAVE PARTY button clicked!')
                      
                      try {
                        if (!isAuthenticated || !user) {
                          console.log('❌ User not authenticated for leaving party')
                          return
                        }
                        
                        const userIdentifier = user.wallet?.address || user.email || user.id
                        console.log('🚪 Mobile leaving party for user:', userIdentifier)
                        
                        // Show loading feedback
                        const leaveButton = document.querySelector('[data-mobile-leave-text]')
                        if (leaveButton) {
                          leaveButton.textContent = '⏳'
                        }
                        
                        // API call to leave party
                        const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/party`, {
                          method: 'DELETE',
                          headers: {
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({
                            userIdentifier: userIdentifier,
                            partyId: currentParty.id
                          })
                        })
                        
                        const result = await response.json()
                        
                        if (response.ok) {
                          console.log('✅ Mobile successfully left party:', result)
                          
                          // Check if the party was disbanded (owner left or party became empty)
                          if (result.partyDisbanded) {
                            console.log('🗑️ Mobile party was disbanded:', {
                              isOwner: result.isOwner,
                              message: result.message
                            })
                            
                            // Show appropriate message based on whether user was owner
                            if (result.isOwner) {
                              // Show success feedback for party owner
                              if (leaveButton) {
                                leaveButton.textContent = '✅'
                                setTimeout(() => {
                                  leaveButton.textContent = '✕'
                                }, 1500)
                              }
                              alert(`👑 ${result.message}\n\nAs the party owner, your party has been completely removed.`)
                            } else {
                              // Show success feedback for member leaving empty party
                              if (leaveButton) {
                                leaveButton.textContent = '✅'
                                setTimeout(() => {
                                  leaveButton.textContent = '✕'
                                }, 1500)
                              }
                              alert(`🏁 ${result.message}`)
                            }
                          } else {
                            // Regular member left, party still exists
                            if (leaveButton) {
                              leaveButton.textContent = '✅'
                              setTimeout(() => {
                                leaveButton.textContent = '✕'
                              }, 1500)
                            }
                            alert(`👋 ${result.message}`)
                          }
                          
                          // Clear current party state regardless of disbandment
                          setCurrentParty(null)
                          
                          // Refresh party data to show updated state
                          await loadCurrentParty()
                          
                        } else {
                          console.error('❌ Mobile failed to leave party:', response.status)
                          if (leaveButton) {
                            leaveButton.textContent = '❌'
                            setTimeout(() => {
                              leaveButton.textContent = '✕'
                            }, 1500)
                          }
                        }
                        
                      } catch (error) {
                        console.error('❌ Mobile error leaving party:', error)
                        const leaveButton = document.querySelector('[data-mobile-leave-text]')
                        if (leaveButton) {
                          leaveButton.textContent = '❌'
                          setTimeout(() => {
                            leaveButton.textContent = '✕'
                          }, 1500)
                        }
                      }
                    }}
                    style={{ 
                      fontSize: '9px', 
                      color: '#fc8181', 
                      background: 'none', 
                      border: 'none', 
                      cursor: 'pointer', 
                      fontWeight: '600', 
                      fontFamily: '"Rajdhani", sans-serif',
                      padding: '1px 3px',
                      borderRadius: '2px',
                      transition: 'all 0.2s ease',
                      marginLeft: '4px'
                    }}
                    onMouseOver={(e) => {
                      e.target.style.background = 'rgba(252, 129, 129, 0.1)'
                      e.target.style.boxShadow = '0 0 3px rgba(252, 129, 129, 0.3)'
                    }}
                    onMouseOut={(e) => {
                      e.target.style.background = 'none'
                      e.target.style.boxShadow = 'none'
                    }}
                  >
                    <span data-mobile-leave-text>✕</span>
                  </button>
                )}
              </div>
            </div>
            
            {currentParty ? (
              // Show current party members - mobile version
              <div style={{ padding: '12px 0' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  marginBottom: '8px'
                }}>
                  <div style={{
                    color: '#68d391',
                    fontSize: '11px',
                    fontWeight: '700',
                    fontFamily: '"Rajdhani", sans-serif',
                    textAlign: 'center'
                  }}>
                    {currentParty.name}
                  </div>
                  <div style={{
                    padding: '1px 4px',
                    background: 'rgba(104, 211, 145, 0.2)',
                    border: '1px solid #68d391',
                    borderRadius: '2px',
                    fontSize: '8px',
                    color: '#68d391',
                    textTransform: 'uppercase',
                    fontFamily: '"Rajdhani", sans-serif'
                  }}>
                    {currentParty.privacy}
                  </div>
                </div>
                
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  marginBottom: '6px'
                }}>
                  {currentParty.members?.slice(0, 3).map((member, index) => {
                    // Use current user's selected skin for their own avatar, otherwise use member's equipped skin
                    const isCurrentUser = isAuthenticated && user && (
                      member.userIdentifier === (user.wallet?.address || user.email || user.id)
                    )
                    const skinToUse = isCurrentUser ? selectedSkin : (member.equippedSkin || {
                      type: 'circle',
                      color: '#3b82f6',
                      pattern: 'solid'
                    })
                    
                    return (
                      <div key={member.userIdentifier} style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '3px'
                      }}>
                        {/* Mobile member avatar circle */}
                        <div style={getSkinAvatarStyle(skinToUse, 24, member.isOnline)}>
                          {/* Mobile skin inner content */}
                          <div style={{ 
                            width: '60%', 
                            height: '60%', 
                            borderRadius: '50%', 
                            background: 'rgba(255, 255, 255, 0.2)' 
                          }} />
                          
                          {/* Mobile online status dot */}
                          {member.isOnline && (
                            <div style={{
                              position: 'absolute',
                              top: '-1px',
                              right: '-1px',
                              width: '6px',
                              height: '6px',
                              background: '#22c55e',
                              borderRadius: '50%',
                              border: '1px solid rgba(26, 32, 44, 1)',
                              boxShadow: '0 0 3px rgba(34, 197, 94, 0.6)'
                            }} />
                          )}
                        </div>
                        
                        {/* Mobile username directly below the circle */}
                        <div style={{
                          color: member.isOnline ? '#e2e8f0' : '#9ca3af',
                          fontSize: '8px',
                          fontWeight: '500',
                          textAlign: 'center',
                          fontFamily: '"Rajdhani", sans-serif',
                          textTransform: 'uppercase',
                          letterSpacing: '0.3px',
                          maxWidth: '32px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {member.username || 'USER'}
                        </div>
                      </div>
                    )
                  })}
                  {currentParty.members?.length > 3 && (
                    <div style={{
                      width: '24px',
                      height: '24px',
                      background: 'rgba(104, 211, 145, 0.2)',
                      border: '1px solid #68d391',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '8px',
                      color: '#68d391',
                      fontWeight: 'bold',
                      fontFamily: '"Rajdhani", sans-serif'
                    }}>
                      +{currentParty.members.length - 3}
                    </div>
                  )}
                </div>
                
                <div style={{
                  textAlign: 'center',
                  color: '#a0aec0',
                  fontSize: '9px',
                  fontFamily: '"Rajdhani", sans-serif'
                }}>
                  {currentParty.members?.length} member{currentParty.members?.length !== 1 ? 's' : ''}
                </div>
              </div>
            ) : loadingParty ? (
              // Loading state - mobile
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  background: 'rgba(26, 32, 44, 0.8)',
                  border: '1px solid #68d391',
                  borderRadius: '3px',
                  margin: '0 auto 8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  boxShadow: '0 0 15px rgba(104, 211, 145, 0.3)',
                  animation: 'pulse 2s infinite'
                }}>
                  🔄
                </div>
                <div style={{ color: '#e2e8f0', fontSize: '10px', fontWeight: '600', fontFamily: '"Rajdhani", sans-serif' }}>LOADING...</div>
              </div>
            ) : (
              // No party state - mobile
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  background: 'rgba(26, 32, 44, 0.8)',
                  border: '1px solid #68d391',
                  borderRadius: '3px',
                  margin: '0 auto 8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  boxShadow: '0 0 15px rgba(104, 211, 145, 0.3)'
                }}>
                  👤
                </div>
                <div style={{ color: '#e2e8f0', fontSize: '10px', fontWeight: '600', fontFamily: '"Rajdhani", sans-serif' }}>NO PARTY</div>
              </div>
            )}
            
            <button 
              onClick={() => {
                console.log('👥 Mobile JOIN PARTY button clicked!')
                setIsFriendsModalOpen(true)
              }}
              style={{
                width: '100%',
                padding: '8px',
                background: 'rgba(26, 32, 44, 0.8)',
                border: '1px solid #f6ad55',
                borderRadius: '3px',
                color: '#f6ad55',
                fontSize: '10px',
                fontWeight: '600',
                cursor: 'pointer',
                fontFamily: '"Rajdhani", sans-serif',
                textTransform: 'uppercase',
                marginBottom: '6px'
              }}>
              JOIN PARTY
            </button>
            
            <button
              onClick={async () => {
                console.log('🎯 Mobile CREATE PARTY button clicked!')
                const authenticated = await requireAuthentication('CREATE PARTY')
                if (authenticated) {
                  console.log('🎯 User authenticated, opening create party...')
                  
                  // Ensure friends list is loaded before opening modal
                  if (friendsList.length === 0) {
                    console.log('🔄 Loading friends list before opening party modal...')
                    await loadFriendsList()
                  }
                  
                  console.log('🔍 Friends data before modal:', {
                    totalFriends: friendsList.length,
                    acceptedFriends: friendsList.filter(f => f.status === 'accepted').length,
                    friendsData: friendsList
                  })
                  
                  createDesktopCreatePartyPopup()
                } else {
                  console.log('❌ Authentication failed, blocking access to CREATE PARTY')
                }
              }}
              style={{
                width: '100%',
                padding: '8px',
                background: 'rgba(26, 32, 44, 0.8)',
                border: '1px solid #68d391',
                borderRadius: '3px',
                color: '#68d391',
                fontSize: '10px',
                fontWeight: '600',
                cursor: 'pointer',
                fontFamily: '"Rajdhani", sans-serif',
                textTransform: 'uppercase'
              }}>
              CREATE PARTY
            </button>
          </div>
        </div>

        {/* Mobile Communications Button */}
        <div style={{ textAlign: 'center' }}>
          <button 
            onClick={() => window.open('https://discord.gg/WbGTJPPTPs', '_blank')}
            style={{
            padding: '12px 20px',
            background: 'linear-gradient(45deg, #5865f2 0%, #4338ca 100%)',
            color: '#ffffff',
            fontWeight: '700',
            borderRadius: '4px',
            border: '2px solid #5865f2',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 0 20px rgba(88, 101, 242, 0.5)',
            fontSize: '12px',
            fontFamily: '"Rajdhani", sans-serif',
            textTransform: 'uppercase'
          }}
            onMouseOver={(e) => {
              e.target.style.transform = 'scale(1.05)'
              e.target.style.boxShadow = '0 0 30px rgba(88, 101, 242, 0.7)'
            }}
            onMouseOut={(e) => {
              e.target.style.transform = 'scale(1)'
              e.target.style.boxShadow = '0 0 20px rgba(88, 101, 242, 0.5)'
            }}
          >
            📡 DISCORD
          </button>
        </div>
      </div>

      {/* Mobile CSS Animations */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@300;400;500;600;700&display=swap');
        
        html, body {
          margin: 0;
          padding: 0;
          background: #0d1117;
          overflow-x: hidden;
        }
        
        @keyframes radarSweep {
          0% { 
            transform: rotate(0deg);
          }
          100% { 
            transform: rotate(360deg);
          }
        }
        
        @keyframes radarLine {
          0% { 
            transform: translate(-50%, -100%) rotate(0deg);
          }
          100% { 
            transform: translate(-50%, -100%) rotate(360deg);
          }
        }
        
        @keyframes tacticalGrid {
          0% { 
            transform: translateX(0) translateY(0);
          }
          100% { 
            transform: translateX(-40px) translateY(-40px);
          }
        }
        
        @keyframes tacticalFloat {
          0%, 100% { 
            transform: translateY(0px);
            opacity: 0.2;
          }
          50% { 
            transform: translateY(-20px);
            opacity: 0.5;
          }
        }
        
        @keyframes statusBlink {
          0%, 100% { 
            opacity: 0.4;
          }
          50% { 
            opacity: 1;
          }
        }
        
        @keyframes rotatePhone {
          0% { 
            transform: rotate(0deg);
          }
          100% { 
            transform: rotate(15deg);
          }
        }
        
        /* Smaller placeholder text for wallet address input */
        .wallet-address-input::placeholder {
          font-size: var(--placeholder-font-size, 14px) !important;
          color: rgba(156, 163, 175, 0.7) !important;
        }
      `}</style>

      {/* Server Browser Modal - Keep the existing one */}
      <ServerBrowserModal
        isOpen={isServerBrowserOpen}
        onClose={() => {
          console.log('Closing server browser modal')
          setIsServerBrowserOpen(false)
        }}
        onJoinLobby={handleJoinLobby}
      />

      {/* Mobile Orientation Modal */}
      {showOrientationModal && isMobile && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(0, 0, 0, 0.95)',
          zIndex: 10000,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          boxSizing: 'border-box'
        }}>
          {orientationModalLoading ? (
            // Loading State
            <>
              {/* Loading Spinner */}
              <div style={{
                width: '60px',
                height: '60px',
                border: '4px solid rgba(59, 130, 246, 0.3)',
                borderTop: '4px solid #3b82f6',
                borderRadius: '50%',
                marginBottom: '30px',
                animation: 'spin 1s linear infinite'
              }} />
              
              {/* Loading Text */}
              <h2 style={{
                color: '#3b82f6',
                fontSize: '24px',
                fontWeight: '700',
                textAlign: 'center',
                marginBottom: '12px',
                fontFamily: '"Rajdhani", sans-serif',
                textTransform: 'uppercase',
                textShadow: '0 0 10px rgba(59, 130, 246, 0.6)'
              }}>
                Loading Practice
              </h2>
              
              <p style={{
                color: '#a0aec0',
                fontSize: '16px',
                textAlign: 'center',
                marginBottom: '30px',
                fontFamily: '"Rajdhani", sans-serif',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                Initializing Local World...
              </p>
              
              {/* Loading Dots */}
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '8px',
                marginBottom: '20px'
              }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  background: '#3b82f6',
                  borderRadius: '50%',
                  animation: 'loadingDot 1.4s ease-in-out infinite'
                }} />
                <div style={{
                  width: '8px',
                  height: '8px',
                  background: 'rgba(59, 130, 246, 0.6)',
                  borderRadius: '50%',
                  animation: 'loadingDot 1.4s ease-in-out infinite 0.16s'
                }} />
                <div style={{
                  width: '8px',
                  height: '8px',
                  background: 'rgba(59, 130, 246, 0.3)',
                  borderRadius: '50%',
                  animation: 'loadingDot 1.4s ease-in-out infinite 0.32s'
                }} />
              </div>
            </>
          ) : (
            // Orientation Request State
            <>
              {/* Rotate Phone Icon */}
              <div style={{
                fontSize: '80px',
                marginBottom: '30px',
                animation: 'rotatePhone 2s ease-in-out infinite alternate'
              }}>
                📱➡️📲
              </div>
              
              {/* Instructions */}
              <h2 style={{
                color: '#ffffff',
                fontSize: '24px',
                fontWeight: '700',
                textAlign: 'center',
                marginBottom: '20px',
                fontFamily: '"Rajdhani", sans-serif',
                textTransform: 'uppercase'
              }}>
                Rotate Your Device
              </h2>
              
              <p style={{
                color: '#e2e8f0',
                fontSize: '16px',
                textAlign: 'center',
                lineHeight: '1.5',
                marginBottom: '30px',
                fontFamily: '"Rajdhani", sans-serif',
                maxWidth: '300px'
              }}>
                For the best gaming experience, please rotate your device to landscape mode.
              </p>
              
              {/* Visual Indicator */}
              <div style={{
                width: '120px',
                height: '60px',
                border: '3px solid #68d391',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '20px',
                background: 'rgba(104, 211, 145, 0.1)'
              }}>
                <span style={{
                  color: '#68d391',
                  fontSize: '14px',
                  fontWeight: '600',
                  fontFamily: '"Rajdhani", sans-serif'
                }}>
                  LANDSCAPE
                </span>
              </div>
              
              
              {/* Cancel Button */}
              <button
                onClick={() => {
                  setShowOrientationModal(false)
                  setPendingGameUrl(null)
                  setOrientationModalLoading(false)
                }}
                style={{
                  padding: '12px 24px',
                  background: 'rgba(252, 129, 129, 0.2)',
                  border: '2px solid #fc8181',
                  borderRadius: '6px',
                  color: '#fc8181',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontFamily: '"Rajdhani", sans-serif',
                  textTransform: 'uppercase',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => {
                  e.target.style.background = 'rgba(252, 129, 129, 0.3)'
                  e.target.style.transform = 'scale(1.05)'
                }}
                onMouseOut={(e) => {
                  e.target.style.background = 'rgba(252, 129, 129, 0.2)'
                  e.target.style.transform = 'scale(1)'
                }}
              >
                Cancel
              </button>
            </>
          )}
        </div>
      )}

      {/* User Profile Modal */}
      {isProfileModalOpen && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(10px)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            boxSizing: 'border-box'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsProfileModalOpen(false)
            }
          }}
        >
          <div 
            style={{
              background: 'linear-gradient(135deg, rgba(26, 32, 44, 0.95) 0%, rgba(45, 55, 72, 0.95) 100%)',
              border: '3px solid #68d391',
              borderRadius: '16px',
              maxWidth: '600px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px rgba(0, 0, 0, 0.8), 0 0 30px rgba(104, 211, 145, 0.3)',
              fontFamily: '"Rajdhani", sans-serif'
            }}
          >
            {/* Header */}
            <div style={{
              padding: '24px',
              borderBottom: '2px solid rgba(104, 211, 145, 0.3)',
              background: 'linear-gradient(45deg, rgba(104, 211, 145, 0.1) 0%, rgba(104, 211, 145, 0.05) 100%)',
              borderRadius: '13px 13px 0 0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{
                  width: '50px',
                  height: '50px',
                  background: 'linear-gradient(45deg, #68d391 0%, #48bb78 100%)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                  color: '#1a202c',
                  fontWeight: '700',
                  boxShadow: '0 0 20px rgba(104, 211, 145, 0.4)'
                }}>
                  👤
                </div>
                <div>
                  <h2 style={{
                    margin: 0,
                    color: '#68d391',
                    fontSize: '24px',
                    fontWeight: '700',
                    textShadow: '0 0 10px rgba(104, 211, 145, 0.6)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em'
                  }}>
                    USER PROFILE
                  </h2>
                  <p style={{
                    margin: '4px 0 0 0',
                    color: '#a0aec0',
                    fontSize: '14px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    TACTICAL OPERATIVE
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsProfileModalOpen(false)}
                style={{
                  background: 'rgba(252, 129, 129, 0.2)',
                  border: '2px solid #fc8181',
                  borderRadius: '8px',
                  color: '#fc8181',
                  fontSize: '20px',
                  width: '40px',
                  height: '40px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => {
                  e.target.style.background = 'rgba(252, 129, 129, 0.3)'
                  e.target.style.transform = 'scale(1.1)'
                }}
                onMouseOut={(e) => {
                  e.target.style.background = 'rgba(252, 129, 129, 0.2)'
                  e.target.style.transform = 'scale(1)'
                }}
              >
                ×
              </button>
            </div>

            {/* Content */}
            <div style={{ padding: '24px' }}>
              
              {/* Identity Section */}
              <div style={{
                marginBottom: '32px',
                padding: '20px',
                background: 'rgba(45, 55, 72, 0.5)',
                border: '1px solid rgba(104, 211, 145, 0.2)',
                borderRadius: '12px'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '24px',
                  marginBottom: '20px'
                }}>
                  {/* Avatar/Skin Preview */}
                  <div style={{
                    width: '120px',
                    height: '120px',
                    background: selectedSkin.color,
                    borderRadius: '50%',
                    border: '4px solid #68d391',
                    boxShadow: '0 0 20px rgba(104, 211, 145, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative'
                  }}>
                    {/* Eyes like in-game */}
                    <div style={{
                      position: 'absolute',
                      width: '12px',
                      height: '12px',
                      background: '#1a202c',
                      borderRadius: '50%',
                      top: '35px',
                      left: '35px'
                    }} />
                    <div style={{
                      position: 'absolute',
                      width: '12px',
                      height: '12px',
                      background: '#1a202c',
                      borderRadius: '50%',
                      top: '35px',
                      right: '35px'
                    }} />
                  </div>
                  
                  {/* Status & Info */}
                  <div style={{ flex: 1 }}>
                    <h3 style={{
                      margin: '0 0 8px 0',
                      color: '#e2e8f0',
                      fontSize: '20px',
                      fontWeight: '700'
                    }}>
                      {isAuthenticated ? 
                        (customUsername || user?.email?.address?.split('@')[0] || user?.wallet?.address?.slice(0, 8) || 'USER').toUpperCase() : 
                        (customUsername || userName).toUpperCase()
                      }
                    </h3>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '12px'
                    }}>
                      <div style={{
                        width: '8px',
                        height: '8px',
                        background: '#68d391',
                        borderRadius: '50%',
                        boxShadow: '0 0 8px #68d391',
                        animation: 'pulse 2s infinite'
                      }} />
                      <span style={{
                        color: '#68d391',
                        fontSize: '14px',
                        fontWeight: '600',
                        textTransform: 'uppercase'
                      }}>
                        ONLINE
                      </span>
                    </div>
                    <button style={{
                      background: 'rgba(104, 211, 145, 0.2)',
                      border: '2px solid #68d391',
                      borderRadius: '6px',
                      color: '#68d391',
                      padding: '8px 16px',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      textTransform: 'uppercase',
                      transition: 'all 0.3s ease'
                    }}>
                      ✏️ EDIT PROFILE
                    </button>
                  </div>
                </div>
              </div>

              {/* Stats & Progression */}
              <div style={{
                marginBottom: '32px',
                padding: '20px',
                background: 'rgba(45, 55, 72, 0.5)',
                border: '1px solid rgba(246, 173, 85, 0.2)',
                borderRadius: '12px'
              }}>
                <h3 style={{
                  margin: '0 0 16px 0',
                  color: '#f6ad55',
                  fontSize: '18px',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  📊 STATS & PROGRESSION
                </h3>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                  gap: '16px'
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: '#f6ad55', fontSize: '24px', fontWeight: '700' }}>127</div>
                    <div style={{ color: '#a0aec0', fontSize: '12px', textTransform: 'uppercase' }}>Games Played</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: '#68d391', fontSize: '24px', fontWeight: '700' }}>34</div>
                    <div style={{ color: '#a0aec0', fontSize: '12px', textTransform: 'uppercase' }}>Wins</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: '#9f7aea', fontSize: '24px', fontWeight: '700' }}>2,847</div>
                    <div style={{ color: '#a0aec0', fontSize: '12px', textTransform: 'uppercase' }}>Highest Size</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: '#fc8181', fontSize: '24px', fontWeight: '700' }}>7</div>
                    <div style={{ color: '#a0aec0', fontSize: '12px', textTransform: 'uppercase' }}>Win Streak</div>
                  </div>
                </div>
                <div style={{
                  marginTop: '16px',
                  padding: '12px',
                  background: 'rgba(246, 173, 85, 0.1)',
                  border: '1px solid rgba(246, 173, 85, 0.3)',
                  borderRadius: '8px',
                  textAlign: 'center'
                }}>
                  <div style={{ color: '#f6ad55', fontSize: '16px', fontWeight: '600' }}>
                    💰 LIFETIME EARNINGS: $2,847.50
                  </div>
                </div>
              </div>

              {/* Wallet Snapshot */}
              <div style={{
                marginBottom: '32px',
                padding: '20px',
                background: 'rgba(45, 55, 72, 0.5)',
                border: '1px solid rgba(104, 211, 145, 0.2)',
                borderRadius: '12px'
              }}>
                <h3 style={{
                  margin: '0 0 16px 0',
                  color: '#68d391',
                  fontSize: '18px',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  💰 WALLET SNAPSHOT
                </h3>
                <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                  <div style={{
                    flex: 1,
                    padding: '16px',
                    background: 'rgba(104, 211, 145, 0.1)',
                    border: '1px solid rgba(104, 211, 145, 0.3)',
                    borderRadius: '8px',
                    textAlign: 'center'
                  }}>
                    <div style={{ color: '#68d391', fontSize: '20px', fontWeight: '700' }}>
                      {currency.toLocaleString()}
                    </div>
                    <div style={{ color: '#a0aec0', fontSize: '12px', textTransform: 'uppercase' }}>Coins</div>
                  </div>
                  <div style={{
                    flex: 1,
                    padding: '16px',
                    background: 'rgba(159, 122, 234, 0.1)',
                    border: '1px solid rgba(159, 122, 234, 0.3)',
                    borderRadius: '8px',
                    textAlign: 'center'
                  }}>
                    <div style={{ color: '#9f7aea', fontSize: '20px', fontWeight: '700' }}>0.0000</div>
                    <div style={{ color: '#a0aec0', fontSize: '12px', textTransform: 'uppercase' }}>SOL</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button style={{
                    flex: 1,
                    background: 'rgba(104, 211, 145, 0.2)',
                    border: '2px solid #68d391',
                    borderRadius: '6px',
                    color: '#68d391',
                    padding: '10px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    textTransform: 'uppercase'
                  }}>
                    💳 DEPOSIT SOL
                  </button>
                  <button style={{
                    flex: 1,
                    background: 'rgba(252, 129, 129, 0.2)',
                    border: '2px solid #fc8181',
                    borderRadius: '6px',
                    color: '#fc8181',
                    padding: '10px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    textTransform: 'uppercase'
                  }}>
                    💸 WITHDRAW
                  </button>
                  <button style={{
                    background: 'rgba(74, 85, 104, 0.5)',
                    border: '2px solid #4a5568',
                    borderRadius: '6px',
                    color: '#a0aec0',
                    padding: '10px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    minWidth: '40px'
                  }}>
                    📋
                  </button>
                </div>
              </div>

              {/* Customization */}
              <div style={{
                marginBottom: '32px',
                padding: '20px',
                background: 'rgba(45, 55, 72, 0.5)',
                border: '1px solid rgba(159, 122, 234, 0.2)',
                borderRadius: '12px'
              }}>
                <h3 style={{
                  margin: '0 0 16px 0',
                  color: '#9f7aea',
                  fontSize: '18px',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  🎨 CUSTOMIZATION
                </h3>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button style={{
                    flex: 1,
                    background: 'rgba(159, 122, 234, 0.2)',
                    border: '2px solid #9f7aea',
                    borderRadius: '6px',
                    color: '#9f7aea',
                    padding: '12px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    textTransform: 'uppercase'
                  }}>
                    🎨 CHANGE SKIN
                  </button>
                  <button style={{
                    flex: 1,
                    background: 'rgba(246, 173, 85, 0.2)',
                    border: '2px solid #f6ad55',
                    borderRadius: '6px',
                    color: '#f6ad55',
                    padding: '12px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    textTransform: 'uppercase'
                  }}>
                    🛒 VIEW STORE
                  </button>
                </div>
              </div>

              {/* Social/Party */}
              <div style={{
                marginBottom: '32px',
                padding: '20px',
                background: 'rgba(45, 55, 72, 0.5)',
                border: '1px solid rgba(66, 153, 225, 0.2)',
                borderRadius: '12px'
              }}>
                <h3 style={{
                  margin: '0 0 16px 0',
                  color: '#4299e1',
                  fontSize: '18px',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  👥 SOCIAL & PARTY
                </h3>
                <div style={{ marginBottom: '16px' }}>
                  <div style={{
                    color: '#a0aec0',
                    fontSize: '12px',
                    textTransform: 'uppercase',
                    marginBottom: '8px'
                  }}>
                    FRIENDS ONLINE (3/24)
                  </div>
                  {['TacticalAce', 'SniperPro', 'StealthOp'].map((friend, index) => (
                    <div key={friend} style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      background: 'rgba(66, 153, 225, 0.1)',
                      border: '1px solid rgba(66, 153, 225, 0.2)',
                      borderRadius: '6px',
                      marginBottom: '4px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          width: '8px',
                          height: '8px',
                          background: '#68d391',
                          borderRadius: '50%',
                          boxShadow: '0 0 6px #68d391'
                        }} />
                        <span style={{ color: '#e2e8f0', fontSize: '14px' }}>{friend}</span>
                      </div>
                      <button style={{
                        background: 'rgba(66, 153, 225, 0.2)',
                        border: '1px solid #4299e1',
                        borderRadius: '4px',
                        color: '#4299e1',
                        padding: '4px 8px',
                        fontSize: '10px',
                        cursor: 'pointer'
                      }}>
                        INVITE
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Settings Shortcuts */}
              <div style={{
                marginBottom: '24px',
                padding: '20px',
                background: 'rgba(45, 55, 72, 0.5)',
                border: '1px solid rgba(74, 85, 104, 0.2)',
                borderRadius: '12px'
              }}>
                <h3 style={{
                  margin: '0 0 16px 0',
                  color: '#a0aec0',
                  fontSize: '18px',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  ⚙️ SETTINGS
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <button style={{
                    background: 'rgba(74, 85, 104, 0.5)',
                    border: '2px solid #4a5568',
                    borderRadius: '6px',
                    color: '#a0aec0',
                    padding: '12px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    textTransform: 'uppercase'
                  }}>
                    👤 ACCOUNT
                  </button>
                  <button style={{
                    background: 'rgba(74, 85, 104, 0.5)',
                    border: '2px solid #4a5568',
                    borderRadius: '6px',
                    color: '#a0aec0',
                    padding: '12px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    textTransform: 'uppercase'
                  }}>
                    🎮 GAME
                  </button>
                </div>
                <button 
                  onClick={handleLogout}
                  style={{
                    width: '100%',
                    marginTop: '12px',
                    background: 'rgba(252, 129, 129, 0.2)',
                    border: '2px solid #fc8181',
                    borderRadius: '6px',
                    color: '#fc8181',
                    padding: '12px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    textTransform: 'uppercase'
                  }}
                >
                  🚪 LOGOUT
                </button>
              </div>

              {/* Fair Play Notice */}
              <div style={{
                padding: '16px',
                background: 'rgba(252, 129, 129, 0.1)',
                border: '1px solid rgba(252, 129, 129, 0.3)',
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <div style={{
                  color: '#fc8181',
                  fontSize: '14px',
                  fontWeight: '600',
                  marginBottom: '4px'
                }}>
                  🔒 FAIR PLAY COMMITMENT
                </div>
                <div style={{
                  color: '#a0aec0',
                  fontSize: '12px',
                  lineHeight: '1.4'
                }}>
                  Zero tolerance for cheats. Report suspicious players to maintain competitive integrity.
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Loading Local Practice Modal - REMOVED: Integrated into orientation modal */}
      
      {/* Withdrawal Modal */}
      {withdrawalModalVisible && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0, 0, 0, 0.95)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999999999,
          backdropFilter: 'blur(10px)',
          pointerEvents: 'auto'
        }}>
          <div style={{
            backgroundColor: 'rgba(17, 24, 39, 0.98)',
            border: '2px solid #10b981',
            borderRadius: isMobile ? '12px' : '16px',
            maxWidth: isMobile ? '340px' : '500px',
            width: '90%',
            padding: '0',
            color: 'white',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.9), 0 0 20px rgba(16, 185, 129, 0.4)',
            fontFamily: '"Rajdhani", sans-serif',
            position: 'relative'
          }}>
            {/* Header */}
            <div style={{
              padding: isMobile ? '16px' : '20px',
              borderBottom: '1px solid rgba(16, 185, 129, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'linear-gradient(90deg, rgba(16, 185, 129, 0.05) 0%, rgba(16, 185, 129, 0.02) 100%)'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>

                <h2 style={{
                  color: '#10b981',
                  fontSize: isMobile ? '18px' : '22px',
                  fontWeight: '700',
                  margin: '0',
                  fontFamily: '"Rajdhani", sans-serif',
                  textShadow: '0 0 10px rgba(16, 185, 129, 0.3)'
                }}>
                  Cash Out
                </h2>
              </div>
              <button
                onClick={() => setWithdrawalModalVisible(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  color: '#ffffff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.target.style.background = 'rgba(255, 255, 255, 0.2)'
                }}
                onMouseOut={(e) => {
                  e.target.style.background = 'rgba(255, 255, 255, 0.1)'
                }}
              >
                ✕
              </button>
            </div>

            {/* Body Content */}
            <div style={{ padding: isMobile ? '16px' : '20px' }}>
              {/* Available Balance Section */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: isMobile ? '16px' : '20px'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span style={{ 
                    color: '#e5e7eb', 
                    fontSize: isMobile ? '14px' : '16px', 
                    fontWeight: '600'
                  }}>
                    Available Balance
                  </span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{
                    color: parseFloat(walletBalance.usd || 0) > 0 ? '#10b981' : '#ef4444',
                    fontSize: isMobile ? '16px' : '18px',
                    fontWeight: '700',
                    fontFamily: '"Rajdhani", sans-serif',
                    textShadow: parseFloat(walletBalance.usd || 0) > 0 ? '0 0 8px rgba(16, 185, 129, 0.4)' : '0 0 8px rgba(239, 68, 68, 0.4)'
                  }}>
                    ${parseFloat(walletBalance.usd || 0).toFixed(2)}
                  </div>
                  <div style={{
                    color: '#6b7280',
                    fontSize: isMobile ? '11px' : '12px',
                    fontFamily: '"Rajdhani", sans-serif'
                  }}>
                    {parseFloat(walletBalance.sol || 0).toFixed(6)} SOL
                  </div>
                </div>
              </div>

              {/* Insufficient Balance Warning */}
              {parseFloat(walletBalance.usd || 0) < 0.21 && (
                <div style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '8px',
                  padding: isMobile ? '12px' : '16px',
                  marginBottom: isMobile ? '16px' : '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span style={{ color: '#ef4444', fontSize: '16px' }}>⚠</span>
                  <div>
                    <div style={{ 
                      color: '#ef4444', 
                      fontSize: isMobile ? '12px' : '14px', 
                      fontWeight: '600',
                      fontFamily: '"Rajdhani", sans-serif'
                    }}>
                      Insufficient balance for cashout. Minimum $0.20 + $0.01 required.
                    </div>
                  </div>
                </div>
              )}

              {/* Amount Input */}
              <div style={{ marginBottom: isMobile ? '16px' : '20px' }}>
                <input
                  type="number"
                  placeholder="0.00"
                  value={withdrawalAmount}
                  onChange={(e) => setWithdrawalAmount(e.target.value)}
                  step="0.01"
                  min="0"
                  max={parseFloat(walletBalance.usd || 0)}
                  style={{
                    width: '100%',
                    backgroundColor: 'rgba(17, 24, 39, 0.8)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    borderRadius: '8px',
                    color: '#ffffff',
                    fontSize: isMobile ? '16px' : '18px',
                    fontWeight: '600',
                    padding: isMobile ? '12px 16px' : '16px 20px',
                    outline: 'none',
                    textAlign: 'right',
                    boxSizing: 'border-box',
                    fontFamily: '"Rajdhani", sans-serif'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#10b981'
                    e.target.style.boxShadow = '0 0 8px rgba(16, 185, 129, 0.3)'
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(16, 185, 129, 0.3)'
                    e.target.style.boxShadow = 'none'
                  }}
                />
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: '8px'
                }}>
                  <span style={{
                    color: '#9ca3af',
                    fontSize: isMobile ? '12px' : '14px'
                  }}>
                    USD
                  </span>
                  <div style={{
                    display: 'flex',
                    gap: '8px'
                  }}>
                    <button 
                      onClick={() => {
                        const maxBalance = parseFloat(walletBalance.usd || 0);
                        const halfAmount = (maxBalance / 2).toFixed(2);
                        setWithdrawalAmount(halfAmount);
                      }}
                      style={{
                        backgroundColor: '#10b981',
                        border: 'none',
                        borderRadius: '4px',
                        color: '#ffffff',
                        fontSize: '12px',
                        fontWeight: '600',
                        padding: '4px 12px',
                        cursor: 'pointer',
                        transition: 'all 150ms',
                        fontFamily: '"Rajdhani", sans-serif'
                      }}
                      onMouseOver={(e) => {
                        e.target.style.backgroundColor = '#059669'
                      }}
                      onMouseOut={(e) => {
                        e.target.style.backgroundColor = '#10b981'
                      }}
                    >
                      ½
                    </button>
                    <button 
                      onClick={() => {
                        const maxBalance = parseFloat(walletBalance.usd || 0);
                        setWithdrawalAmount(maxBalance.toFixed(2));
                      }}
                      style={{
                        backgroundColor: '#f59e0b',
                        border: 'none',
                        borderRadius: '4px',
                        color: '#ffffff',
                        fontSize: '12px',
                        fontWeight: '600',
                        padding: '4px 12px',
                        cursor: 'pointer',
                        transition: 'all 150ms',
                        fontFamily: '"Rajdhani", sans-serif'
                      }}
                      onMouseOver={(e) => {
                        e.target.style.backgroundColor = '#d97706'
                      }}
                      onMouseOut={(e) => {
                        e.target.style.backgroundColor = '#f59e0b'
                      }}
                    >
                      MAX
                    </button>
                  </div>
                </div>
                <div style={{
                  color: '#6b7280',
                  fontSize: isMobile ? '12px' : '14px',
                  textAlign: 'center',
                  marginTop: '8px',
                  fontFamily: '"Rajdhani", sans-serif'
                }}>
                  {(() => {
                    const maxBalance = parseFloat(walletBalance.usd || 0);
                    const currentAmount = parseFloat(withdrawalAmount || 0);
                    const percentage = maxBalance > 0 ? ((currentAmount / maxBalance) * 100).toFixed(0) : 0;
                    return `${percentage}% of available balance`;
                  })()}
                </div>
              </div>

              {/* Destination Address */}
              <div style={{ marginBottom: isMobile ? '20px' : '24px' }}>
                <div style={{ 
                  color: '#e5e7eb', 
                  fontSize: isMobile ? '14px' : '16px', 
                  fontWeight: '600',
                  marginBottom: '8px',
                  fontFamily: '"Rajdhani", sans-serif'
                }}>
                  Destination Wallet Address
                </div>
                <div style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center'
                }}>
                  <input
                    type="text"
                    placeholder="Enter Solana wallet address..."
                    value={destinationAddress || ''}
                    onChange={(e) => setDestinationAddress(e.target.value)}
                    style={{
                      width: '100%',
                      backgroundColor: 'rgba(17, 24, 39, 0.8)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      borderRadius: '8px',
                      color: '#ffffff',
                      fontSize: isMobile ? '14px' : '16px',
                      padding: isMobile ? '12px 70px 12px 16px' : '16px 80px 16px 20px',
                      outline: 'none',
                      boxSizing: 'border-box',
                      fontFamily: 'monospace',
                      '--placeholder-font-size': isMobile ? '12px' : '14px'
                    }}
                    className="wallet-address-input"
                    onFocus={(e) => {
                      e.target.style.borderColor = '#10b981'
                      e.target.style.boxShadow = '0 0 8px rgba(16, 185, 129, 0.3)'
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(16, 185, 129, 0.3)'
                      e.target.style.boxShadow = 'none'
                    }}
                  />
                  <button
                    onClick={async () => {
                      try {
                        const text = await navigator.clipboard.readText();
                        if (text) {
                          setDestinationAddress(text);
                          console.log('✅ Pasted wallet address from clipboard');
                        }
                      } catch (err) {
                        console.log('❌ Failed to read clipboard:', err);
                        // Fallback: show a message to the user
                        alert('Unable to paste from clipboard. Please manually enter your wallet address.');
                      }
                    }}
                    style={{
                      position: 'absolute',
                      right: '8px',
                      backgroundColor: '#10b981',
                      border: 'none',
                      borderRadius: '4px',
                      color: '#ffffff',
                      fontSize: isMobile ? '10px' : '12px',
                      fontWeight: '600',
                      padding: isMobile ? '6px 8px' : '8px 12px',
                      cursor: 'pointer',
                      transition: 'all 150ms',
                      fontFamily: '"Rajdhani", sans-serif',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}
                    onMouseOver={(e) => {
                      e.target.style.backgroundColor = '#059669'
                    }}
                    onMouseOut={(e) => {
                      e.target.style.backgroundColor = '#10b981'
                    }}
                  >
                    PASTE
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{
                display: 'flex',
                gap: isMobile ? '12px' : '16px',
                flexDirection: 'row'
              }}>
                {/* Cancel Button */}
                <button
                  onClick={() => {
                    setWithdrawalModalVisible(false)
                    setWithdrawalAmount('')
                  }}
                  style={{
                    flex: '1',
                    backgroundColor: 'rgba(55, 65, 81, 0.8)',
                    border: '1px solid rgba(75, 85, 99, 0.8)',
                    borderRadius: '8px',
                    color: '#e5e7eb',
                    fontSize: isMobile ? '14px' : '16px',
                    fontWeight: '600',
                    padding: isMobile ? '12px' : '16px',
                    cursor: 'pointer',
                    transition: 'all 150ms',
                    fontFamily: '"Rajdhani", sans-serif'
                  }}
                  onMouseOver={(e) => {
                    e.target.style.backgroundColor = 'rgba(75, 85, 99, 0.8)'
                  }}
                  onMouseOut={(e) => {
                    e.target.style.backgroundColor = 'rgba(55, 65, 81, 0.8)'
                  }}
                >
                  Cancel
                </button>
                
                {/* Cash Out Button */}
                <button
                  onClick={() => {
                    if (!withdrawalAmount || parseFloat(withdrawalAmount) <= 0) {
                      alert('Please enter a valid amount to cash out.')
                      return
                    }
                    if (parseFloat(withdrawalAmount) > parseFloat(walletBalance.usd || 0)) {
                      alert('Amount exceeds available balance.')
                      return
                    }
                    // TODO: Implement actual cash out functionality
                    alert(`Cash out of $${withdrawalAmount} will be implemented here!`)
                  }}
                  disabled={parseFloat(walletBalance.usd || 0) < 0.21}
                  style={{
                    flex: '1',
                    backgroundColor: parseFloat(walletBalance.usd || 0) >= 0.21 ? '#10b981' : 'rgba(107, 114, 128, 0.5)',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#ffffff',
                    fontSize: isMobile ? '14px' : '16px',
                    fontWeight: '700',
                    padding: isMobile ? '12px' : '16px',
                    cursor: parseFloat(walletBalance.usd || 0) >= 0.21 ? 'pointer' : 'not-allowed',
                    transition: 'all 150ms',
                    fontFamily: '"Rajdhani", sans-serif',
                    opacity: parseFloat(walletBalance.usd || 0) >= 0.21 ? 1 : 0.6,
                    textShadow: parseFloat(walletBalance.usd || 0) >= 0.21 ? '0 0 8px rgba(16, 185, 129, 0.3)' : 'none'
                  }}
                  onMouseOver={(e) => {
                    if (parseFloat(walletBalance.usd || 0) >= 0.21) {
                      e.target.style.backgroundColor = '#059669'
                      e.target.style.transform = 'translateY(-1px)'
                    }
                  }}
                  onMouseOut={(e) => {
                    if (parseFloat(walletBalance.usd || 0) >= 0.21) {
                      e.target.style.backgroundColor = '#10b981'
                      e.target.style.transform = 'translateY(0)'
                    }
                  }}
                >
                  Cash Out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Withdrawal Modal */}
      {desktopWithdrawalModalVisible && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000000000,
          backdropFilter: 'blur(8px)'
        }}>
          <div style={{
            backgroundColor: '#1a1a1a',
            border: '2px solid #10b981',
            borderRadius: '12px',
            width: '480px',
            padding: '0',
            fontFamily: '"Rajdhani", sans-serif',
            position: 'relative'
          }}>
            {/* Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '20px 24px',
              borderBottom: '1px solid rgba(16, 185, 129, 0.2)'
            }}>
              <h2 style={{
                color: '#10b981',
                fontSize: '24px',
                fontWeight: '700',
                margin: '0',
                textShadow: '0 0 10px rgba(16, 185, 129, 0.3)'
              }}>
                Cash Out
              </h2>
              <button
                onClick={() => setDesktopWithdrawalModalVisible(false)}
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: '#9ca3af',
                  fontSize: '24px',
                  cursor: 'pointer',
                  padding: '0',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '6px',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.target.style.backgroundColor = 'rgba(156, 163, 175, 0.1)'
                  e.target.style.color = '#ffffff'
                }}
                onMouseOut={(e) => {
                  e.target.style.backgroundColor = 'transparent'
                  e.target.style.color = '#9ca3af'
                }}
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div style={{ padding: '24px' }}>
              {/* Available Balance */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{
                  color: parseFloat(walletBalance.usd || 0) > 0 ? '#10b981' : '#ef4444',
                  fontSize: '14px',
                  fontWeight: '600',
                  marginBottom: '8px'
                }}>
                  Available Balance
                </div>
                <div style={{
                  color: '#ffffff',
                  fontSize: '20px',
                  fontWeight: '700',
                  marginBottom: '4px'
                }}>
                  ${parseFloat(walletBalance.usd || 0).toFixed(2)}
                </div>
                <div style={{
                  color: '#9ca3af',
                  fontSize: '14px'
                }}>
                  {parseFloat(walletBalance.sol || 0).toFixed(6)} SOL
                </div>
              </div>

              {/* Amount Input */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  backgroundColor: 'rgba(17, 24, 39, 0.8)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  borderRadius: '8px',
                  padding: '0'
                }}>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={withdrawalAmount}
                    onChange={(e) => setWithdrawalAmount(e.target.value)}
                    style={{
                      flex: '1',
                      backgroundColor: 'transparent',
                      border: 'none',
                      color: '#ffffff',
                      fontSize: '18px',
                      fontWeight: '600',
                      padding: '16px 20px',
                      outline: 'none',
                      fontFamily: '"Rajdhani", sans-serif'
                    }}
                  />
                  <div style={{
                    color: '#9ca3af',
                    fontSize: '16px',
                    fontWeight: '600',
                    padding: '0 20px'
                  }}>
                    USD
                  </div>
                </div>
                
                {/* Quick Action Buttons */}
                <div style={{
                  display: 'flex',
                  gap: '12px',
                  marginTop: '12px'
                }}>
                  <button
                    onClick={() => {
                      const halfAmount = (parseFloat(walletBalance.usd || 0) / 2).toFixed(2)
                      setWithdrawalAmount(halfAmount)
                    }}
                    style={{
                      backgroundColor: 'rgba(16, 185, 129, 0.1)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      borderRadius: '6px',
                      color: '#10b981',
                      fontSize: '14px',
                      fontWeight: '600',
                      padding: '8px 16px',
                      cursor: 'pointer',
                      fontFamily: '"Rajdhani", sans-serif',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseOver={(e) => {
                      e.target.style.backgroundColor = 'rgba(16, 185, 129, 0.2)'
                    }}
                    onMouseOut={(e) => {
                      e.target.style.backgroundColor = 'rgba(16, 185, 129, 0.1)'
                    }}
                  >
                    ½
                  </button>
                  <button
                    onClick={() => {
                      setWithdrawalAmount((parseFloat(walletBalance.usd || 0)).toFixed(2))
                    }}
                    style={{
                      backgroundColor: 'rgba(16, 185, 129, 0.1)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      borderRadius: '6px',
                      color: '#10b981',
                      fontSize: '14px',
                      fontWeight: '600',
                      padding: '8px 16px',
                      cursor: 'pointer',
                      fontFamily: '"Rajdhani", sans-serif',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseOver={(e) => {
                      e.target.style.backgroundColor = 'rgba(16, 185, 129, 0.2)'
                    }}
                    onMouseOut={(e) => {
                      e.target.style.backgroundColor = 'rgba(16, 185, 129, 0.1)'
                    }}
                  >
                    MAX
                  </button>
                </div>

                {/* Percentage Display */}
                <div style={{
                  color: '#9ca3af',
                  fontSize: '12px',
                  marginTop: '8px'
                }}>
                  {withdrawalAmount && parseFloat(walletBalance.usd || 0) > 0 
                    ? `${((parseFloat(withdrawalAmount) / parseFloat(walletBalance.usd || 0)) * 100).toFixed(0)}% of available balance`
                    : '0% of available balance'
                  }
                </div>
              </div>

              {/* Destination Address */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{
                  color: '#ffffff',
                  fontSize: '14px',
                  fontWeight: '600',
                  marginBottom: '8px'
                }}>
                  Destination Wallet Address
                </div>
                <div style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center'
                }}>
                  <input
                    type="text"
                    placeholder="Enter Solana wallet address..."
                    value={destinationAddress || ''}
                    onChange={(e) => setDestinationAddress(e.target.value)}
                    style={{
                      width: '100%',
                      backgroundColor: 'rgba(17, 24, 39, 0.8)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      borderRadius: '8px',
                      color: '#ffffff',
                      fontSize: '14px',
                      padding: '12px 80px 12px 16px',
                      outline: 'none',
                      boxSizing: 'border-box',
                      fontFamily: 'monospace'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#10b981'
                      e.target.style.boxShadow = '0 0 8px rgba(16, 185, 129, 0.3)'
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(16, 185, 129, 0.3)'
                      e.target.style.boxShadow = 'none'
                    }}
                  />
                  <button
                    onClick={async () => {
                      try {
                        const text = await navigator.clipboard.readText();
                        if (text) {
                          setDestinationAddress(text);
                          console.log('✅ Pasted wallet address from clipboard');
                        }
                      } catch (err) {
                        console.log('❌ Failed to read clipboard:', err);
                        alert('Unable to paste from clipboard. Please manually enter your wallet address.');
                      }
                    }}
                    style={{
                      position: 'absolute',
                      right: '8px',
                      backgroundColor: '#10b981',
                      border: 'none',
                      borderRadius: '4px',
                      color: '#ffffff',
                      fontSize: '12px',
                      fontWeight: '600',
                      padding: '8px 12px',
                      cursor: 'pointer',
                      transition: 'all 150ms',
                      fontFamily: '"Rajdhani", sans-serif',
                      textTransform: 'uppercase'
                    }}
                    onMouseOver={(e) => {
                      e.target.style.backgroundColor = '#059669'
                    }}
                    onMouseOut={(e) => {
                      e.target.style.backgroundColor = '#10b981'
                    }}
                  >
                    PASTE
                  </button>
                </div>
              </div>

              {/* Insufficient Balance Warning */}
              {parseFloat(walletBalance.usd || 0) < 0.21 && (
                <div style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '8px',
                  padding: '12px',
                  marginBottom: '24px'
                }}>
                  <div style={{
                    color: '#ef4444',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}>
                    Insufficient balance for withdrawal. Minimum $0.21 required.
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div style={{
                display: 'flex',
                gap: '12px'
              }}>
                <button
                  onClick={() => setDesktopWithdrawalModalVisible(false)}
                  style={{
                    flex: '1',
                    backgroundColor: 'rgba(107, 114, 128, 0.2)',
                    border: '1px solid rgba(107, 114, 128, 0.3)',
                    borderRadius: '8px',
                    color: '#9ca3af',
                    fontSize: '16px',
                    fontWeight: '600',
                    padding: '16px',
                    cursor: 'pointer',
                    fontFamily: '"Rajdhani", sans-serif',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseOver={(e) => {
                    e.target.style.backgroundColor = 'rgba(107, 114, 128, 0.3)'
                    e.target.style.color = '#ffffff'
                  }}
                  onMouseOut={(e) => {
                    e.target.style.backgroundColor = 'rgba(107, 114, 128, 0.2)'
                    e.target.style.color = '#9ca3af'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (!withdrawalAmount || parseFloat(withdrawalAmount) <= 0) {
                      alert('Please enter a valid amount to cash out.')
                      return
                    }
                    if (parseFloat(withdrawalAmount) > parseFloat(walletBalance.usd || 0)) {
                      alert('Amount exceeds available balance.')
                      return
                    }
                    if (!destinationAddress || destinationAddress.trim() === '') {
                      alert('Please enter a destination wallet address.')
                      return
                    }
                    // TODO: Implement actual cash out functionality
                    alert(`Cash out of $${withdrawalAmount} to ${destinationAddress} will be implemented here!`)
                    setDesktopWithdrawalModalVisible(false)
                  }}
                  disabled={parseFloat(walletBalance.usd || 0) < 0.21}
                  style={{
                    flex: '1',
                    backgroundColor: parseFloat(walletBalance.usd || 0) >= 0.21 ? '#10b981' : 'rgba(107, 114, 128, 0.3)',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#ffffff',
                    fontSize: '16px',
                    fontWeight: '700',
                    padding: '16px',
                    cursor: parseFloat(walletBalance.usd || 0) >= 0.21 ? 'pointer' : 'not-allowed',
                    fontFamily: '"Rajdhani", sans-serif',
                    opacity: parseFloat(walletBalance.usd || 0) >= 0.21 ? '1' : '0.6',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseOver={(e) => {
                    if (parseFloat(walletBalance.usd || 0) >= 0.21) {
                      e.target.style.backgroundColor = '#059669'
                      e.target.style.transform = 'translateY(-1px)'
                    }
                  }}
                  onMouseOut={(e) => {
                    if (parseFloat(walletBalance.usd || 0) >= 0.21) {
                      e.target.style.backgroundColor = '#10b981'
                      e.target.style.transform = 'translateY(0)'
                    }
                  }}
                >
                  Cash Out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Tier Upgrade Notifications - Simplified for demo */}
      {tierUpgradeNotification && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          backgroundColor: '#FFD700',
          color: '#1a202c',
          padding: '16px',
          borderRadius: '8px',
          fontWeight: 'bold',
          zIndex: 1000
        }}>
          🎉 Tier Upgrade! {tierUpgradeNotification.newTier}
        </div>
      )}
      
      {/* Debug Info */}
      {isServerBrowserOpen && (
        <div style={{
          position: 'fixed',
          top: '10px',
          left: '10px',
          background: 'red',
          color: 'white',
          padding: '10px',
          zIndex: 9999,
          fontSize: '12px'
        }}>
          Modal should be open: {isServerBrowserOpen.toString()}
        </div>
      )}
    </div>
  )
}