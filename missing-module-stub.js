// Stub for missing WalletConnect modules during build
// This prevents build failures when WalletConnect modules are missing

module.exports = {};

// Export common interfaces that might be expected
module.exports.default = {};
module.exports.UniversalProvider = class UniversalProvider {
  constructor() {}
  connect() { return Promise.resolve({}); }
  disconnect() { return Promise.resolve(); }
};
module.exports.EthereumProvider = class EthereumProvider {
  constructor() {}
  connect() { return Promise.resolve({}); }
  disconnect() { return Promise.resolve(); }
};

// Prevent errors during import
if (typeof window !== 'undefined') {
  console.warn('Using WalletConnect stub - functionality limited');
}