const fs = require('fs-extra');
const path = require('path');

class EnvironmentConfig {
  constructor() {
    this.isTest = process.env.NODE_ENV === 'test' || process.argv.includes('--test') || process.argv.includes('--dev');
    this.loadEnvironment();
  }

  loadEnvironment() {
    if (this.isTest) {
      this.apiUrl = 'http://localhost:3001/api';
      this.dashboardUrl = 'http://localhost:3000';
    } else {
      this.apiUrl = 'https://handit-api-oss-299768392189.us-central1.run.app/api';
      this.dashboardUrl = 'https://dashboard.handit.ai';
    }
  }

  getApiUrl() {
    return this.apiUrl;
  }

  getDashboardUrl() {
    return this.dashboardUrl;
  }

  getCliAuthUrl() {
    return `${this.dashboardUrl}/cli-auth`;
  }

  isTestMode() {
    return this.isTest;
  }
}

module.exports = { EnvironmentConfig }; 