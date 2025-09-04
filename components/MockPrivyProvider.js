'use client'

import React, { createContext, useContext } from 'react'

// Mock Privy context
const MockPrivyContext = createContext({
  ready: true,
  authenticated: false,
  user: null,
  login: () => console.log('Mock login'),
  logout: () => console.log('Mock logout')
})

// Mock Privy hook
export function usePrivy() {
  return useContext(MockPrivyContext)
}

// Mock Privy provider
export default function MockPrivyProvider({ children }) {
  const mockValue = {
    ready: true,
    authenticated: false,
    user: null,
    login: () => console.log('Mock login'),
    logout: () => console.log('Mock logout')
  }

  return (
    <MockPrivyContext.Provider value={mockValue}>
      {children}
    </MockPrivyContext.Provider>
  )
}