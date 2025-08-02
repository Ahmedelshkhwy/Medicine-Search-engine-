// User Login System
class UserLogin {
    constructor() {
        this.isLoggedIn = false;
        this.currentUser = null;
        this.onlineUsers = new Set();
        
        // Load configuration from environment variables
        const appSettings = config.getAppSettings();
        const securitySettings = config.getSecuritySettings();
        
        this.maxUsers = appSettings.maxUsers;
        this.environment = appSettings.environment;
        this.sessionTimeout = securitySettings.sessionTimeout;
        
        this.initializeUsers();
        this.initializeUI();
    }

    initializeUsers() {
        // Initialize users based on MAX_USERS from environment
        this.userCredentials = {};
        for (let i = 1; i <= this.maxUsers; i++) {
            const userId = `user${i.toString().padStart(2, '0')}`;
            this.userCredentials[userId] = {
                password: `pass${i}`,
                name: `مستخدم ${i}`,
                isActive: true,
                isOnline: false,
                lastLogin: null,
                loginTime: null,
                joinDate: new Date('2024-01-01').getTime() + (i * 24 * 60 * 60 * 1000)
            };
        }
        
        // Save to localStorage if not exists
        if (!localStorage.getItem('user_credentials')) {
            localStorage.setItem('user_credentials', JSON.stringify(this.userCredentials));
        } else {
            this.userCredentials = JSON.parse(localStorage.getItem('user_credentials'));
        }
    }

    initializeUI() {
        this.createLoginForm();
        this.createUserDashboard();
        this.showLogin();
    }

    createLoginForm() {
        const loginContainer = document.createElement('div');
        loginContainer.id = 'user-login-container';
        loginContainer.innerHTML = `
            <div class="login-box">
                <h2>دخول المستخدمين</h2>
                <form id="user-login-form">
                    <div class="form-group">
                        <label for="user-username">اسم المستخدم:</label>
                        <input type="text" id="user-username" placeholder="user01 - user40" required>
                    </div>
                    <div class="form-group">
                        <label for="user-password">كلمة المرور:</label>
                        <input type="password" id="user-password" placeholder="pass1 - pass40" required>
                    </div>
                    <button type="submit">دخول</button>
                    <div id="user-error-message" class="error-message"></div>
                </form>
                <div class="demo-credentials">
                    <h4>بيانات تجريبية:</h4>
                    <p>المستخدمين: user01 إلى user40</p>
                    <p>كلمات المرور: pass1 إلى pass40</p>
                </div>
                <div class="switch-login">
                    <a href="#" onclick="adminLogin.showLogin()">دخول المدراء</a>
                </div>
            </div>
        `;
        document.body.appendChild(loginContainer);
    }

    createUserDashboard() {
        const dashboardContainer = document.createElement('div');
        dashboardContainer.id = 'user-dashboard';
        dashboardContainer.innerHTML = `
            <div class="user-dashboard">
                <header class="dashboard-header">
                    <h1>لوحة المستخدم</h1>
                    <div class="user-info">
                        <span id="user-name"></span>
                        <span id="user-status" class="online-status">متصل</span>
                        <button onclick="userLogin.logout()">خروج</button>
                    </div>
                </header>
                <div class="dashboard-content">
                    <div class="user-stats">
                        <div class="stat-card">
                            <h3>حالة الاتصال</h3>
                            <span class="status-indicator online">نشط</span>
                        </div>
                        <div class="stat-card">
                            <h3>تاريخ الانضمام</h3>
                            <span id="join-date"></span>
                        </div>
                        <div class="stat-card">
                            <h3>آخر دخول</h3>
                            <span id="last-login"></span>
                        </div>
                    </div>
                    <div class="online-users-section">
                        <h3>المستخدمين المتصلين</h3>
                        <div id="online-users-list"></div>
                    </div>
                    <div class="activity-section">
                        <h3>النشاطات الأخيرة</h3>
                        <div id="user-activities"></div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(dashboardContainer);
    }

    showLogin() {
        document.getElementById('user-login-container').style.display = 'block';
        document.getElementById('user-dashboard').style.display = 'none';
        if (document.getElementById('admin-login-container')) {
            document.getElementById('admin-login-container').style.display = 'none';
        }
        if (document.getElementById('admin-dashboard')) {
            document.getElementById('admin-dashboard').style.display = 'none';
        }
        
        document.getElementById('user-login-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });
    }

    showDashboard() {
        document.getElementById('user-login-container').style.display = 'none';
        document.getElementById('user-dashboard').style.display = 'block';
        this.loadUserDashboard();
        this.startOnlineStatusUpdate();
    }

    handleLogin() {
        const username = document.getElementById('user-username').value;
        const password = document.getElementById('user-password').value;
        const errorDiv = document.getElementById('user-error-message');

        if (this.validateUser(username, password)) {
            this.currentUser = {
                username: username,
                ...this.userCredentials[username],
                loginTime: Date.now()
            };
            
            // Update user status
            this.userCredentials[username].isOnline = true;
            this.userCredentials[username].lastLogin = Date.now();
            this.userCredentials[username].loginTime = Date.now();
            this.onlineUsers.add(username);
            
            this.isLoggedIn = true;
            this.saveUserData();
            this.showDashboard();
            this.logUserActivity(`${username} logged in`);
            this.startSessionTimer();
        } else {
            errorDiv.textContent = 'اسم المستخدم أو كلمة المرور غير صحيحة';
        }
    }

    startSessionTimer() {
        // Check session timeout every minute
        this.sessionInterval = setInterval(() => {
            if (this.isLoggedIn && this.currentUser) {
                const sessionDuration = Date.now() - this.currentUser.loginTime;
                if (sessionDuration > this.sessionTimeout) {
                    alert('انتهت صلاحية الجلسة. سيتم تسجيل الخروج تلقائياً.');
                    this.logout();
                }
            }
        }, 60000); // Check every minute
    }

    resetSessionTimer() {
        if (this.currentUser) {
            this.currentUser.loginTime = Date.now();
            this.userCredentials[this.currentUser.username].loginTime = Date.now();
        }
    }

    validateUser(username, password) {
        return this.userCredentials[username] && 
               this.userCredentials[username].password === password &&
               this.userCredentials[username].isActive;
    }

    loadUserDashboard() {
        document.getElementById('user-name').textContent = this.currentUser.name;
        document.getElementById('join-date').textContent = new Date(this.currentUser.joinDate).toLocaleDateString('ar');
        document.getElementById('last-login').textContent = this.currentUser.lastLogin ? 
            new Date(this.currentUser.lastLogin).toLocaleString('ar') : 'أول مرة';
        
        this.updateOnlineUsersList();
        this.updateUserActivities();
    }

    updateOnlineUsersList() {
        const onlineUsersList = document.getElementById('online-users-list');
        const onlineUsersArray = Array.from(this.onlineUsers);
        
        onlineUsersList.innerHTML = onlineUsersArray.map(username => `
            <div class="online-user-item">
                <span class="user-indicator online"></span>
                <span>${this.userCredentials[username]?.name || username}</span>
            </div>
        `).join('');
    }

    updateUserActivities() {
        const activitiesDiv = document.getElementById('user-activities');
        const activities = this.getUserActivities();
        
        activitiesDiv.innerHTML = activities.map(activity => `
            <div class="activity-item">
                <span class="time">${new Date(activity.timestamp).toLocaleString('ar')}</span>
                <span class="description">${activity.description}</span>
            </div>
        `).join('');
    }

    startOnlineStatusUpdate() {
        // Update online status every 30 seconds
        this.statusInterval = setInterval(() => {
            if (this.isLoggedIn) {
                this.updateOnlineUsersList();
            }
        }, 30000);
    }

    logUserActivity(description) {
        const activities = JSON.parse(localStorage.getItem('user_activities') || '[]');
        activities.unshift({
            timestamp: Date.now(),
            description: description,
            user: this.currentUser?.username
        });
        
        // Keep only last 50 activities
        if (activities.length > 50) {
            activities.splice(50);
        }
        
        localStorage.setItem('user_activities', JSON.stringify(activities));
    }

    getUserActivities() {
        const allActivities = JSON.parse(localStorage.getItem('user_activities') || '[]');
        return allActivities.filter(activity => 
            activity.user === this.currentUser?.username
        ).slice(0, 10);
    }

    saveUserData() {
        localStorage.setItem('user_credentials', JSON.stringify(this.userCredentials));
    }

    logout() {
        if (this.currentUser) {
            this.userCredentials[this.currentUser.username].isOnline = false;
            this.onlineUsers.delete(this.currentUser.username);
            this.logUserActivity(`${this.currentUser.username} logged out`);
            this.saveUserData();
        }
        
        this.isLoggedIn = false;
        this.currentUser = null;
        
        // Clear all timers
        if (this.statusInterval) {
            clearInterval(this.statusInterval);
        }
        if (this.sessionInterval) {
            clearInterval(this.sessionInterval);
        }
        
        this.showLogin();
        document.getElementById('user-username').value = '';
        document.getElementById('user-password').value = '';
        document.getElementById('user-error-message').textContent = '';
    }

    // Methods for admin system
    getAllUsers() {
        return Object.keys(this.userCredentials).map(username => ({
            username: username,
            name: this.userCredentials[username].name,
            isActive: this.userCredentials[username].isActive,
            isOnline: this.userCredentials[username].isOnline,
            lastLogin: this.userCredentials[username].lastLogin
        }));
    }

    getActiveUsersCount() {
        return Object.values(this.userCredentials).filter(user => user.isOnline).length;
    }

    getTotalUsersCount() {
        return Object.keys(this.userCredentials).length;
    }

    toggleUserStatus(username) {
        if (this.userCredentials[username]) {
            this.userCredentials[username].isActive = !this.userCredentials[username].isActive;
            
            // If user is being deactivated and is currently online, log them out
            if (!this.userCredentials[username].isActive && this.userCredentials[username].isOnline) {
                this.userCredentials[username].isOnline = false;
                this.onlineUsers.delete(username);
            }
            
            this.saveUserData();
        }
    }
}

// Initialize user login system
const userLogin = new UserLogin();