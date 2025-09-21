module.exports = {
  apps: [
    {
      name: "turfloot-arena",
      script: "build/index.js",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production"
      }
    }
  ]
};