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

  // Get user ID
  const userId = user?.id || user?.privyId

  // Fetch current party status
  const fetchPartyStatus = useCallback(async () => {
    if (!userId) return
    
    try {
      const response = await fetch(`${getApiUrl('/api/party/current')}?userId=${userId}`)
      const data = await response.json()
      
      if (response.ok) {
        setCurrentParty(data.party)
      } else {
        console.error('Failed to fetch party status:', data.error)
      }
    } catch (error) {
      console.error('Error fetching party status:', error)
    }
  }, [userId])

  // Fetch party invitations
  const fetchPartyInvitations = useCallback(async () => {
    if (!userId) return
    
    try {
      const response = await fetch(`${getApiUrl('/api/party/invitations')}?userId=${userId}`)
      const data = await response.json()
      
      if (response.ok) {
        setPartyInvitations(data.invitations || [])
      } else {
        console.error('Failed to fetch invitations:', data.error)
      }
    } catch (error) {
      console.error('Error fetching invitations:', error)
    }
  }, [userId])

  // Fetch invitable friends for party
  const fetchInvitableFriends = useCallback(async () => {
    if (!userId || !currentParty) return
    
    try {
      const response = await fetch(`${getApiUrl('/api/party/invitable-friends')}?userId=${userId}&partyId=${currentParty.id}`)
      const data = await response.json()
      
      if (response.ok) {
        setInvitableFriends(data.friends || [])
      } else {
        console.error('Failed to fetch invitable friends:', data.error)
      }
    } catch (error) {
      console.error('Error fetching invitable friends:', error)
    }
  }, [userId, currentParty])

  // Initialize data
  useEffect(() => {
    fetchPartyStatus()
    fetchPartyInvitations()
  }, [fetchPartyStatus, fetchPartyInvitations])

  // Fetch invitable friends when party changes
  useEffect(() => {
    if (currentParty) {
      fetchInvitableFriends()
    }
  }, [currentParty, fetchInvitableFriends])

  // Create new party
  const createParty = async () => {
    if (!userId || !displayName) {
      setError('User information required to create party')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`${getApiUrl('/api/party/create')}`, {
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
        await fetchPartyStatus() // Refresh party data
      } else {
        setError(data.error || 'Failed to create party')
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

  // Join room with party (or solo)
  const joinRoom = async (roomType, entryFee = 0) => {
    setIsLoading(true)
    setError(null)

    try {
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
        console.log('✅ Successfully joined room:', data.lobbyId)
        
        // Navigate to game with party members
        if (onGameStart) {
          onGameStart({
            roomType,
            entryFee,
            lobbyId: data.lobbyId,
            partySize: data.partySize,
            partyMembers: data.partyMembers || []
          })
        }
        
        onClose() // Close the party lobby modal
      } else {
        setError(data.error || 'Failed to join room')
      }
    } catch (error) {
      console.error('❌ Error joining room:', error)
      setError('Failed to join room. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-start justify-end pt-20 pr-6 p-4" onClick={onClose}>
      <div 
        className="bg-gray-900 border border-orange-500/40 rounded-xl shadow-2xl w-full max-w-md max-h-[75vh] overflow-hidden animate-in fade-in duration-200 mt-4" 
        onClick={(e) => e.stopPropagation()}
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
              <h3 className="text-white font-semibold text-sm flex items-center space-x-2">
                <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span>Party Invites ({partyInvitations.length})</span>
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
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
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

          {/* Room Selection */}
          <div className="space-y-3">
            <h3 className="text-white font-semibold text-sm">
              {currentParty ? 'Select Room for Party' : 'Quick Play'}
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { name: 'Practice', roomType: 'practice', fee: 0, color: 'green' },
                { name: '$1', roomType: '$1', fee: 1, color: 'blue' },
                { name: '$5', roomType: '$5', fee: 5, color: 'purple' },
                { name: '$25', roomType: '$25', fee: 25, color: 'red' }
              ].map((room) => (
                <button 
                  key={room.roomType}
                  onClick={() => joinRoom(room.roomType, room.fee)}
                  disabled={isLoading}
                  className={`p-3 bg-${room.color}-600/20 border border-${room.color}-500/40 hover:bg-${room.color}-600/30 disabled:opacity-50 rounded-lg transition-all duration-200`}
                >
                  <div className={`text-${room.color}-400 font-bold text-sm`}>{room.name}</div>
                  <div className="text-gray-400 text-xs">
                    {currentParty ? `Party of ${currentParty.memberCount}` : 'Solo Play'}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Invite Friends Overlay - Takes over the entire modal */}
        {showInviteFriends && (
          <div className="absolute inset-0 bg-gray-900 rounded-xl z-10 flex flex-col">
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
    </div>
  )
}