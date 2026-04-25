/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack(config) {
    // Stub optional wagmi peer dependencies we don't use
    config.resolve.alias = {
      ...config.resolve.alias,
      'porto/internal':                    false,
      '@walletconnect/ethereum-provider':  false,
      '@safe-global/safe-apps-provider':   false,
      '@safe-global/safe-apps-sdk':        false,
      '@metamask/connect-evm':             false,
      'accounts':                          false,
      '@base-org/account':                 false,
    }
    return config
  },
}

export default nextConfig
