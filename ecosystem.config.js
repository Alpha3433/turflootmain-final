module.exports = {
  apps: [
    {
      name: "turfloot-arena",
      script: "build/index.js",
      instances: 1,
      exec_mode: "fork",
      // No external env file references - use .env.production auto-loaded by @colyseus/tools
      env: {
        NODE_ENV: "production"
      }
    }
  ]
};