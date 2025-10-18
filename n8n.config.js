module.exports = {
  // Server configuration
  port: 5678,
  host: 'localhost',
  protocol: 'http',
  editorBaseUrl: 'http://localhost:5678',
  
  // Database configuration (using SQLite for simplicity)
  database: {
    type: 'sqlite',
    database: './n8n-database.sqlite',
    poolSize: 5
  },
  
  // Security configuration
  encryptionKey: 'lovly-prop-ai-n8n-encryption-key-2024',
  userManagement: {
    disabled: false
  },
  
  // Logging
  logging: {
    level: 'info',
    console: true
  },
  
  // Webhook configuration
  webhookUrl: 'http://localhost:5678/',
  
  // Timezone
  timezone: 'UTC',
  
  // Execution settings
  execution: {
    timeout: 3600,
    maxTimeout: 3600
  },
  
  // Environment variables
  environment: 'production',
  
  // Task runners
  runners: {
    enabled: true
  },
  
  // Security settings
  blockEnvAccessInNode: false,
  gitNodeDisableBareRepos: true
};
