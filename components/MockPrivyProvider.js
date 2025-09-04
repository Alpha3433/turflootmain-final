'use client'

import React, { createContext, useContext } from 'react'

// Mock Privy context with all required functions
const MockPrivyContext = createContext({
  ready: true,
  authenticated: false,
  user: null,
  login: () => console.log('Mock login'),
  logout: () => console.log('Mock logout'),
  connectWallet: () => console.log('Mock connect wallet')
})

// Mock Privy hook
export function usePrivy() {
  return useContext(MockPrivyContext)
}

// Mock wallets hook
export function useWallets() {
  return { wallets: [] }
}

// Mock fund wallet hook
export function useFundWallet() {
  return { fundWallet: () => console.log('Mock fund wallet') }
}

// Mock Privy provider
export default function MockPrivyProvider({ children }) {
  const mockValue = {
    ready: true,
    authenticated: false,
    user: null,
    login: () => console.log('Mock login'),
    logout: () => console.log('Mock logout'),
    connectWallet: () => console.log('Mock connect wallet')
  }

  return (
    <MockPrivyContext.Provider value={mockValue}>
      {children}
    </MockPrivyContext.Provider>
  )
}