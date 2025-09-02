'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { getApiUrl } from '../../config/apiRouting'

export default function PartyLobbySystem({ 
  user, 
  onClose, 
  onGameStart,
  displayName 
}) {
  // Party & Lobby State
  const [currentParty, setCurrentParty] = useState(null)
  const [partyInvitations, setPartyInvitations] = useState([])
  const [invitableFriends, setInvitableFriends] = useState([])
  const [currentLobby, setCurrentLobby] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showInviteFriends, setShowInviteFriends] = useState(false)
  const [partyMemberBalances, setPartyMemberBalances] = useState({})
  const [userBalance, setUserBalance] = useState(0)

  // Get user ID - Debug the user ID being used
  const userId = user?.id || user?.privyId
  console.log('🔍 PARTY LOBBY DEBUG: User object:', user)
  console.log('🔍 PARTY LOBBY DEBUG: Extracted userId:', userId)
  console.log('🔍 PARTY LOBBY DEBUG: user.id:', user?.id)
  console.log('🔍 PARTY LOBBY DEBUG: user.privyId:', user?.privyId)
  console.log('🔍 PARTY LOBBY DEBUG: displayName:', displayName)

  // Refresh invitations periodically
  useEffect(() => {
    let invitationRefreshInterval
    
    const refreshInvitations = () => {
      // Only refresh if there's no active error and user is authenticated
      if (!error && userId) {
        fetchPartyInvitations().catch((err) => {
          console.log('ℹ️ Background invitation refresh failed (silent):', err.message)
        })
      }
    }
    
    // Refresh invitations every 10 seconds to catch new invites
    invitationRefreshInterval = setInterval(refreshInvitations, 10000)
    
    return () => {
      if (invitationRefreshInterval) {
        clearInterval(invitationRefreshInterval)
      }
    }
  }, [fetchPartyInvitations, error, userId])

  // Fetch user balance
  const fetchUserBalance = useCallback(async () => {
    if (!userId) return
    
    try {
      // Use the smart routing system to get balance
      const response = await fetch(`${getApiUrl('/api/users/balance')}?userId=${userId}`)
      const data = await response.json()
      
      if (response.ok && typeof data.balance === 'number') {
        setUserBalance(data.balance)
        console.log('💰 User balance loaded:', data.balance)
      } else {
        console.error('❌ Failed to fetch user balance:', data.error)
        setUserBalance(0) // Default to 0 if balance fetch fails
      }
    } catch (error) {
      console.error('❌ Error fetching user balance:', error)
      setUserBalance(0)
    }
  }, [userId])

  // Fetch party member balances
  const fetchPartyMemberBalances = useCallback(async () => {
    if (!currentParty || !currentParty.members) return
    
    console.log('💰 Fetching balances for party members:', currentParty.members)
    
    const balances = {}
    
    try {
      // Fetch balance for each party member
      const balancePromises = currentParty.members.map(async (member) => {
        try {
          const response = await fetch(`${getApiUrl('/api/users/balance')}?userId=${member.id}`)
          const data = await response.json()
          
          if (response.ok && typeof data.balance === 'number') {
            balances[member.id] = data.balance
            console.log(`💰 Balance for ${member.username}: $${data.balance}`)
          } else {
            console.error(`❌ Failed to fetch balance for ${member.username}:`, data.error)
            balances[member.id] = 0
          }
        } catch (error) {
          console.error(`❌ Error fetching balance for ${member.username}:`, error)
          balances[member.id] = 0
        }
      })
      
      await Promise.all(balancePromises)
      setPartyMemberBalances(balances)
      console.log('💰 All party member balances loaded:', balances)
      
    } catch (error) {
      console.error('❌ Error fetching party member balances:', error)
      setPartyMemberBalances({})
    }
  }, [currentParty])

  // Check if party can afford room fee
  const canPartyAffordRoom = useCallback((roomFee) => {
    if (!currentParty || !currentParty.members || Object.keys(partyMemberBalances).length === 0) {
      return { canAfford: false, insufficientMembers: [] }
    }
    
    const insufficientMembers = []
    
    currentParty.members.forEach(member => {
      const memberBalance = partyMemberBalances[member.id] || 0
      if (memberBalance < roomFee) {
        insufficientMembers.push({
          id: member.id,
          username: member.username,
          balance: memberBalance,
          needed: roomFee - memberBalance
        })
      }
    })
    
    return {
      canAfford: insufficientMembers.length === 0,
      insufficientMembers
    }
  }, [currentParty, partyMemberBalances])
  const fetchPartyStatus = useCallback(async (retryCount = 0) => {
    if (!userId) {
      console.log('❌ Cannot fetch party status: No userId provided')
      return
    }
    
    console.log(`🎯 Fetching party status for user: ${userId} (attempt ${retryCount + 1})`)
    
    try {
      // Rate limiting: add delay between requests
      await new Promise(resolve => setTimeout(resolve, 100)) // 100ms delay
      
      const url = `${getApiUrl('/party-api/current')}?userId=${userId}`
      console.log('📡 Party status API URL:', url)
      
      const response = await fetch(url)
      
      if (response.status === 429) {
        console.warn('⚠️ Rate limited, waiting before retry...')
        setTimeout(() => {
          if (retryCount < 2) {
            fetchPartyStatus(retryCount + 1)
          }
        }, 3000) // Wait 3 seconds on rate limit
        return
      }
      
      // Check if response is ok before trying to parse JSON
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      
      console.log('🎯 Party status response:', { status: response.status, data })
      
      if (data.hasParty && data.party) {
        setCurrentParty(data.party)
        console.log('✅ User is in party:', data.party.name, 'with', data.party.memberCount, 'members')
        console.log('👥 Party members:', data.party.members?.map(m => m.username).join(', '))
      } else {
        setCurrentParty(null)
        console.log('ℹ️ User is not in any party')
      }
      
      setError(null) // Clear any previous errors on success
      
    } catch (error) {
      console.error('❌ Error fetching party status:', error)
      
      // Retry logic for transient failures
      if (retryCount < 2) {
        console.log(`🔄 Retrying party status fetch in 1 second... (attempt ${retryCount + 2}/3)`)
        setTimeout(() => {
          fetchPartyStatus(retryCount + 1)
        }, 1000)
        return
      }
      
      // Only set error after all retries failed
      console.error('❌ All retry attempts failed for party status')
      setCurrentParty(null)
      setError('Failed to load party status. Please try again.')
    }
  }, [userId])

  // Fetch party invitations
  const fetchPartyInvitations = useCallback(async () => {
    if (!userId) {
      console.log('❌ Cannot fetch invitations: No userId provided')
      return
    }
    
    console.log('📧 Fetching party invitations for user:', userId)
    
    try {
      const url = `${getApiUrl('/party-api/invitations')}?userId=${userId}`
      console.log('📡 Invitation API URL:', url)
      
      const response = await fetch(url)
      const data = await response.json()
      
      console.log('📧 Invitation response:', { status: response.status, data })
      
      if (response.ok) {
        const invitations = data.invitations || []
        setPartyInvitations(invitations)
        console.log('✅ Party invitations loaded:', invitations.length, 'invitations')
        
        if (invitations.length > 0) {
          console.log('📋 Invitation details:', invitations.map(inv => ({
            id: inv.id,
            fromUsername: inv.fromUsername,
            partyName: inv.partyName,
            status: inv.status
          })))
        } else {
          console.log('ℹ️ No pending invitations found for user')
        }
      } else {
        console.error('❌ Failed to fetch invitations:', data.error)
        setPartyInvitations([])
      }
    } catch (error) {
      console.error('❌ Error fetching invitations:', error)
      setPartyInvitations([])
    }
  }, [userId])

  // Fetch invitable friends for party (with rate limiting)
  const fetchInvitableFriends = useCallback(async () => {
    if (!userId) return
    
    try {
      // Rate limiting: add delay between requests
      await new Promise(resolve => setTimeout(resolve, 200)) // 200ms delay for friends
      
      // Fetch user's friends from the friends API
      const response = await fetch(`${getApiUrl('/api/friends/list')}?userId=${userId}`)
      
      if (response.status === 429) {
        console.warn('⚠️ Friends API rate limited, skipping update...')
        return // Skip this update cycle
      }
      
      const data = await response.json()
      
      if (response.ok) {
        // Get the friends array from the response
        const friends = data.friends || []
        console.log('🤝 Fetched friends for party invites:', friends)
        
        // Filter friends who are online and not already in the party
        const invitableFriends = friends.filter(friend => {
          // Don't invite friends who are already in the current party
          if (currentParty && currentParty.members) {
            const isAlreadyInParty = currentParty.members.some(member => member.id === friend.id)
            if (isAlreadyInParty) return false
          }
          
          // Only show online friends (or all friends if we want to allow offline invites)
          return true // For now, show all friends
        })
        
        setInvitableFriends(invitableFriends)
        console.log('✅ Invitable friends set:', invitableFriends)
      } else {
        console.error('Failed to fetch friends for party invites:', data.error)
        setInvitableFriends([])
      }
    } catch (error) {
      console.error('Error fetching friends for party invites:', error)
      setInvitableFriends([])
    }
  }, [userId, currentParty])

  // Initialize data ONCE when modal opens (remove duplicate calls)
  useEffect(() => {
    console.log('🎮 Party Lobby System: Initializing data for user:', userId)
    fetchPartyStatus()
    fetchPartyInvitations() 
    fetchInvitableFriends()
    fetchUserBalance()
  }, [userId]) // Only depend on userId, not the functions

  // Remove the duplicate useEffect that was causing extra API calls

  // Check for party notifications (with rate limiting)
  const checkPartyNotifications = useCallback(async () => {
    if (!userId) return
    
    try {
      // Rate limiting: add delay between requests 
      await new Promise(resolve => setTimeout(resolve, 150)) // 150ms delay for notifications
      
      console.log('🔔 Checking for party game notifications...')
      const response = await fetch(`${getApiUrl('/party-api/notifications')}?userId=${userId}`)
      
      if (response.status === 429) {
        console.warn('⚠️ Notification polling rate limited, backing off...')
        return // Silently skip this polling cycle
      }
      
      if (!response.ok) {
        console.log(`ℹ️ Notifications check returned ${response.status} - continuing silently`)
        return // Silent failure for notifications
      }
      
      const data = await response.json()
      console.log('🔔 Notifications response:', data)
      
      if (data.success && data.notifications && data.notifications.length > 0) {
        const gameStartNotifications = data.notifications.filter(
          notif => notif.type === 'party_game_start' && notif.status === 'pending'
        )
        
        console.log(`🎮 Found ${gameStartNotifications.length} pending game start notifications`)
        
        if (gameStartNotifications.length > 0) {
          const latestNotification = gameStartNotifications[0]
          console.log('🔔 Processing party game notification:', latestNotification)
          
          // Mark notification as seen first
          try {
            await fetch(`${getApiUrl('/party-api/mark-notification-seen')}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                notificationId: latestNotification.id,
                userId: userId
              })
            })
            console.log('✅ Notification marked as seen')
          } catch (markError) {
            console.log('⚠️ Failed to mark notification as seen:', markError.message)
          }
          
          // Auto-join the party game
          if (onGameStart && latestNotification.data) {
            console.log('🎮 AUTO-JOINING PARTY GAME from notification!')
            console.log('🎯 Game data:', latestNotification.data)
            
            const gameData = {
              roomType: latestNotification.data.roomType,
              entryFee: latestNotification.data.entryFee,
              gameRoomId: latestNotification.data.gameRoomId,
              partyMode: true,
              partyId: latestNotification.data.partyId,
              partySize: latestNotification.data.partyMembers?.length || 2,
              partyMembers: latestNotification.data.partyMembers || []
            }
            
            console.log('🚀 Calling onGameStart with:', gameData)
            onGameStart(gameData)
            
            console.log('🔄 Closing Party Lobby modal')
            onClose() // Close party lobby modal
            
            return // Exit after successful auto-join
          } else {
            console.error('❌ Missing onGameStart callback or notification data')
          }
        }
      } else {
        console.log('ℹ️ No pending game notifications found')
      }
    } catch (error) {
      // Silent failure for notifications - don't show errors to user
      console.log('ℹ️ Notification check failed (silent):', error.message)
    }
  }, [userId, onGameStart, onClose])

  // Poll for notifications with more aggressive checking for game starts
  useEffect(() => {
    let notificationInterval
    let failureCount = 0
    
    const pollNotifications = () => {
      checkPartyNotifications()
        .then(() => {
          // Reset failure count on success
          failureCount = 0
        })
        .catch(() => {
          // Increase failure count and implement exponential backoff
          failureCount++
          if (failureCount > 10) {
            console.log('🔕 Too many notification failures, stopping polling')
            clearInterval(notificationInterval)
            return
          }
        })
    }
    
    // More conservative polling every 5 seconds to avoid rate limiting
    notificationInterval = setInterval(pollNotifications, 5000)
    
    // Initial check immediately
    pollNotifications()
    
    return () => {
      if (notificationInterval) {
        clearInterval(notificationInterval)
      }
    }
  }, [checkPartyNotifications])

  // Fetch party member balances when party changes  
  useEffect(() => {
    if (currentParty && currentParty.members) {
      console.log('💰 Party detected, fetching member balances')
      fetchPartyMemberBalances()
    }
  }, [currentParty, fetchPartyMemberBalances])

  // Refresh party status periodically but less frequently
  useEffect(() => {
    let statusRefreshInterval
    
    const refreshStatus = () => {
      // Only refresh if there's no active error
      if (!error) {
        fetchPartyStatus().catch((err) => {
          console.log('ℹ️ Background party status refresh failed (silent):', err.message)
        })
      }
    }
    
    // Refresh party status every 30 seconds (much less frequent)
    statusRefreshInterval = setInterval(refreshStatus, 30000)
    
    return () => {
      if (statusRefreshInterval) {
        clearInterval(statusRefreshInterval)
      }
    }
  }, [fetchPartyStatus, error])

  // Only fetch invitable friends when party membership changes (not on every render)
  useEffect(() => {
    if (userId) {
      fetchInvitableFriends()
    }
  }, [currentParty?.members?.length, userId]) // Only when party member count changes

  // Create new party
  const createParty = async () => {
    if (!userId || !displayName) {
      setError('User information required to create party')
      return
    }

    // First check if user is already in a party
    console.log('🔍 Checking existing party status before creating new party...')
    await fetchPartyStatus() // Refresh party status first
    
    if (currentParty) {
      console.log('⚠️ User is already in party:', currentParty.name)
      setError(`You are already in "${currentParty.name}". Leave your current party first.`)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      console.log('🎉 Creating new party for user:', displayName)
      
      const response = await fetch(`${getApiUrl('/party-api/create')}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerId: userId,
          ownerUsername: displayName,
          partyName: `${displayName}'s Party`
        })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        console.log('✅ Party created successfully:', data.partyId)
        setError(null) // Clear any errors
        await fetchPartyStatus() // Refresh party data to show the new party
      } else {
        console.error('❌ Failed to create party:', data.error)
        if (data.error && data.error.includes('already in a party')) {
          setError('You are already in a party. Please leave your current party first.')
          await fetchPartyStatus() // Refresh to show current party
        } else {
          setError(data.error || 'Failed to create party')
        }
      }
    } catch (error) {
      console.error('❌ Error creating party:', error)
      setError('Failed to create party. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Invite friend to party
  const inviteFriend = async (friendId, friendUsername) => {
    if (!currentParty) {
      setError('No active party to send invites from')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`${getApiUrl('/api/party/invite')}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partyId: currentParty.id,
          fromUserId: userId,
          toUserId: friendId,
          toUsername: friendUsername
        })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        console.log('✅ Friend invited successfully:', data.invitationId)
        // Refresh invitable friends list
        await fetchInvitableFriends()
        setShowInviteFriends(false)
      } else {
        setError(data.error || 'Failed to send invitation')
      }
    } catch (error) {
      console.error('❌ Error inviting friend:', error)
      setError('Failed to send invitation. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Accept party invitation
  const acceptInvitation = async (invitationId) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`${getApiUrl('/api/party/accept-invitation')}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invitationId,
          userId
        })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        console.log('✅ Invitation accepted successfully')
        // Refresh party status and invitations
        await Promise.all([
          fetchPartyStatus(),
          fetchPartyInvitations()
        ])
      } else {
        setError(data.error || 'Failed to accept invitation')
      }
    } catch (error) {
      console.error('❌ Error accepting invitation:', error)
      setError('Failed to accept invitation. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Decline party invitation
  const declineInvitation = async (invitationId) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`${getApiUrl('/api/party/decline-invitation')}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invitationId,
          userId
        })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        console.log('✅ Invitation declined successfully')
        await fetchPartyInvitations() // Refresh invitations
      } else {
        setError(data.error || 'Failed to decline invitation')
      }
    } catch (error) {
      console.error('❌ Error declining invitation:', error)
      setError('Failed to decline invitation. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Leave party
  const leaveParty = async () => {
    if (!currentParty) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`${getApiUrl('/api/party/leave')}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partyId: currentParty.id,
          userId
        })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        console.log('✅ Left party successfully')
        setCurrentParty(null)
        await fetchPartyStatus() // Refresh party status
      } else {
        setError(data.error || 'Failed to leave party')
      }
    } catch (error) {
      console.error('❌ Error leaving party:', error)
      setError('Failed to leave party. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Join room with party coordination
  const joinRoom = async (roomType, entryFee = 0) => {
    setIsLoading(true)
    setError(null)

    try {
      if (currentParty && currentParty.members && currentParty.members.length > 1) {
        // PARTY MODE: Coordinate all party members to join the same room
        console.log(`🎮 Party Mode: Creating coordinated game room for ${currentParty.members.length} members`)
        
        // Check if user is party owner
        const isOwner = currentParty.members.some(member => 
          member.id === userId && member.role === 'owner'
        )
        
        if (!isOwner) {
          setError('Only the party owner can start games')
          return
        }
        
        // Create coordinated party room
        const response = await fetch(`${getApiUrl('/api/party/start-game')}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            partyId: currentParty.id,
            roomType,
            entryFee,
            ownerId: userId
          })
        })

        const data = await response.json()

        if (response.ok && data.success) {
          console.log('✅ Coordinated party room created:', data.gameRoomId)
          
          // Navigate party owner to game with party coordination
          if (onGameStart) {
            onGameStart({
              roomType,
              entryFee,
              gameRoomId: data.gameRoomId,
              partyMode: true,
              partyId: currentParty.id,
              partySize: currentParty.members.length,
              partyMembers: currentParty.members
            })
          }
          
          onClose() // Close the party lobby modal
        } else {
          setError(data.error || 'Failed to create party game room')
        }
      } else {
        // SOLO MODE: Regular single-player room joining
        console.log(`🎮 Solo Mode: Joining ${roomType} room`)
        
        const response = await fetch(`${getApiUrl('/api/lobby/create')}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            roomType,
            entryFee
          })
        })

        const data = await response.json()

        if (response.ok && data.success) {
          console.log('✅ Solo room joined:', data.lobbyId)
          
          // Navigate to solo game
          if (onGameStart) {
            onGameStart({
              roomType,
              entryFee,
              lobbyId: data.lobbyId,
              partyMode: false,
              partySize: 1,
              partyMembers: []
            })
          }
          
          onClose() // Close the party lobby modal
        } else {
          setError(data.error || 'Failed to join room')
        }
      }
    } catch (error) {
      console.error('❌ Error joining room:', error)
      setError('Failed to join room. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      {/* Desktop Version - Full Modal (unchanged) */}
      <div className="hidden md:flex fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm items-start justify-end pt-20 pr-6 p-4" onClick={onClose}>
        <div 
          className="bg-gray-900 border border-orange-500/40 rounded-xl shadow-2xl w-full max-w-md max-h-[75vh] overflow-hidden animate-in fade-in duration-200 mt-4 relative" 
          onClick={(e) => {
            e.stopPropagation()
            e.preventDefault()
          }}
        >
        {/* Header */}
        <div className="p-4 border-b border-orange-500/30 bg-gradient-to-r from-orange-600/20 to-orange-700/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-orange-500/20 rounded-lg flex items-center justify-center border border-orange-500/30">
                <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-white font-bold text-lg">Party Lobby</h2>
                <p className="text-orange-200 text-sm">Team up and play together</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="w-6 h-6 text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 overflow-y-auto max-h-[60vh]">
          {/* Error Display */}
          {error && (
            <div className="p-3 bg-red-500/20 border border-red-500/40 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Party Invitations */}
          {partyInvitations.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-white font-semibold text-sm flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 002 2v10a2 2 0 002 2z" />
                  </svg>
                  <span>Party Invites ({partyInvitations.length})</span>
                </div>
                <button
                  onClick={fetchPartyInvitations}
                  className="p-1 text-gray-400 hover:text-white transition-colors"
                  title="Refresh invitations"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.002 8.002 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </h3>
              {partyInvitations.map((invite) => (
                <div key={invite.id} className="flex items-center justify-between p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-yellow-500/20 rounded-full flex items-center justify-center text-yellow-400 font-bold text-sm">
                      {invite.fromUsername.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-white font-medium text-sm">{invite.fromUsername}</div>
                      <div className="text-gray-400 text-xs">{invite.partyName}</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button 
                      onClick={() => acceptInvitation(invite.id)}
                      disabled={isLoading}
                      className="px-3 py-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs font-medium rounded transition-colors"
                    >
                      Accept
                    </button>
                    <button 
                      onClick={() => declineInvitation(invite.id)}
                      disabled={isLoading}
                      className="px-3 py-1 bg-gray-600 hover:bg-gray-700 disabled:opacity-50 text-white text-xs font-medium rounded transition-colors"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Current Party or Create Party */}
          {!currentParty ? (
            <div className="space-y-3">
              <button 
                onClick={createParty}
                disabled={isLoading}
                className="w-full p-4 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-500 hover:to-orange-600 disabled:opacity-50 rounded-lg transition-all duration-200"
              >
                <div className="flex items-center justify-center space-x-3">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="text-white font-semibold">Create New Party</span>
                </div>
                <div className="text-orange-200 text-xs mt-1">Start a party and invite friends</div>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Active Party Info */}
              <div className="bg-gray-800/40 rounded-lg p-3">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-white font-semibold text-sm">Active Party</h3>
                  <div className="px-2 py-1 bg-green-500/20 border border-green-500/30 rounded text-green-400 text-xs font-medium">
                    {currentParty.memberCount} members
                  </div>
                </div>

                {/* Party Members */}
                <div className="space-y-2">
                  {currentParty.members?.map((member) => (
                    <div key={member.id} className="flex items-center space-x-3 p-2 bg-gray-700/50 rounded-lg">
                      <div className="w-8 h-8 bg-orange-500/20 rounded-full flex items-center justify-center text-orange-400 font-bold text-sm">
                        {member.username.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="text-white font-medium text-sm">{member.username}</div>
                        <div className="text-gray-400 text-xs">{member.role}</div>
                      </div>
                      {member.role === 'owner' && (
                        <div className="text-yellow-400 text-xs font-medium">Owner</div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Party Actions */}
                <div className="flex space-x-2 mt-3 pt-3 border-t border-gray-700/50">
                  <button 
                    onClick={() => setShowInviteFriends(true)}
                    disabled={isLoading}
                    className="flex-1 px-3 py-2 border border-orange-500/40 hover:bg-orange-500/10 disabled:opacity-50 text-orange-400 hover:text-orange-300 rounded-lg transition-all duration-200 text-sm font-medium"
                  >
                    Invite Friends
                  </button>
                  <button 
                    onClick={leaveParty}
                    disabled={isLoading}
                    className="px-3 py-2 bg-red-600/20 border border-red-500/40 hover:bg-red-600/30 disabled:opacity-50 text-red-400 hover:text-red-300 rounded-lg transition-all duration-200 text-sm font-medium"
                  >
                    Leave
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Room Selection with Owner-Only Access */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-semibold text-sm">
                {currentParty ? `Select Room for Party (${currentParty.memberCount} members)` : 'Quick Play'}
              </h3>
              {currentParty && currentParty.memberCount > 2 && (
                <div className="px-2 py-1 bg-red-500/20 border border-red-500/30 rounded text-red-400 text-xs font-medium">
                  Max 2 players
                </div>
              )}
            </div>

            {/* Owner-Only Access Control */}
            {currentParty && (
              (() => {
                const isOwner = currentParty.members?.some(member => 
                  member.id === userId && member.role === 'owner'
                )
                
                if (!isOwner) {
                  return (
                    <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg text-center">
                      <div className="flex items-center justify-center space-x-2 mb-2">
                        <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        <span className="text-blue-400 font-semibold text-sm">Owner Only</span>
                      </div>
                      <p className="text-blue-300 text-sm">Only the party owner can start games</p>
                      <p className="text-blue-400 text-xs mt-1">Wait for {currentParty.ownerUsername} to select a room</p>
                    </div>
                  )
                }
                return null
              })()
            )}
            
            <div className="grid grid-cols-2 gap-2">
              {[
                { name: 'Practice', roomType: 'practice', fee: 0, color: 'green' },
                { name: '$1', roomType: '$1', fee: 1, color: 'blue' },
                { name: '$5', roomType: '$5', fee: 5, color: 'purple' },
                { name: '$25', roomType: '$25', fee: 25, color: 'red' }
              ].map((room) => {
                // Check if user/party can afford this room
                let canAfford = true
                let disableReason = null
                let affordabilityCheck = null
                let isOwner = true
                
                if (currentParty) {
                  // Check if user is party owner
                  isOwner = currentParty.members?.some(member => 
                    member.id === userId && member.role === 'owner'
                  )
                  
                  if (!isOwner) {
                    canAfford = false
                    disableReason = 'Only owner can start games'
                  } else {
                    // Check party member balances
                    affordabilityCheck = canPartyAffordRoom(room.fee)
                    canAfford = affordabilityCheck.canAfford
                    
                    if (!canAfford && affordabilityCheck.insufficientMembers.length > 0) {
                      const insufficientNames = affordabilityCheck.insufficientMembers.map(m => m.username).join(', ')
                      disableReason = `${insufficientNames} need more funds`
                    }
                    
                    // Check party size limit (max 2 players)
                    if (currentParty.memberCount > 2) {
                      canAfford = false
                      disableReason = `Party too large (${currentParty.memberCount}/2)`
                    }
                  }
                } else {
                  // Solo play - check user balance
                  canAfford = userBalance >= room.fee
                  if (!canAfford && room.fee > 0) {
                    disableReason = `Need $${room.fee - userBalance} more`
                  }
                }
                
                return (
                  <button 
                    key={room.roomType}
                    onClick={() => canAfford ? joinRoom(room.roomType, room.fee) : null}
                    disabled={isLoading || !canAfford}
                    className={`relative p-3 rounded-lg transition-all duration-200 ${
                      canAfford 
                        ? `bg-${room.color}-600/20 border border-${room.color}-500/40 hover:bg-${room.color}-600/30 cursor-pointer` 
                        : 'bg-gray-600/20 border border-gray-500/40 opacity-50 cursor-not-allowed'
                    }`}
                    title={disableReason || `Join ${room.name} room`}
                  >
                    <div className={`${
                      canAfford ? `text-${room.color}-400` : 'text-gray-500'
                    } font-bold text-sm`}>
                      {room.name}
                    </div>
                    <div className="text-gray-400 text-xs">
                      {currentParty ? (
                        canAfford 
                          ? `Party of ${Math.min(currentParty.memberCount, 2)}`
                          : disableReason
                      ) : (
                        canAfford ? 'Solo Play' : disableReason
                      )}
                    </div>
                    
                    {/* Balance warning indicator */}
                    {!canAfford && room.fee > 0 && isOwner && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-bold">!</span>
                      </div>
                    )}
                    
                    {/* Owner-only lock indicator */}
                    {currentParty && !isOwner && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                        <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                    
                    {/* Party size warning */}
                    {currentParty && currentParty.memberCount > 2 && isOwner && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-bold">!</span>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Invite Friends Overlay - Takes over the entire modal */}
        {showInviteFriends && (
          <div 
            className="absolute inset-0 bg-gray-900 rounded-xl z-[70] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 border-b border-orange-500/30 bg-gradient-to-r from-orange-600/20 to-orange-700/20 rounded-t-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-teal-500/20 rounded-lg flex items-center justify-center border border-teal-500/30">
                    <svg className="w-4 h-4 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-lg">Invite Friends</h3>
                    <p className="text-teal-200 text-sm">Invite friends to your party</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowInviteFriends(false)}
                  className="w-6 h-6 text-gray-400 hover:text-white transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            {/* Content */}
            <div className="flex-1 p-4 space-y-3 overflow-y-auto">
              {invitableFriends.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-teal-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                    </svg>
                  </div>
                  <p className="text-gray-400 font-medium">No friends available to invite</p>
                  <p className="text-gray-500 text-sm mt-1">Add friends first or they might already be in parties</p>
                </div>
              ) : (
                invitableFriends.map((friend) => (
                  <div key={friend.id} className="flex items-center justify-between p-3 bg-gray-800/40 hover:bg-gray-700/40 rounded-lg transition-colors">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-teal-500/20 rounded-full flex items-center justify-center text-teal-400 font-bold">
                        {friend.username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-white font-medium">{friend.username}</div>
                        <div className="text-gray-400 text-sm">Available to invite</div>
                      </div>
                    </div>
                    <button 
                      onClick={() => inviteFriend(friend.id, friend.username)}
                      disabled={isLoading}
                      className="px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      {isLoading ? 'Sending...' : 'Invite'}
                    </button>
                  </div>
                ))
              )}
            </div>
            
            {/* Footer */}
            <div className="p-4 border-t border-gray-700/50 bg-gray-800/20 rounded-b-xl">
              <button 
                onClick={() => setShowInviteFriends(false)}
                className="w-full px-4 py-2 border border-gray-600/40 hover:bg-gray-700/40 text-gray-300 hover:text-white rounded-lg transition-all duration-200 text-sm font-medium"
              >
                Back to Party Lobby
              </button>
            </div>
          </div>
        )}

        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="bg-gray-800 rounded-lg p-4 flex items-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-400"></div>
              <span className="text-white">Loading...</span>
            </div>
          </div>
        )}
      </div>
      
      {/* Mobile Version - Bottom Sheet Style */}
      <div className="md:hidden fixed inset-0 z-[60] bg-black/30 backdrop-blur-sm" onClick={onClose}>
        <div 
          className="absolute bottom-0 left-0 right-0 bg-gray-900 border-t border-orange-500/40 rounded-t-2xl shadow-2xl max-h-[85vh] overflow-hidden animate-in slide-in-from-bottom duration-300" 
          onClick={(e) => {
            e.stopPropagation()
            e.preventDefault()
          }}
        >
          {/* Error Display */}
          {error && (
            <div className="p-3 bg-red-500/20 border border-red-500/40 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Party Invitations */}
          {partyInvitations.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-white font-semibold text-sm flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 002 2v10a2 2 0 002 2z" />
                  </svg>
                  <span>Party Invites ({partyInvitations.length})</span>
                </div>
                <button
                  onClick={fetchPartyInvitations}
                  className="p-1 text-gray-400 hover:text-white transition-colors"
                  title="Refresh invitations"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.002 8.002 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </h3>
              {partyInvitations.map((invite) => (
                <div key={invite.id} className="flex items-center justify-between p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-yellow-500/20 rounded-full flex items-center justify-center text-yellow-400 font-bold text-sm">
                      {invite.fromUsername.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-white font-medium text-sm">{invite.fromUsername}</div>
                      <div className="text-gray-400 text-xs">{invite.partyName}</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button 
                      onClick={() => acceptInvitation(invite.id)}
                      disabled={isLoading}
                      className="px-3 py-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs font-medium rounded transition-colors"
                    >
                      Accept
                    </button>
                    <button 
                      onClick={() => declineInvitation(invite.id)}
                      disabled={isLoading}
                      className="px-3 py-1 bg-gray-600 hover:bg-gray-700 disabled:opacity-50 text-white text-xs font-medium rounded transition-colors"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Current Party or Create Party */}
          {!currentParty ? (
            <div className="space-y-3">
              <button 
                onClick={createParty}
                disabled={isLoading}
                className="w-full p-4 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-500 hover:to-orange-600 disabled:opacity-50 rounded-lg transition-all duration-200"
              >
                <div className="flex items-center justify-center space-x-3">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="text-white font-semibold">Create New Party</span>
                </div>
                <div className="text-orange-200 text-xs mt-1">Start a party and invite friends</div>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Active Party Info */}
              <div className="bg-gray-800/40 rounded-lg p-3">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-white font-semibold text-sm">Active Party</h3>
                  <div className="px-2 py-1 bg-green-500/20 border border-green-500/30 rounded text-green-400 text-xs font-medium">
                    {currentParty.memberCount} members
                  </div>
                </div>

                {/* Party Members */}
                <div className="space-y-2">
                  {currentParty.members?.map((member) => (
                    <div key={member.id} className="flex items-center space-x-3 p-2 bg-gray-700/50 rounded-lg">
                      <div className="w-8 h-8 bg-orange-500/20 rounded-full flex items-center justify-center text-orange-400 font-bold text-sm">
                        {member.username.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="text-white font-medium text-sm">{member.username}</div>
                        <div className="text-gray-400 text-xs">{member.role}</div>
                      </div>
                      {member.role === 'owner' && (
                        <div className="text-yellow-400 text-xs font-medium">Owner</div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Party Actions */}
                <div className="flex space-x-2 mt-3 pt-3 border-t border-gray-700/50">
                  <button 
                    type="button"
                    data-party-lobby-invite="true"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      e.nativeEvent.stopImmediatePropagation()
                      console.log('🎯 Party Lobby Invite Button Clicked - Internal Only')
                      setShowInviteFriends(true)
                    }}
                    disabled={isLoading}
                    className="flex-1 px-3 py-2 border border-orange-500/40 hover:bg-orange-500/10 disabled:opacity-50 text-orange-400 hover:text-orange-300 rounded-lg transition-all duration-200 text-sm font-medium"
                  >
                    Invite Friends
                  </button>
                  <button 
                    onClick={leaveParty}
                    disabled={isLoading}
                    className="px-3 py-2 bg-red-600/20 border border-red-500/40 hover:bg-red-600/30 disabled:opacity-50 text-red-400 hover:text-red-300 rounded-lg transition-all duration-200 text-sm font-medium"
                  >
                    Leave
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Room Selection with Owner-Only Access */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-semibold text-sm">
                {currentParty ? `Select Room for Party (${currentParty.memberCount} members)` : 'Quick Play'}
              </h3>
              {currentParty && currentParty.memberCount > 2 && (
                <div className="px-2 py-1 bg-red-500/20 border border-red-500/30 rounded text-red-400 text-xs font-medium">
                  Max 2 players
                </div>
              )}
            </div>

            {/* Owner-Only Access Control */}
            {currentParty && (
              (() => {
                const isOwner = currentParty.members?.some(member => 
                  member.id === userId && member.role === 'owner'
                )
                
                if (!isOwner) {
                  return (
                    <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg text-center">
                      <div className="flex items-center justify-center space-x-2 mb-2">
                        <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        <span className="text-blue-400 font-semibold text-sm">Owner Only</span>
                      </div>
                      <p className="text-blue-300 text-sm">Only the party owner can start games</p>
                      <p className="text-blue-400 text-xs mt-1">Wait for {currentParty.ownerUsername} to select a room</p>
                    </div>
                  )
                }
                return null
              })()
            )}
            
            <div className="grid grid-cols-2 gap-2">
              {[
                { name: 'Practice', roomType: 'practice', fee: 0, color: 'green' },
                { name: '$1', roomType: '$1', fee: 1, color: 'blue' },
                { name: '$5', roomType: '$5', fee: 5, color: 'purple' },
                { name: '$25', roomType: '$25', fee: 25, color: 'red' }
              ].map((room) => {
                // Check if user/party can afford this room
                let canAfford = true
                let disableReason = null
                let affordabilityCheck = null
                let isOwner = true
                
                if (currentParty) {
                  // Check if user is party owner
                  isOwner = currentParty.members?.some(member => 
                    member.id === userId && member.role === 'owner'
                  )
                  
                  if (!isOwner) {
                    canAfford = false
                    disableReason = 'Only owner can start games'
                  } else {
                    // Check party member balances
                    affordabilityCheck = canPartyAffordRoom(room.fee)
                    canAfford = affordabilityCheck.canAfford
                    
                    if (!canAfford && affordabilityCheck.insufficientMembers.length > 0) {
                      const insufficientNames = affordabilityCheck.insufficientMembers.map(m => m.username).join(', ')
                      disableReason = `${insufficientNames} need more funds`
                    }
                    
                    // Check party size limit (max 2 players)
                    if (currentParty.memberCount > 2) {
                      canAfford = false
                      disableReason = `Party too large (${currentParty.memberCount}/2)`
                    }
                  }
                } else {
                  // Solo play - check user balance
                  canAfford = userBalance >= room.fee
                  if (!canAfford && room.fee > 0) {
                    disableReason = `Need $${room.fee - userBalance} more`
                  }
                }
                
                return (
                  <button 
                    key={room.roomType}
                    onClick={() => canAfford ? joinRoom(room.roomType, room.fee) : null}
                    disabled={isLoading || !canAfford}
                    className={`relative p-3 rounded-lg transition-all duration-200 ${
                      canAfford 
                        ? `bg-${room.color}-600/20 border border-${room.color}-500/40 hover:bg-${room.color}-600/30 cursor-pointer` 
                        : 'bg-gray-600/20 border border-gray-500/40 opacity-50 cursor-not-allowed'
                    }`}
                    title={disableReason || `Join ${room.name} room`}
                  >
                    <div className={`${
                      canAfford ? `text-${room.color}-400` : 'text-gray-500'
                    } font-bold text-sm`}>
                      {room.name}
                    </div>
                    <div className="text-gray-400 text-xs">
                      {currentParty ? (
                        canAfford 
                          ? `Party of ${Math.min(currentParty.memberCount, 2)}`
                          : disableReason
                      ) : (
                        canAfford ? 'Solo Play' : disableReason
                      )}
                    </div>
                    
                    {/* Balance warning indicator */}
                    {!canAfford && room.fee > 0 && isOwner && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-bold">!</span>
                      </div>
                    )}
                    
                    {/* Owner-only lock indicator */}
                    {currentParty && !isOwner && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                        <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                    
                    {/* Party size warning */}
                    {currentParty && currentParty.memberCount > 2 && isOwner && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-bold">!</span>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Invite Friends Overlay - Takes over the entire modal */}
        {showInviteFriends && (
          <div 
            className="absolute inset-0 bg-gray-900 rounded-xl z-[70] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 border-b border-orange-500/30 bg-gradient-to-r from-orange-600/20 to-orange-700/20 rounded-t-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-teal-500/20 rounded-lg flex items-center justify-center border border-teal-500/30">
                    <svg className="w-4 h-4 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-lg">Invite Friends</h3>
                    <p className="text-teal-200 text-sm">Invite friends to your party</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowInviteFriends(false)}
                  className="w-6 h-6 text-gray-400 hover:text-white transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            {/* Content */}
            <div className="flex-1 p-4 space-y-3 overflow-y-auto">
              {invitableFriends.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-teal-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                    </svg>
                  </div>
                  <p className="text-gray-400 font-medium">No friends available to invite</p>
                  <p className="text-gray-500 text-sm mt-1">Add friends first or they might already be in parties</p>
                </div>
              ) : (
                invitableFriends.map((friend) => (
                  <div key={friend.id} className="flex items-center justify-between p-3 bg-gray-800/40 hover:bg-gray-700/40 rounded-lg transition-colors">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-teal-500/20 rounded-full flex items-center justify-center text-teal-400 font-bold">
                        {friend.username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-white font-medium">{friend.username}</div>
                        <div className="text-gray-400 text-sm">Available to invite</div>
                      </div>
                    </div>
                    <button 
                      onClick={() => inviteFriend(friend.id, friend.username)}
                      disabled={isLoading}
                      className="px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      {isLoading ? 'Sending...' : 'Invite'}
                    </button>
                  </div>
                ))
              )}
            </div>
            
            {/* Footer */}
            <div className="p-4 border-t border-gray-700/50 bg-gray-800/20 rounded-b-xl">
              <button 
                onClick={() => setShowInviteFriends(false)}
                className="w-full px-4 py-2 border border-gray-600/40 hover:bg-gray-700/40 text-gray-300 hover:text-white rounded-lg transition-all duration-200 text-sm font-medium"
              >
                Back to Party Lobby
              </button>
            </div>
          </div>
        )}

          {/* Mobile Header - Compact */}
          <div className="p-3 border-b border-orange-500/30 bg-gradient-to-r from-orange-600/20 to-orange-700/20">
            {/* Drag Handle */}
            <div className="w-12 h-1 bg-gray-600 rounded-full mx-auto mb-3"></div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-orange-500/20 rounded-lg flex items-center justify-center border border-orange-500/30">
                  <svg className="w-3 h-3 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-white font-bold text-base">Party Lobby</h2>
                  <p className="text-orange-200 text-xs">Team up & play</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="w-8 h-8 text-gray-400 hover:text-white transition-colors flex items-center justify-center"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Mobile Content - Scrollable */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-3 space-y-3">
              {/* Error Display - Mobile */}
              {error && (
                <div className="p-2 bg-red-500/20 border border-red-500/40 rounded-lg">
                  <p className="text-red-400 text-xs">{error}</p>
                </div>
              )}

              {/* Party Invitations - Mobile Compact */}
              {partyInvitations.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-white font-semibold text-xs flex items-center space-x-1">
                    <svg className="w-3 h-3 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 002 2v10a2 2 0 002 2z" />
                    </svg>
                    <span>Invites ({partyInvitations.length})</span>
                  </h3>
                  {partyInvitations.map((invite) => (
                    <div key={invite.id} className="flex items-center justify-between p-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 bg-yellow-500/20 rounded-full flex items-center justify-center text-yellow-400 font-bold text-xs">
                          {invite.fromUsername.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-white font-medium text-xs">{invite.fromUsername}</div>
                          <div className="text-gray-400 text-xs">{invite.partyName}</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1">
                        <button 
                          onClick={() => acceptInvitation(invite.id)}
                          disabled={isLoading}
                          className="px-2 py-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs font-medium rounded transition-colors"
                        >
                          ✓
                        </button>
                        <button 
                          onClick={() => declineInvitation(invite.id)}
                          disabled={isLoading}
                          className="px-2 py-1 bg-gray-600 hover:bg-gray-700 disabled:opacity-50 text-white text-xs font-medium rounded transition-colors"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Current Party or Create Party - Mobile */}
              {!currentParty ? (
                <button 
                  onClick={createParty}
                  disabled={isLoading}
                  className="w-full p-3 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-500 hover:to-orange-600 disabled:opacity-50 rounded-lg transition-all duration-200"
                >
                  <div className="flex items-center justify-center space-x-2">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span className="text-white font-semibold text-sm">Create Party</span>
                  </div>
                </button>
              ) : (
                <div className="space-y-3">
                  {/* Active Party Info - Mobile Compact */}
                  <div className="bg-gray-800/40 rounded-lg p-2">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-white font-semibold text-xs">Active Party</h3>
                      <div className="px-2 py-1 bg-green-500/20 border border-green-500/30 rounded text-green-400 text-xs font-medium">
                        {currentParty.memberCount}/2
                      </div>
                    </div>

                    {/* Party Members - Mobile */}
                    <div className="space-y-1">
                      {currentParty.members?.map((member) => (
                        <div key={member.id} className="flex items-center space-x-2 p-1">
                          <div className="w-6 h-6 bg-orange-500/20 rounded-full flex items-center justify-center text-orange-400 font-bold text-xs">
                            {member.username.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1">
                            <div className="text-white font-medium text-xs">{member.username}</div>
                          </div>
                          {member.role === 'owner' && (
                            <div className="text-yellow-400 text-xs">👑</div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Party Actions - Mobile */}
                    <div className="flex space-x-2 mt-2 pt-2 border-t border-gray-700/50">
                      <button 
                        onClick={() => setShowInviteFriends(true)}
                        disabled={isLoading}
                        className="flex-1 px-2 py-1 border border-orange-500/40 hover:bg-orange-500/10 disabled:opacity-50 text-orange-400 hover:text-orange-300 rounded transition-all duration-200 text-xs font-medium"
                      >
                        Invite
                      </button>
                      <button 
                        onClick={leaveParty}
                        disabled={isLoading}
                        className="px-2 py-1 bg-red-600/20 border border-red-500/40 hover:bg-red-600/30 disabled:opacity-50 text-red-400 hover:text-red-300 rounded transition-all duration-200 text-xs font-medium"
                      >
                        Leave
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Room Selection - Mobile Optimized */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-white font-semibold text-xs">
                    {currentParty ? 'Select Room' : 'Quick Play'}
                  </h3>
                </div>

                {/* Owner-Only Access Control - Mobile */}
                {currentParty && (
                  (() => {
                    const isOwner = currentParty.members?.some(member => 
                      member.id === userId && member.role === 'owner'
                    )
                    
                    if (!isOwner) {
                      return (
                        <div className="p-2 bg-blue-500/10 border border-blue-500/30 rounded-lg text-center">
                          <div className="flex items-center justify-center space-x-1 mb-1">
                            <svg className="w-3 h-3 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                            <span className="text-blue-400 font-semibold text-xs">Owner Only</span>
                          </div>
                          <p className="text-blue-300 text-xs">Wait for {currentParty.ownerUsername} to start</p>
                        </div>
                      )
                    }
                    return null
                  })()
                )}
                
                {/* Mobile Room Grid - 2x2 for portrait, 4x1 for landscape */}
                <div className="grid grid-cols-2 portrait:grid-cols-2 landscape:grid-cols-4 gap-2">
                  {[
                    { name: 'Practice', roomType: 'practice', fee: 0, color: 'green' },
                    { name: '$1', roomType: '$1', fee: 1, color: 'blue' },
                    { name: '$5', roomType: '$5', fee: 5, color: 'purple' },
                    { name: '$25', roomType: '$25', fee: 25, color: 'red' }
                  ].map((room) => {
                    // Same logic as desktop for affordability
                    let canAfford = true
                    let disableReason = null
                    let isOwner = true
                    
                    if (currentParty) {
                      isOwner = currentParty.members?.some(member => 
                        member.id === userId && member.role === 'owner'
                      )
                      
                      if (!isOwner) {
                        canAfford = false
                        disableReason = 'Owner only'
                      } else {
                        const affordabilityCheck = canPartyAffordRoom(room.fee)
                        canAfford = affordabilityCheck.canAfford
                        
                        if (!canAfford && affordabilityCheck.insufficientMembers.length > 0) {
                          disableReason = 'Need funds'
                        }
                        
                        if (currentParty.memberCount > 2) {
                          canAfford = false
                          disableReason = 'Party full'
                        }
                      }
                    } else {
                      canAfford = userBalance >= room.fee
                      if (!canAfford && room.fee > 0) {
                        disableReason = 'Need funds'
                      }
                    }
                    
                    return (
                      <button 
                        key={room.roomType}
                        onClick={() => canAfford ? joinRoom(room.roomType, room.fee) : null}
                        disabled={isLoading || !canAfford}
                        className={`relative p-2 rounded-lg transition-all duration-200 ${
                          canAfford 
                            ? `bg-${room.color}-600/20 border border-${room.color}-500/40 hover:bg-${room.color}-600/30 cursor-pointer` 
                            : 'bg-gray-600/20 border border-gray-500/40 opacity-50 cursor-not-allowed'
                        }`}
                        title={disableReason || `Join ${room.name} room`}
                      >
                        <div className={`${
                          canAfford ? `text-${room.color}-400` : 'text-gray-500'
                        } font-bold text-xs`}>
                          {room.name}
                        </div>
                        <div className="text-gray-400 text-xs">
                          {canAfford ? (currentParty ? 'Party' : 'Solo') : disableReason}
                        </div>
                        
                        {/* Mobile Warning Indicators */}
                        {!canAfford && (currentParty ? !isOwner : room.fee > 0) && (
                          <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs font-bold">!</span>
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Invite Friends Overlay */}
          {showInviteFriends && (
            <div className="absolute inset-0 bg-gray-900 rounded-t-2xl z-[70] flex flex-col">
              {/* Mobile Invite Header */}
              <div className="p-3 border-b border-teal-500/30 bg-gradient-to-r from-teal-600/20 to-teal-700/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 bg-teal-500/20 rounded-lg flex items-center justify-center border border-teal-500/30">
                      <svg className="w-3 h-3 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-white font-bold text-sm">Invite Friends</h3>
                      <p className="text-teal-200 text-xs">Invite to party</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowInviteFriends(false)}
                    className="w-6 h-6 text-gray-400 hover:text-white transition-colors flex items-center justify-center"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              
              {/* Mobile Invite Content */}
              <div className="flex-1 p-3 space-y-2 overflow-y-auto">
                {invitableFriends.length === 0 ? (
                  <div className="text-center py-6">
                    <div className="w-12 h-12 bg-teal-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                      <svg className="w-6 h-6 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                      </svg>
                    </div>
                    <p className="text-gray-400 text-sm">No friends available</p>
                    <p className="text-gray-500 text-xs mt-1">Add friends first</p>
                  </div>
                ) : (
                  invitableFriends.map((friend) => (
                    <div key={friend.id} className="flex items-center justify-between p-2 bg-gray-800/40 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-teal-500/20 rounded-full flex items-center justify-center text-teal-400 font-bold text-xs">
                          {friend.username.charAt(0).toUpperCase()}
                        </div>
                        <div className="text-white font-medium text-xs">{friend.username}</div>
                      </div>
                      <button 
                        onClick={() => inviteFriend(friend.id, friend.username)}
                        disabled={isLoading}
                        className="px-3 py-1 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-medium rounded transition-colors"
                      >
                        {isLoading ? '...' : 'Invite'}
                      </button>
                    </div>
                  ))
                )}
              </div>
              
              {/* Mobile Invite Footer */}
              <div className="p-3 border-t border-gray-700/50 bg-gray-800/20">
                <button 
                  onClick={() => setShowInviteFriends(false)}
                  className="w-full px-3 py-2 border border-gray-600/40 hover:bg-gray-700/40 text-gray-300 hover:text-white rounded-lg transition-all duration-200 text-xs font-medium"
                >
                  Back to Party Lobby
                </button>
              </div>
            </div>
          )}

          {/* Mobile Loading Overlay */}
          {isLoading && (
            <div className="absolute inset-0 bg-black/50 rounded-t-2xl flex items-center justify-center">
              <div className="bg-gray-800 rounded-lg p-3 flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-400"></div>
                <span className="text-white text-sm">Loading...</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}