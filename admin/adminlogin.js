// Admin Login System
class AdminLogin {
    constructor() {
        this.isLoggedIn = false;
        this.currentAdmin = null;
        this.loginAttempts = {};
        
        // Load configuration from environment variables
        const securitySettings = config.getSecuritySettings();
        this.maxAttempts = securitySettings.maxAttempts;
        this.lockoutTime = securitySettings.lockoutTime;
        this.sessionTimeout = securitySettings.sessionTimeout;
        
        // Load admin credentials from environment variables
        this.adminCredentials = this.loadAdminCredentials();
        
        this.initializeUI();
        this.startSessionTimer();
    }

    loadAdminCredentials() {
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
        const users = userLogin.getAllUsers();
        
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
        const activeUsers = userLogin.getActiveUsersCount();
        const totalUsers = userLogin.getTotalUsersCount();
        
        document.getElementById('active-users-count').textContent = activeUsers;
        document.getElementById('total-users-count').textContent = totalUsers;
    }

    toggleUserStatus(username) {
        userLogin.toggleUserStatus(username);
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
}

// Initialize admin login system
const adminLogin = new AdminLogin();