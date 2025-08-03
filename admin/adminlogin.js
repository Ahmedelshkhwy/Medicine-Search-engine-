// Admin Login System
class AdminLogin {
    constructor() {
        this.isLoggedIn = false;
        this.currentAdmin = null;
        this.loginAttempts = {};
        
        // Load configuration from environment variables with fallback
        try {
            const securitySettings = (typeof config !== 'undefined') ? config.getSecuritySettings() : this.getDefaultSecuritySettings();
            this.maxAttempts = securitySettings.maxAttempts;
            this.lockoutTime = securitySettings.lockoutTime;
            this.sessionTimeout = securitySettings.sessionTimeout;
        } catch (error) {
            console.warn('Config not available, using default settings:', error);
            const defaultSecurity = this.getDefaultSecuritySettings();
            this.maxAttempts = defaultSecurity.maxAttempts;
            this.lockoutTime = defaultSecurity.lockoutTime;
            this.sessionTimeout = defaultSecurity.sessionTimeout;
        }
        
        // Load admin credentials from environment variables
        this.adminCredentials = this.loadAdminCredentials();
        
        this.initializeUI();
        this.startSessionTimer();
    }

    getDefaultSecuritySettings() {
        return {
            maxAttempts: 3,
            lockoutTime: 15 * 60 * 1000, // 15 minutes
            sessionTimeout: 60 * 60 * 1000 // 60 minutes
        };
    }

    loadAdminCredentials() {
        try {
            if (typeof config !== 'undefined') {
                const adminCreds = config.getAdminCredentials();
                const credentials = {};
                
                Object.keys(adminCreds).forEach(adminKey => {
                    const admin = adminCreds[adminKey];
                    credentials[admin.username] = {
                        password: admin.password,
                        role: admin.role,
                        name: admin.name
                    };
                });
                
                return credentials;
            }
        } catch (error) {
            console.warn('Using default admin credentials:', error);
        }
        
        // Default admin credentials if config is not available
        return {
            'admin1': { password: 'admin123', role: 'super_admin', name: 'مدير النظام الرئيسي' },
            'admin2': { password: 'admin456', role: 'admin', name: 'مدير فرعي' },
            'admin3': { password: 'admin789', role: 'moderator', name: 'مشرف' }
        };
    }

    initializeUI() {
        this.createLoginForm();
        this.createDashboard();
        this.showLogin();
    }

    createLoginForm() {
        const loginContainer = document.createElement('div');
        loginContainer.id = 'admin-login-container';
        loginContainer.innerHTML = `
            <div class="login-box">
                <h2>دخول المدراء</h2>
                <form id="admin-login-form">
                    <div class="form-group">
                        <label for="admin-username">اسم المستخدم:</label>
                        <input type="text" id="admin-username" required>
                    </div>
                    <div class="form-group">
                        <label for="admin-password">كلمة المرور:</label>
                        <input type="password" id="admin-password" required>
                    </div>
                    <button type="submit">دخول</button>
                    <div id="admin-error-message" class="error-message"></div>
                </form>
                <div class="switch-login">
                    <a href="#" onclick="userLogin.showLogin()">دخول المستخدمين</a>
                </div>
            </div>
        `;
        document.body.appendChild(loginContainer);
    }

    createDashboard() {
        const dashboardContainer = document.createElement('div');
        dashboardContainer.id = 'admin-dashboard';
        dashboardContainer.innerHTML = `
            <div class="dashboard">
                <header class="dashboard-header">
                    <h1>لوحة تحكم المدراء</h1>
                    <div class="user-info">
                        <span id="admin-name"></span>
                        <button onclick="adminLogin.goToPharmacySystem()" class="main-app-btn" style="background: #e74c3c;">نظام الصيدلية</button>
                        <button onclick="adminLogin.goToPharmacy()" class="main-app-btn" style="background: #9b59b6;">إدارة الصيدلية</button>
                        <button onclick="adminLogin.goToMainApp()" class="main-app-btn">محرك البحث</button>
                        <button onclick="adminLogin.logout()">خروج</button>
                    </div>
                </header>
                <div class="dashboard-content">
                    <div class="stats-grid">
                        <div class="stat-card">
                            <h3>المستخدمين النشطين</h3>
                            <span id="active-users-count">0</span>
                        </div>
                        <div class="stat-card">
                            <h3>إجمالي المستخدمين</h3>
                            <span id="total-users-count">40</span>
                        </div>
                        <div class="stat-card">
                            <h3>المدراء المتصلين</h3>
                            <span id="online-admins-count">1</span>
                        </div>
                    </div>
                    <div class="management-panels">
                        <div class="panel">
                            <h3>إدارة المستخدمين</h3>
                            <div id="users-list"></div>
                        </div>
                        <div class="panel">
                            <h3>سجل النشاطات</h3>
                            <div id="activity-log"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(dashboardContainer);
    }

    showLogin() {
        document.getElementById('admin-login-container').style.display = 'block';
        document.getElementById('admin-dashboard').style.display = 'none';
        document.getElementById('admin-login-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });
    }

    showDashboard() {
        document.getElementById('admin-login-container').style.display = 'none';
        document.getElementById('admin-dashboard').style.display = 'block';
        this.loadDashboardData();
    }

    handleLogin() {
        const username = document.getElementById('admin-username').value;
        const password = document.getElementById('admin-password').value;
        const errorDiv = document.getElementById('admin-error-message');

        // Check for lockout
        if (this.isLockedOut(username)) {
            const remainingTime = this.getRemainingLockoutTime(username);
            errorDiv.textContent = `تم قفل الحساب مؤقتاً. المحاولة القادمة بعد ${Math.ceil(remainingTime / 60000)} دقيقة.`;
            return;
        }

        // Validate credentials
        if (this.validateAdmin(username, password)) {
            this.currentAdmin = {
                username: username,
                ...this.adminCredentials[username],
                loginTime: Date.now()
            };
            this.isLoggedIn = true;
            this.resetLoginAttempts(username);
            this.showDashboard();
            this.logActivity(`Admin ${username} logged in`);
            this.resetSessionTimer();
        } else {
            this.recordFailedAttempt(username);
            const attemptsLeft = this.maxAttempts - this.loginAttempts[username].count;
            errorDiv.textContent = `اسم المستخدم أو كلمة المرور غير صحيحة. المحاولات المتبقية: ${attemptsLeft}`;
        }
    }

    getRemainingLockoutTime(username) {
        const attempts = this.loginAttempts[username];
        if (!attempts) return 0;
        
        const timePassed = Date.now() - attempts.lastAttempt;
        return Math.max(0, this.lockoutTime - timePassed);
    }

    startSessionTimer() {
        // Check session timeout every minute
        setInterval(() => {
            if (this.isLoggedIn && this.currentAdmin) {
                const sessionDuration = Date.now() - this.currentAdmin.loginTime;
                if (sessionDuration > this.sessionTimeout) {
                    alert('انتهت صلاحية الجلسة. سيتم تسجيل الخروج تلقائياً.');
                    this.logout();
                }
            }
        }, 60000); // Check every minute
    }

    resetSessionTimer() {
        if (this.currentAdmin) {
            this.currentAdmin.loginTime = Date.now();
        }
    }

    validateAdmin(username, password) {
        return this.adminCredentials[username] && 
               this.adminCredentials[username].password === password;
    }

    isLockedOut(username) {
        const attempts = this.loginAttempts[username];
        if (!attempts) return false;
        
        return attempts.count >= this.maxAttempts && 
               (Date.now() - attempts.lastAttempt) < this.lockoutTime;
    }

    recordFailedAttempt(username) {
        if (!this.loginAttempts[username]) {
            this.loginAttempts[username] = { count: 0, lastAttempt: 0 };
        }
        
        this.loginAttempts[username].count++;
        this.loginAttempts[username].lastAttempt = Date.now();
    }

    resetLoginAttempts(username) {
        delete this.loginAttempts[username];
    }

    loadDashboardData() {
        document.getElementById('admin-name').textContent = this.currentAdmin.name;
        this.updateUsersList();
        this.updateActivityLog();
        this.updateStats();
    }

    updateUsersList() {
        const usersList = document.getElementById('users-list');
        
        // Check if userLogin exists and has users, if not create them
        let users = [];
        if (typeof userLogin !== 'undefined' && userLogin.getAllUsers) {
            users = userLogin.getAllUsers();
        } else {
            // Fallback: create user list manually
            users = this.createFallbackUsersList();
        }
        
        usersList.innerHTML = users.map(user => `
            <div class="user-item ${user.isOnline ? 'online' : 'offline'}">
                <span>${user.name} (${user.username})</span>
                <span class="status">${user.isOnline ? 'متصل' : 'غير متصل'}</span>
                <button onclick="adminLogin.toggleUserStatus('${user.username}')">
                    ${user.isActive ? 'إيقاف' : 'تفعيل'}
                </button>
            </div>
        `).join('');
    }

    createFallbackUsersList() {
        const users = [];
        for (let i = 1; i <= 40; i++) {
            const userId = `user${i.toString().padStart(2, '0')}`;
            users.push({
                username: userId,
                name: `مستخدم ${i}`,
                isActive: true,
                isOnline: false,
                lastLogin: null
            });
        }
        return users;
    }

    updateActivityLog() {
        const activityLog = document.getElementById('activity-log');
        const activities = this.getRecentActivities();
        
        activityLog.innerHTML = activities.map(activity => `
            <div class="activity-item">
                <span class="time">${new Date(activity.timestamp).toLocaleString('ar')}</span>
                <span class="description">${activity.description}</span>
            </div>
        `).join('');
    }

    updateStats() {
        let activeUsers = 0;
        let totalUsers = 40;
        
        if (typeof userLogin !== 'undefined' && userLogin.getActiveUsersCount) {
            activeUsers = userLogin.getActiveUsersCount();
            totalUsers = userLogin.getTotalUsersCount();
        } else {
            // Fallback: get from localStorage
            const storedUsers = JSON.parse(localStorage.getItem('user_credentials') || '{}');
            totalUsers = Object.keys(storedUsers).length || 40;
            activeUsers = Object.values(storedUsers).filter(user => user.isOnline).length;
        }
        
        document.getElementById('active-users-count').textContent = activeUsers;
        document.getElementById('total-users-count').textContent = totalUsers;
    }

    toggleUserStatus(username) {
        if (typeof userLogin !== 'undefined' && userLogin.toggleUserStatus) {
            userLogin.toggleUserStatus(username);
        } else {
            // Fallback: toggle status manually in localStorage
            const storedUsers = JSON.parse(localStorage.getItem('user_credentials') || '{}');
            if (storedUsers[username]) {
                storedUsers[username].isActive = !storedUsers[username].isActive;
                if (!storedUsers[username].isActive && storedUsers[username].isOnline) {
                    storedUsers[username].isOnline = false;
                }
                localStorage.setItem('user_credentials', JSON.stringify(storedUsers));
            }
        }
        
        this.updateUsersList();
        this.logActivity(`Admin ${this.currentAdmin.username} toggled status for user ${username}`);
    }

    logActivity(description) {
        const activities = JSON.parse(localStorage.getItem('admin_activities') || '[]');
        activities.unshift({
            timestamp: Date.now(),
            description: description,
            admin: this.currentAdmin?.username
        });
        
        // Keep only last 100 activities
        if (activities.length > 100) {
            activities.splice(100);
        }
        
        localStorage.setItem('admin_activities', JSON.stringify(activities));
    }

    getRecentActivities() {
        return JSON.parse(localStorage.getItem('admin_activities') || '[]').slice(0, 20);
    }

    logout() {
        this.logActivity(`Admin ${this.currentAdmin.username} logged out`);
        this.isLoggedIn = false;
        this.currentAdmin = null;
        this.showLogin();
        document.getElementById('admin-username').value = '';
        document.getElementById('admin-password').value = '';
        document.getElementById('admin-error-message').textContent = '';
    }

    goToMainApp() {
        // Store current admin session
        sessionStorage.setItem('currentUser', JSON.stringify(this.currentAdmin));
        sessionStorage.setItem('isLoggedIn', 'true');
        sessionStorage.setItem('userType', 'admin');
        
        // Log activity
        this.logActivity(`Admin ${this.currentAdmin.username} accessed main application`);
        
        // Navigate to main application
        window.location.href = 'search-app.html';
    }

    goToPharmacy() {
        // Store current admin session
        sessionStorage.setItem('currentUser', JSON.stringify(this.currentAdmin));
        sessionStorage.setItem('isLoggedIn', 'true');
        sessionStorage.setItem('userType', 'admin');
        
        // Log activity
        this.logActivity(`Admin ${this.currentAdmin.username} accessed pharmacy management`);
        
        // Navigate to pharmacy application
        window.location.href = 'pharmacy.html';
    }

    goToPharmacySystem() {
        // Store current admin session
        sessionStorage.setItem('currentUser', JSON.stringify(this.currentAdmin));
        sessionStorage.setItem('isLoggedIn', 'true');
        sessionStorage.setItem('userType', 'admin');
        
        // Log activity
        this.logActivity(`Admin ${this.currentAdmin.username} accessed pharmacy system`);
        
        // Navigate to pharmacy system
        window.location.href = 'pharmacy-system.html';
    }
}

// Initialize admin login system
const adminLogin = new AdminLogin();