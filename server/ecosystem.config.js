module.exports = {
  apps: [
    {
      name: "turfloot-arena-server",
      script: "build/index.js",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: "2567"
      }
    }
  ]
};