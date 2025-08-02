// Environment configuration loader
// Note: For client-side JavaScript, we'll use a different approach since process.env is not available in browsers

class Config {
    constructor() {
        // For production, these should be loaded from environment variables
        // In a real Node.js backend, you would use process.env
        this.config = {
            // Admin Credentials
            ADMIN_CREDENTIALS: {
                admin1: {
                    username: process.env.ADMIN1_USERNAME || 'admin1',
                    password: process.env.ADMIN1_PASSWORD || 'admin123',
                    role: process.env.ADMIN1_ROLE || 'super_admin',
                    name: process.env.ADMIN1_NAME || 'مدير النظام الرئيسي'
                },
                admin2: {
                    username: process.env.ADMIN2_USERNAME || 'admin2',
                    password: process.env.ADMIN2_PASSWORD || 'admin456',
                    role: process.env.ADMIN2_ROLE || 'admin',
                    name: process.env.ADMIN2_NAME || 'مدير فرعي'
                },
                admin3: {
                    username: process.env.ADMIN3_USERNAME || 'admin3',
                    password: process.env.ADMIN3_PASSWORD || 'admin789',
                    role: process.env.ADMIN3_ROLE || 'moderator',
                    name: process.env.ADMIN3_NAME || 'مشرف'
                }
            },
            
            // Security Settings
            MAX_LOGIN_ATTEMPTS: parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 3,
            LOCKOUT_TIME_MINUTES: parseInt(process.env.LOCKOUT_TIME_MINUTES) || 15,
            SESSION_TIMEOUT_MINUTES: parseInt(process.env.SESSION_TIMEOUT_MINUTES) || 60,
            
            // App Settings
            MAX_USERS: parseInt(process.env.MAX_USERS) || 40,
            APP_ENV: process.env.APP_ENV || 'development',
            
            // Encryption
            SALT_ROUNDS: parseInt(process.env.SALT_ROUNDS) || 10
        };
    }

    get(key) {
        return this.config[key];
    }

    getAdminCredentials() {
        return this.config.ADMIN_CREDENTIALS;
    }

    getSecuritySettings() {
        return {
            maxAttempts: this.config.MAX_LOGIN_ATTEMPTS,
            lockoutTime: this.config.LOCKOUT_TIME_MINUTES * 60 * 1000, // Convert to milliseconds
            sessionTimeout: this.config.SESSION_TIMEOUT_MINUTES * 60 * 1000
        };
    }

    getAppSettings() {
        return {
            maxUsers: this.config.MAX_USERS,
            environment: this.config.APP_ENV
        };
    }
}

// For Node.js backend environment variable loader
class ServerConfig {
    static load() {
        // This would be used in a Node.js environment
        require('dotenv').config();
        
        return {
            adminCredentials: {
                admin1: {
                    username: process.env.ADMIN1_USERNAME,
                    password: process.env.ADMIN1_PASSWORD,
                    role: process.env.ADMIN1_ROLE,
                    name: process.env.ADMIN1_NAME
                },
                admin2: {
                    username: process.env.ADMIN2_USERNAME,
                    password: process.env.ADMIN2_PASSWORD,
                    role: process.env.ADMIN2_ROLE,
                    name: process.env.ADMIN2_NAME
                },
                admin3: {
                    username: process.env.ADMIN3_USERNAME,
                    password: process.env.ADMIN3_PASSWORD,
                    role: process.env.ADMIN3_ROLE,
                    name: process.env.ADMIN3_NAME
                }
            },
            security: {
                maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS),
                lockoutTimeMinutes: parseInt(process.env.LOCKOUT_TIME_MINUTES),
                sessionTimeoutMinutes: parseInt(process.env.SESSION_TIMEOUT_MINUTES),
                jwtSecret: process.env.JWT_SECRET,
                jwtExpiresIn: process.env.JWT_EXPIRES_IN,
                encryptionKey: process.env.ENCRYPTION_KEY,
                saltRounds: parseInt(process.env.SALT_ROUNDS)
            },
            database: {
                host: process.env.DB_HOST,
                port: parseInt(process.env.DB_PORT),
                name: process.env.DB_NAME,
                user: process.env.DB_USER,
                password: process.env.DB_PASSWORD
            },
            app: {
                port: parseInt(process.env.APP_PORT),
                env: process.env.APP_ENV,
                maxUsers: parseInt(process.env.MAX_USERS)
            }
        };
    }
}

// Export for use in other modules
const config = new Config();
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { config, ServerConfig };
}