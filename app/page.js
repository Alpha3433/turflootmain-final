'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import ServerBrowserModal from '@/components/ServerBrowserModal'

export default function TurfLootTactical() {
  const router = useRouter()
  const [selectedStake, setSelectedStake] = useState('$1')
  const [liveStats, setLiveStats] = useState({ players: 0, winnings: 0 })
  const [userName, setUserName] = useState('anth')
  const [isMobile, setIsMobile] = useState(false)
  const [activeFriends, setActiveFriends] = useState(0)
  const [leaderboard, setLeaderboard] = useState([])
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState(null)
  const [customUsername, setCustomUsername] = useState('')
  const [isServerBrowserOpen, setIsServerBrowserOpen] = useState(false)

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
    // Check if mobile
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768)
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
    
    // Check for Privy authentication state
    const checkPrivyAuth = () => {
      if (typeof window !== 'undefined' && window.__TURFLOOT_PRIVY__) {
        const privyState = window.__TURFLOOT_PRIVY__
        setIsAuthenticated(privyState.authenticated || false)
        setUser(privyState.user || null)
      }
    }
    
    // Check auth state periodically
    checkPrivyAuth()
    const authCheckInterval = setInterval(checkPrivyAuth, 1000)
    
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
    const loadParties = () => {
      const partiesList = modal.querySelector('#parties-list')
      
      // Mock data for demonstration - in production, this would fetch from API
      const mockPublicParties = [
        { id: 'party-1', name: 'Elite Squad', host: 'Player123', members: 2, maxMembers: 4, privacy: 'public' },
        { id: 'party-2', name: 'Night Hawks', host: 'GamerX', members: 3, maxMembers: 6, privacy: 'public' },
        { id: 'party-3', name: 'Thunder Force', host: 'ProPlayer', members: 1, maxMembers: 4, privacy: 'public' }
      ]
      
      const mockFriendsParties = [
        { id: 'party-4', name: 'Friends Squad', host: 'BestFriend', members: 2, maxMembers: 4, privacy: 'private' },
        { id: 'party-5', name: 'Weekend Warriors', host: 'GameBuddy', members: 1, maxMembers: 3, privacy: 'private' }
      ]
      
      const parties = currentTab === 'public' ? mockPublicParties : mockFriendsParties
      
      if (parties.length === 0) {
        partiesList.innerHTML = `
          <div style="text-align: center; padding: 40px; color: #a0aec0;">
            <div style="font-size: 48px; margin-bottom: 16px;">👥</div>
            <div style="font-size: 18px; font-weight: 600; margin-bottom: 8px;">No ${currentTab} parties found</div>
            <div style="font-size: 14px;">Try refreshing or check back later</div>
          </div>
        `
        return
      }
      
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
                Host: ${party.host} • Members: ${party.members}/${party.maxMembers}
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
          selectedParty = item.dataset.partyId
          
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
              joinButton.addEventListener('click', () => {
                console.log('🚀 Joining party:', selectedParty)
                // Here you would implement the actual join party logic
                // For now, just show a success message and close popup
                alert('Successfully joined party! (Mock implementation)')
                popup.remove()
              })
              buttonContainer.appendChild(joinButton)
            }
          }
        })
        
        // Add hover effects
        item.addEventListener('mouseenter', () => {
          if (selectedParty !== item.dataset.partyId) {
            item.style.background = 'rgba(45, 55, 72, 0.8)'
          }
        })
        
        item.addEventListener('mouseleave', () => {
          if (selectedParty !== item.dataset.partyId) {
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

        <!-- Max Players Setting -->
        <div style="margin-bottom: 32px;">
          <label style="display: block; color: #fc8181; font-size: 14px; font-weight: 600; text-transform: uppercase; margin-bottom: 12px;">
            MAX PLAYERS
          </label>
          <div style="display: flex; gap: 8px;">
            ${[2, 4, 6, 8].map(num => `
              <div style="flex: 1; padding: 12px; background: rgba(45, 55, 72, 0.5); border: 2px solid ${num === 4 ? '#fc8181' : '#4a5568'}; border-radius: 8px; cursor: pointer; text-align: center; color: ${num === 4 ? '#fc8181' : '#a0aec0'}; font-weight: 600;" class="max-players-option" data-players="${num}">
                ${num}
              </div>
            `).join('')}
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

    // Add interactivity
    let selectedPrivacy = 'public'
    let selectedMaxPlayers = 4

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

    // Max players selection
    const maxPlayersOptions = modal.querySelectorAll('.max-players-option')
    maxPlayersOptions.forEach(option => {
      option.addEventListener('click', () => {
        selectedMaxPlayers = parseInt(option.dataset.players)
        maxPlayersOptions.forEach(opt => {
          opt.style.border = '2px solid #4a5568'
          opt.style.color = '#a0aec0'
        })
        option.style.border = '2px solid #fc8181'
        option.style.color = '#fc8181'
      })
    })

    // Close functionality
    const closeButtons = modal.querySelectorAll('#close-create-party, #cancel-create-party')
    closeButtons.forEach(btn => {
      btn.addEventListener('click', () => popup.remove())
    })

    // Create party functionality
    modal.querySelector('#create-party-btn').addEventListener('click', () => {
      const partyName = modal.querySelector('#party-name-input').value.trim()
      
      if (!partyName) {
        modal.querySelector('#party-name-input').style.border = '2px solid #e53e3e'
        modal.querySelector('#party-name-input').focus()
        return
      }

      console.log('🎯 Creating party:', {
        name: partyName,
        privacy: selectedPrivacy,
        maxPlayers: selectedMaxPlayers
      })

      // Here you would typically make an API call to create the party
      // For now, we'll show a success message and close
      alert(`Party "${partyName}" created successfully!\\n\\nPrivacy: ${selectedPrivacy.toUpperCase()}\\nMax Players: ${selectedMaxPlayers}`)
      popup.remove()
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

    // Focus on party name input
    setTimeout(() => {
      modal.querySelector('#party-name-input').focus()
    }, 100)

    popup.appendChild(modal)
    document.body.appendChild(popup)

    console.log('🎯 Desktop create party popup created with direct DOM manipulation')
  }

  const handleLogin = async () => {
    try {
      if (typeof window !== 'undefined' && window.__TURFLOOT_PRIVY__) {
        console.log('🔐 Attempting Privy login...')
        await window.__TURFLOOT_PRIVY__.login()
      } else {
        console.error('❌ Privy not available')
      }
    } catch (error) {
      console.error('❌ Login error:', error)
    }
  }

  const handleLogout = async () => {
    try {
      if (typeof window !== 'undefined' && window.__TURFLOOT_PRIVY__) {
        console.log('🔐 Attempting Privy logout...')
        await window.__TURFLOOT_PRIVY__.logout()
        setIsAuthenticated(false)
        setUser(null)
      } else {
        console.error('❌ Privy not available')
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
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
    width: '100%'
  }

  // Desktop Layout
  if (!isMobile) {
    return (
      <div style={containerStyle}>
        
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
              PLAYER: {isAuthenticated ? 
                (customUsername || user?.email?.address?.split('@')[0] || user?.wallet?.address?.slice(0, 8) || 'USER').toUpperCase() : 
                (customUsername || userName).toUpperCase()
              }
            </span>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {[1, 2, 3].map(i => (
              <div 
                key={i}
                style={{ 
                  width: '32px', 
                  height: '32px', 
                  background: 'rgba(26, 32, 44, 0.8)', 
                  border: '2px solid #68d391',
                  borderRadius: '4px',
                  boxShadow: '0 0 15px rgba(104, 211, 145, 0.3)'
                }}
              />
            ))}
            
            {/* Login/Logout Button */}
            {isAuthenticated ? (
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
                🔐 LOGIN
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
              <div style={{
                width: '56px',
                height: '56px',
                background: 'linear-gradient(45deg, #f6ad55 0%, #ed8936 100%)',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#1a202c',
                fontWeight: '800',
                fontSize: '24px',
                boxShadow: '0 0 30px rgba(246, 173, 85, 0.6)',
                border: '2px solid #f6ad55',
                fontFamily: '"Rajdhani", sans-serif'
              }}>
                0
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
            {['$1', '$5', '$20'].map((stake) => (
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

          {/* Main Deploy Button */}
          <button 
            onClick={handleJoinGame}
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
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
            <button 
              style={secondaryButtonStyle}
              onClick={() => {
                console.log('SERVER BROWSER button clicked!')
                console.log('Current isServerBrowserOpen:', isServerBrowserOpen)
                setIsServerBrowserOpen(true)
                console.log('Set isServerBrowserOpen to true')
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
              style={secondaryButtonStyle}
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
            <div style={{ 
              ...iconStyle, 
              background: 'linear-gradient(45deg, #f6ad55 0%, #ed8936 100%)', 
              color: '#1a202c',
              boxShadow: '0 0 20px rgba(246, 173, 85, 0.6)',
              border: '2px solid #f6ad55'
            }}>🎯</div>
            <h3 style={{ color: '#68d391', fontWeight: '700', fontSize: '18px', margin: 0, fontFamily: '"Rajdhani", sans-serif', textShadow: '0 0 10px rgba(104, 211, 145, 0.6)', textTransform: 'uppercase' }}>LEADERBOARD</h3>
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
            <div style={{ 
              ...iconStyle, 
              background: 'linear-gradient(45deg, #68d391 0%, #48bb78 100%)', 
              color: '#1a202c',
              boxShadow: '0 0 20px rgba(104, 211, 145, 0.6)',
              border: '2px solid #68d391'
            }}>💰</div>
            <h3 style={{ color: '#f6ad55', fontWeight: '700', fontSize: '18px', margin: 0, fontFamily: '"Rajdhani", sans-serif', textShadow: '0 0 10px rgba(246, 173, 85, 0.6)', textTransform: 'uppercase' }}>WALLET</h3>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
              <button style={{ fontSize: '11px', color: '#f6ad55', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '600', fontFamily: '"Rajdhani", sans-serif' }}>[?] CACHE_LOC</button>
              <button style={{ fontSize: '11px', color: '#f6ad55', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '600', fontFamily: '"Rajdhani", sans-serif' }}>[↻] RESUPPLY</button>
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
            }}>$0.00</div>
            <div style={{ color: '#f6ad55', fontSize: '14px', fontWeight: '600', fontFamily: '"Rajdhani", sans-serif' }}>0.0000 SOL</div>
          </div>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            <button style={{
              flex: 1,
              padding: '14px',
              background: 'rgba(104, 211, 145, 0.2)',
              border: '2px solid #68d391',
              borderRadius: '4px',
              color: '#68d391',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: '0 0 15px rgba(104, 211, 145, 0.3)',
              fontFamily: '"Rajdhani", sans-serif',
              textTransform: 'uppercase'
            }}>
              DEPOSIT
            </button>
            <button style={{
              flex: 1,
              padding: '14px',
              background: 'rgba(252, 129, 129, 0.2)',
              border: '2px solid #fc8181',
              borderRadius: '4px',
              color: '#fc8181',
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
            <div style={{ 
              ...iconStyle, 
              background: 'linear-gradient(45deg, #fc8181 0%, #e53e3e 100%)', 
              color: '#ffffff',
              boxShadow: '0 0 20px rgba(252, 129, 129, 0.6)',
              border: '2px solid #fc8181'
            }}>👥</div>
            <h3 style={{ color: '#68d391', fontWeight: '700', fontSize: '18px', margin: 0, fontFamily: '"Rajdhani", sans-serif', textShadow: '0 0 10px rgba(104, 211, 145, 0.6)', textTransform: 'uppercase' }}>PARTY</h3>
            <div style={{ marginLeft: 'auto' }}>
              <button 
                onClick={() => {
                  // Refresh friends list logic
                  setActiveFriends(Math.floor(Math.random() * 5)) // Simulate refreshing with random count
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
                [↻] REFRESH
              </button>
            </div>
          </div>
          
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{
              width: '56px',
              height: '56px',
              background: 'rgba(26, 32, 44, 0.8)',
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
            <div style={{ color: '#68d391', fontSize: '12px', fontFamily: '"Rajdhani", sans-serif', textTransform: 'uppercase' }}>INVITE FRIENDS</div>
          </div>
          
          <button 
            onClick={() => createDesktopJoinPartyPopup()}
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
            onClick={() => createDesktopCreatePartyPopup()}
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
          bottom: '120px',
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
            <div style={{ 
              ...iconStyle, 
              background: 'linear-gradient(45deg, #8b5cf6 0%, #7c3aed 100%)', 
              color: '#ffffff',
              boxShadow: '0 0 20px rgba(139, 92, 246, 0.6)',
              border: '2px solid #8b5cf6'
            }}>🎯</div>
            <h3 style={{ color: '#f6ad55', fontWeight: '700', fontSize: '18px', margin: 0, fontFamily: '"Rajdhani", sans-serif', textShadow: '0 0 10px rgba(246, 173, 85, 0.6)', textTransform: 'uppercase' }}>CUSTOMIZE</h3>
          </div>
          
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <div style={{
              width: '72px',
              height: '72px',
              background: 'linear-gradient(135deg, rgba(252, 129, 129, 0.3) 0%, rgba(229, 62, 62, 0.5) 100%)',
              border: '2px solid #fc8181',
              borderRadius: '50%',
              margin: '0 auto 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              boxShadow: '0 0 30px rgba(252, 129, 129, 0.4)'
            }}>
              {/* Central core */}
              <div style={{
                width: '24px',
                height: '24px',
                backgroundColor: '#fc8181',
                borderRadius: '50%',
                boxShadow: '0 0 15px #fc8181',
                position: 'relative'
              }}>
                {/* Inner glow */}
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '12px',
                  height: '12px',
                  backgroundColor: '#ffffff',
                  borderRadius: '50%',
                  opacity: 0.8
                }} />
              </div>
              
              {/* Orbital dots */}
              <div style={{
                position: 'absolute',
                width: '8px',
                height: '8px',
                backgroundColor: '#68d391',
                borderRadius: '50%',
                top: '16px',
                left: '50%',
                transform: 'translateX(-50%)',
                boxShadow: '0 0 8px #68d391'
              }} />
              <div style={{
                position: 'absolute',
                width: '8px',
                height: '8px',
                backgroundColor: '#68d391',
                borderRadius: '50%',
                bottom: '16px',
                left: '50%',
                transform: 'translateX(-50%)',
                boxShadow: '0 0 8px #68d391'
              }} />
              <div style={{
                position: 'absolute',
                width: '8px',
                height: '8px',
                backgroundColor: '#68d391',
                borderRadius: '50%',
                left: '16px',
                top: '50%',
                transform: 'translateY(-50%)',
                boxShadow: '0 0 8px #68d391'
              }} />
              <div style={{
                position: 'absolute',
                width: '8px',
                height: '8px',
                backgroundColor: '#68d391',
                borderRadius: '50%',
                right: '16px',
                top: '50%',
                transform: 'translateY(-50%)',
                boxShadow: '0 0 8px #68d391'
              }} />
            </div>
          </div>
          
          <button style={{
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
          
          <button style={{
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



        {/* Communications Button - Repositioned */}
        <div style={{
          position: 'absolute',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
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
            📡 DISCORD
          </button>
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
        `}</style>
      </div>
    )
  }

  // Mobile Layout
  return (
    <div style={containerStyle}>
      
      {/* Mobile Tactical Background (Simplified) */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 1,
        overflow: 'hidden'
      }}>
        
        {/* Mobile Grid */}
        <div style={{
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
        }} />

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
      <div style={mobileContainerStyle}>
        
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
            }}>PLAYER: {userName.toUpperCase()}</span>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {[1, 2, 3].map(i => (
              <div 
                key={i}
                style={{ 
                  width: '24px', 
                  height: '24px', 
                  background: 'rgba(26, 32, 44, 0.8)', 
                  border: '2px solid #68d391',
                  borderRadius: '3px',
                  boxShadow: '0 0 10px rgba(104, 211, 145, 0.3)'
                }}
              />
            ))}
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
                value={customUsername || userName}
                onChange={(e) => setCustomUsername(e.target.value)}
                style={nameInputStyle}
                placeholder="USERNAME"
              />
              <div 
                onClick={() => {
                  // Username confirmed - set the custom username to override any authenticated name
                  const currentInputValue = customUsername || userName
                  setCustomUsername(currentInputValue)
                  console.log('Username confirmed and set:', currentInputValue)
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
            {['$1', '$5', '$20'].map((stake) => (
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

          {/* Secondary Buttons */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button style={secondaryButtonStyle}>LEADERBOARD</button>
            <button style={secondaryButtonStyle}>HOW TO PLAY</button>
          </div>
        </div>

        {/* Mobile Stats */}
        <div style={statsStyle}>
          <div style={statItemStyle}>
            <div style={statNumberStyle}>{liveStats.players}</div>
            <div style={statLabelStyle}>OPERATIVES</div>
          </div>
          <div style={statItemStyle}>
            <div style={statNumberStyle}>${liveStats.winnings.toLocaleString()}</div>
            <div style={statLabelStyle}>TOTAL WINNINGS</div>
          </div>
        </div>

        {/* Mobile Panels Grid */}
        <div style={mobileGridStyle}>
          {/* Command Panel */}
          <div style={tacticalPanelStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <div style={{ 
                ...iconStyle, 
                background: 'linear-gradient(45deg, #f6ad55 0%, #ed8936 100%)', 
                color: '#1a202c',
                boxShadow: '0 0 15px rgba(246, 173, 85, 0.6)',
                border: '1px solid #f6ad55'
              }}>🎯</div>
              <h3 style={{ color: '#68d391', fontWeight: '700', fontSize: '12px', margin: 0, fontFamily: '"Rajdhani", sans-serif' }}>SERVER BROWSER</h3>
            </div>
            
            <div style={{ marginBottom: '12px', fontSize: '11px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid rgba(104, 211, 145, 0.2)' }}>
                <span style={{ color: '#e2e8f0', fontWeight: '600', fontFamily: '"Rajdhani", sans-serif' }}>ALPHA_STRIKE</span>
                <span style={{ color: '#f6ad55', fontWeight: '700', fontFamily: '"Rajdhani", sans-serif' }}>$6.5K</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid rgba(104, 211, 145, 0.2)' }}>
                <span style={{ color: '#e2e8f0', fontWeight: '600', fontFamily: '"Rajdhani", sans-serif' }}>VIPER_UNIT</span>
                <span style={{ color: '#f6ad55', fontWeight: '700', fontFamily: '"Rajdhani", sans-serif' }}>$5.2K</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                <span style={{ color: '#e2e8f0', fontWeight: '600', fontFamily: '"Rajdhani", sans-serif' }}>GHOST_OPS</span>
                <span style={{ color: '#f6ad55', fontWeight: '700', fontFamily: '"Rajdhani", sans-serif' }}>$4.7K</span>
              </div>
            </div>
            
            <button style={{
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
              FULL INTEL
            </button>
          </div>

          {/* Arsenal Panel */}
          <div style={ambrerPanelStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <div style={{ 
                ...iconStyle, 
                background: 'linear-gradient(45deg, #68d391 0%, #48bb78 100%)', 
                color: '#1a202c',
                boxShadow: '0 0 15px rgba(104, 211, 145, 0.6)',
                border: '1px solid #68d391'
              }}>💰</div>
              <h3 style={{ color: '#f6ad55', fontWeight: '700', fontSize: '12px', margin: 0, fontFamily: '"Rajdhani", sans-serif' }}>WALLET</h3>
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
              }}>$0.00</div>
              <div style={{ color: '#f6ad55', fontSize: '9px', fontWeight: '600', fontFamily: '"Rajdhani", sans-serif' }}>0.0000 SOL</div>
            </div>
            
            <div style={{ display: 'flex', gap: '6px' }}>
              <button style={{
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
                DEPOSIT
              </button>
              <button style={{
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

          {/* Squad Panel */}
          <div style={tacticalPanelStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <div style={{ 
                ...iconStyle, 
                background: 'linear-gradient(45deg, #fc8181 0%, #e53e3e 100%)', 
                color: '#ffffff',
                boxShadow: '0 0 15px rgba(252, 129, 129, 0.6)',
                border: '1px solid #fc8181'
              }}>👥</div>
              <h3 style={{ color: '#68d391', fontWeight: '700', fontSize: '12px', margin: 0, fontFamily: '"Rajdhani", sans-serif' }}>SQUAD</h3>
            </div>
            
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
              <div style={{ color: '#e2e8f0', fontSize: '10px', fontWeight: '600', fontFamily: '"Rajdhani", sans-serif' }}>NO SQUAD</div>
            </div>
            
            <button style={{
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
              RECRUIT
            </button>
          </div>

          {/* Loadout Panel */}
          <div style={ambrerPanelStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <div style={{ 
                ...iconStyle, 
                background: 'linear-gradient(45deg, #8b5cf6 0%, #7c3aed 100%)', 
                color: '#ffffff',
                boxShadow: '0 0 15px rgba(139, 92, 246, 0.6)',
                border: '1px solid #8b5cf6'
              }}>🎯</div>
              <h3 style={{ color: '#f6ad55', fontWeight: '700', fontSize: '12px', margin: 0, fontFamily: '"Rajdhani", sans-serif' }}>LOADOUT</h3>
            </div>
            
            <div style={{ textAlign: 'center', marginBottom: '12px' }}>
              <div style={{
                width: '40px',
                height: '40px',
                background: 'linear-gradient(135deg, rgba(252, 129, 129, 0.3) 0%, rgba(229, 62, 62, 0.5) 100%)',
                border: '1px solid #fc8181',
                borderRadius: '3px',
                margin: '0 auto 8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                boxShadow: '0 0 20px rgba(252, 129, 129, 0.4)'
              }}>
                <div style={{
                  width: '5px',
                  height: '5px',
                  backgroundColor: '#68d391',
                  borderRadius: '50%',
                  position: 'absolute',
                  top: '12px',
                  left: '12px',
                  boxShadow: '0 0 5px #68d391'
                }} />
                <div style={{
                  width: '5px',
                  height: '5px',
                  backgroundColor: '#68d391',
                  borderRadius: '50%',
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  boxShadow: '0 0 5px #68d391'
                }} />
              </div>
            </div>
            
            <button style={{
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
              🎯 UPGRADE
            </button>
            
            <button style={{
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
              MODIFY
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