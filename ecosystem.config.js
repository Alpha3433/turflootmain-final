module.exports = {
  apps: [
    {
      name: "turfloot-arena",
      script: "build/index.js",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: process.env.PORT || 2567
      },
      error_file: "./logs/err.log",
      out_file: "./logs/out.log",
      log_file: "./logs/combined.log",
      time: true,
      // Restart configuration
      restart_delay: 4000,
      max_restarts: 5,
      min_uptime: "10s"
    }
  ]
};