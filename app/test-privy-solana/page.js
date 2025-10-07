'use client'

import React, { useMemo, useState } from 'react'
import { usePrivy, useWallets } from '../../frontend/utils/privyClient'

function pickDefaultSolanaWallet(wallets) {
  return (
    wallets.find(w => w.chainType === 'solana' && w.walletClientType === 'privy') ||
    wallets.find(w => w.chainType === 'solana') ||
    null
  )
}

function toHex(u8) {
  return Array.from(u8).map(b => b.toString(16).padStart(2, '0')).join('')
}

export default function TestPrivySolana() {
  const { ready, authenticated, user, login, logout } = usePrivy()
  const { wallets } = useWallets()

  const solWallets = useMemo(
    () => wallets.filter(w => w.chainType === 'solana'),
    [wallets]
  )

  const defaultSol = useMemo(() => pickDefaultSolanaWallet(solWallets), [solWallets])

  const [status, setStatus] = useState('')
  const [sig, setSig] = useState('')

  async function runTest() {
    setStatus('')
    setSig('')

    if (!ready) return setStatus('Privy not ready yet.')
    if (!authenticated) return setStatus('Please sign in first.')

    if (!defaultSol) {
      return setStatus('❌ No Solana wallet found (expected an embedded wallet).')
    }

    setStatus(`Found Solana wallet: ${defaultSol.address} (${defaultSol.walletClientType})`)

    // Sign a test message to prove we control the key
    const msg = new TextEncoder().encode('TurfLoot Solana Wallet Test')
    if (typeof defaultSol.signMessage !== 'function') {
      return setStatus(
        'Wallet does not expose signMessage(). Ensure you are on a recent Privy SDK.'
      )
    }
    try {
      const signed = await defaultSol.signMessage(msg)

      // Some SDKs return Uint8Array, some base64/base58/string – normalize
      let display
      if (signed instanceof Uint8Array) display = toHex(signed)
      else if (typeof signed === 'string') display = signed
      else display = String(signed)

      setSig(display)
      setStatus('✅ Message signed successfully.')
    } catch (e) {
      setStatus(`❌ signMessage failed: ${e?.message || e}`)
    }
  }

  const btn = {
    padding: '10px 14px',
    borderRadius: '10px',
    border: '1px solid #ddd',
    cursor: 'pointer',
    background: '#111',
    color: '#fff',
    fontSize: '14px'
  }

  const btnSecondary = {
    ...btn,
    background: '#fff',
    color: '#111'
  }

  return (
    <div style={{ maxWidth: '820px', margin: '40px auto', padding: '24px', fontFamily: 'ui-sans-serif, system-ui' }}>
      <h1 style={{ color: '#14F195', marginBottom: '8px' }}>TurfLoot × Privy × Solana – Configuration Test</h1>
      <p style={{ opacity: 0.7, marginBottom: '24px' }}>
        This page tests if our Solana-only Privy configuration is working correctly.
      </p>

      <section style={{ marginTop: '12px', padding: '12px', border: '1px solid #eee', borderRadius: '12px', backgroundColor: '#f9f9f9' }}>
        <h3 style={{ marginTop: 0, color: '#333' }}>Connection Status</h3>
        <div><b>Privy ready:</b> {String(ready)}</div>
        <div><b>Authenticated:</b> {String(authenticated)}</div>
        <div><b>User ID:</b> {user?.id || '—'}</div>
        <div><b>Total wallets:</b> {wallets.length}</div>
        <div><b>Solana wallets:</b> {solWallets.length}</div>
        <div style={{ marginTop: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {!authenticated ? (
            <button onClick={login} style={btn}>🔐 Sign in with Privy</button>
          ) : (
            <button onClick={logout} style={btnSecondary}>🔓 Sign out</button>
          )}
          <button onClick={runTest} style={btn}>🧪 Run Solana Wallet Test</button>
        </div>
      </section>

      <section style={{ marginTop: '16px', padding: '12px', border: '1px solid #eee', borderRadius: '12px', backgroundColor: '#f9f9f9' }}>
        <h3 style={{ marginTop: 0, color: '#333' }}>All Wallets Detected</h3>
        {wallets.length === 0 ? (
          <div style={{ fontStyle: 'italic', color: '#666' }}>— No wallets found —</div>
        ) : (
          <div>
            {wallets.map((w, i) => {
              const isEVM = w.address?.startsWith('0x')
              const isDefault = defaultSol && w.address === defaultSol.address
              
              return (
                <div key={i} style={{ 
                  lineHeight: '1.6', 
                  padding: '8px', 
                  margin: '4px 0',
                  borderRadius: '6px',
                  backgroundColor: isEVM ? '#ffe6e6' : '#e6ffe6',
                  border: isDefault ? '2px solid #14F195' : '1px solid transparent'
                }}>
                  <div style={{ fontSize: '12px', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                    {isEVM ? '❌ EVM: ' : '✅ SOL: '}{w.address}
                  </div>
                  <div style={{ fontSize: '11px', opacity: 0.8, marginTop: '2px' }}>
                    <b>Chain:</b> {w.chainType} | <b>Type:</b> {w.walletClientType}
                    {isDefault && <span style={{ marginLeft: '8px', padding: '2px 6px', borderRadius: '4px', background: '#14F195', color: 'white', fontSize: '10px' }}>DEFAULT</span>}
                    {isEVM && <span style={{ marginLeft: '8px', padding: '2px 6px', borderRadius: '4px', background: '#ff4444', color: 'white', fontSize: '10px' }}>SHOULD NOT EXIST!</span>}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <section style={{ marginTop: '16px', padding: '12px', border: '1px solid #eee', borderRadius: '12px', backgroundColor: '#f9f9f9' }}>
        <h3 style={{ marginTop: 0, color: '#333' }}>Test Results</h3>
        <div style={{ marginBottom: '8px', padding: '8px', borderRadius: '6px', backgroundColor: status.includes('✅') ? '#e6ffe6' : status.includes('❌') ? '#ffe6e6' : '#fff' }}>
          {status || '— Click "Run Solana Wallet Test" to start —'}
        </div>
        {sig && (
          <>
            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Signature (proves wallet control):</div>
            <textarea 
              readOnly 
              value={sig} 
              style={{ 
                width: '100%', 
                height: '120px', 
                fontFamily: 'monospace', 
                fontSize: '11px',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px'
              }} 
            />
          </>
        )}
      </section>

      <section style={{ marginTop: '16px', padding: '12px', border: '1px solid #14F195', borderRadius: '12px', backgroundColor: '#f0fff8' }}>
        <h3 style={{ marginTop: 0, color: '#14F195' }}>Expected Results for Correct Configuration:</h3>
        <ul style={{ lineHeight: '1.6', color: '#333' }}>
          <li>✅ <b>Only Solana wallets</b> should appear (no EVM/0x addresses)</li>
          <li>✅ <b>Default wallet</b> should be chainType: 'solana', walletClientType: 'privy'</li>
          <li>✅ <b>Signing test</b> should succeed without errors</li>
          <li>❌ <b>If you see EVM wallets</b>, the Privy configuration is still creating them</li>
        </ul>
      </section>

      <div style={{ marginTop: '20px', padding: '12px', backgroundColor: '#f8f8f8', borderRadius: '8px', fontSize: '13px', opacity: 0.8 }}>
        <b>Debug Info:</b><br/>
        • Use a brand new email/account to test first-time user wallet creation<br/>
        • Check browser console for additional Privy debug logs<br/>
        • If EVM wallets still appear, check Privy Dashboard settings<br/>
        • Back to main app: <a href="/" style={{ color: '#14F195' }}>TurfLoot Home</a>
      </div>
    </div>
  )
}