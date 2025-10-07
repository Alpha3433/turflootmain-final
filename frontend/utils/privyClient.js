'use client'

import * as PrivyReactAuth from '@privy-io/react-auth'

let warned = false
const warnOnce = (message) => {
  if (!warned) {
    console.warn(message)
    warned = true
  }
}

const fallbackPrivyValue = {
  ready: false,
  authenticated: false,
  user: null,
  login: async () => {
    warnOnce('Privy authentication is unavailable; falling back to mock handlers.')
    return null
  },
  logout: async () => {
    warnOnce('Privy authentication is unavailable; falling back to mock handlers.')
    return null
  },
  getAccessToken: async () => {
    warnOnce('Privy authentication is unavailable; falling back to mock handlers.')
    return null
  },
  connectWallet: async () => {
    warnOnce('Privy authentication is unavailable; falling back to mock handlers.')
    return null
  },
  linkWallet: async () => {
    warnOnce('Privy authentication is unavailable; falling back to mock handlers.')
    return null
  }
}

const fallbackWalletsValue = { wallets: [] }

const fallbackFundWalletValue = {
  fundWallet: async () => {
    warnOnce('Privy wallet funding is unavailable in this environment.')
    throw new Error('Privy wallet funding is not available')
  }
}

const ensureHook = (hook, fallbackValue) => {
  if (typeof hook === 'function') {
    return hook
  }
  return () => fallbackValue
}

export const usePrivy = ensureHook(PrivyReactAuth.usePrivy, fallbackPrivyValue)
export const useWallets = ensureHook(PrivyReactAuth.useWallets, fallbackWalletsValue)
export const useFundWallet = ensureHook(PrivyReactAuth.useFundWallet, fallbackFundWalletValue)
