module.exports = {
  apps: [
    {
      name: "turfloot-arena-server",
      script: "build/index.js",
      instances: 1,
      exec_mode: "fork",
      node_args: "--max-old-space-size=2048",
      env: {
        NODE_ENV: "production",
        PORT: "2567"
      },
      env_production: {
        NODE_ENV: "production",
        PORT: "2567"
      }
    }
  ]
};