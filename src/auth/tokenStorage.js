const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

class TokenStorage {
  constructor() {
    this.configDir = path.join(os.homedir(), '.handit');
    this.tokensFile = path.join(this.configDir, 'tokens.json');
    this.encryptionKey = this.getEncryptionKey();
  }

  /**
   * Get or generate encryption key
   */
  getEncryptionKey() {
    const keyFile = path.join(this.configDir, '.key');
    
    try {
      if (fs.existsSync(keyFile)) {
        return fs.readFileSync(keyFile, 'utf8');
      }
    } catch (error) {
      // If we can't read the key, we'll generate a new one
    }

    // Generate a new encryption key
    const key = crypto.randomBytes(32).toString('hex');
    
    try {
      this.ensureConfigDir();
      fs.writeFileSync(keyFile, key, { mode: 0o600 }); // Read/write for owner only
      return key;
    } catch (error) {
      console.warn('Warning: Could not save encryption key, using fallback');
      return 'fallback-key-for-development-only';
    }
  }

  /**
   * Ensure config directory exists
   */
  ensureConfigDir() {
    if (!fs.existsSync(this.configDir)) {
      fs.mkdirSync(this.configDir, { mode: 0o700 }); // Read/write/execute for owner only
    }
  }

  /**
   * Simple encryption (for development - in production use proper encryption)
   */
  encrypt(text) {
    try {
      const algorithm = 'aes-256-cbc';
      const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(algorithm, key, iv);
      
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // Return IV + encrypted data
      return iv.toString('hex') + ':' + encrypted;
    } catch (error) {
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  /**
   * Simple decryption (for development - in production use proper encryption)
   */
  decrypt(encryptedText) {
    try {
      const algorithm = 'aes-256-cbc';
      const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);
      
      // Split IV and encrypted data
      const parts = encryptedText.split(':');
      if (parts.length !== 2) {
        throw new Error('Invalid encrypted data format');
      }
      
      const iv = Buffer.from(parts[0], 'hex');
      const encrypted = parts[1];
      
      const decipher = crypto.createDecipheriv(algorithm, key, iv);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      throw new Error('Failed to decrypt tokens');
    }
  }

  /**
   * Store authentication tokens
   */
  async storeTokens(tokens) {
    try {
      this.ensureConfigDir();
      console.log('Storing tokens:', tokens);
      const encryptedTokens = {
        authToken: tokens.authToken ? this.encrypt(tokens.authToken) : null,
        apiToken: tokens.apiToken ? this.encrypt(tokens.apiToken) : null,
        stagingApiToken: tokens.stagingApiToken ? this.encrypt(tokens.stagingApiToken) : null,
        user: tokens.user,
        company: tokens.company,
        timestamp: Date.now()
      };

      await fs.writeFile(this.tokensFile, JSON.stringify(encryptedTokens, null, 2), { mode: 0o600 });
      return true;
    } catch (error) {
      throw new Error(`Failed to store tokens: ${error.message}`);
    }
  }

  /**
   * Load authentication tokens
   */
  async loadTokens() {
    try {
      if (!fs.existsSync(this.tokensFile)) {
        return null;
      }

      const encryptedData = await fs.readFile(this.tokensFile, 'utf8');
      const encryptedTokens = JSON.parse(encryptedData);

      // Check if tokens are expired (24 hours)
      const tokenAge = Date.now() - encryptedTokens.timestamp;
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours
      
      if (tokenAge > maxAge) {
        await this.clearTokens();
        return null;
      }

      return {
        authToken: encryptedTokens.authToken ? this.decrypt(encryptedTokens.authToken) : null,
        apiToken: encryptedTokens.apiToken ? this.decrypt(encryptedTokens.apiToken) : null,
        stagingApiToken: encryptedTokens.stagingApiToken ? this.decrypt(encryptedTokens.stagingApiToken) : null,
        user: encryptedTokens.user,
        company: encryptedTokens.company
      };
    } catch (error) {
      // If we can't decrypt, clear the tokens
      await this.clearTokens();
      return null;
    }
  }

  /**
   * Clear stored tokens
   */
  async clearTokens() {
    try {
      if (fs.existsSync(this.tokensFile)) {
        await fs.unlink(this.tokensFile);
      }
      return true;
    } catch (error) {
      console.warn('Warning: Could not clear tokens:', error.message);
      return false;
    }
  }

  /**
   * Check if tokens exist and are valid
   */
  async hasValidTokens() {
    const tokens = await this.loadTokens();
    return tokens !== null;
  }

  /**
   * Get tokens file path (for debugging)
   */
  getTokensFilePath() {
    return this.tokensFile;
  }
}

module.exports = { TokenStorage }; 