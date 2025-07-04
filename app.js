// Enhanced Civil Engineering Task Management Dashboard with Chat, History, and Enhanced Task Features
class TaskManager {
    constructor() {
        this.currentUser = null;
        this.users = [];
        this.tasks = [];
        this.messages = [];
        this.taskHistory = [];
        this.editRequests = [];
        this.appConfig = {};
        this.taskModal = null;
        this.createUserModal = null;
        this.editRequestModal = null;
        this.charts = {};
        this.calendar = null;
        this.bcryptReady = false;
        this.clockInterval = null;
        this.deadlineInterval = null;
        this.statsInterval = null;
        this.chatInterval = null;
        this.currentChatUser = null;
        this.userOnlineStatus = {};
        
        this.init();
    }

    init() {
        // Wait for libraries to load
        this.waitForLibraries().then(() => {
            this.loadSampleData();
            this.loadAppConfig();
            this.setupEventListeners();
            this.taskModal = new bootstrap.Modal(document.getElementById('taskModal'));
            this.createUserModal = new bootstrap.Modal(document.getElementById('createUserModal'));
            this.editRequestModal = new bootstrap.Modal(document.getElementById('editRequestModal'));
            this.checkAuthStatus();
            this.startRealTimeUpdates();
        });
    }

    waitForLibraries() {
        return new Promise((resolve) => {
            let checkCount = 0;
            const maxChecks = 30;
            
            const checkLibraries = () => {
                checkCount++;
                
                if (typeof bcrypt !== 'undefined') {
                    this.bcryptReady = true;
                }
                
                const chartReady = typeof Chart !== 'undefined';
                
                if ((this.bcryptReady || checkCount > 10) && chartReady) {
                    if (!this.bcryptReady) {
                        console.warn('bcrypt not loaded, using simple password comparison');
                    }
                    resolve();
                } else if (checkCount >= maxChecks) {
                    console.warn('Some libraries may not have loaded properly');
                    resolve();
                } else {
                    setTimeout(checkLibraries, 100);
                }
            };
            
            checkLibraries();
        });
    }

    // Real-Time Updates System
    startRealTimeUpdates() {
        // Start live clock (updates every second)
        this.clockInterval = setInterval(() => {
            this.updateLiveClock();
        }, 1000);

        // Start deadline calculations (updates every minute)
        this.deadlineInterval = setInterval(() => {
            this.updateDeadlineCalculations();
        }, 60000);

        // Start statistics updates (updates every 30 seconds)
        this.statsInterval = setInterval(() => {
            this.updateDashboardStats();
        }, 30000);

        // Start chat updates (updates every 2 seconds when in chat)
        this.chatInterval = setInterval(() => {
            this.updateChatMessages();
        }, 2000);

        // Initial updates
        this.updateLiveClock();
        this.updateDeadlineCalculations();
        this.updateUserOnlineStatus();
    }

    updateLiveClock() {
        const now = new Date();
        const options = {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            timeZone: 'Asia/Kolkata',
            timeZoneName: 'short'
        };
        
        const formattedDateTime = now.toLocaleDateString('en-US', options);
        const clockElement = document.getElementById('currentDateTime');
        if (clockElement) {
            clockElement.textContent = formattedDateTime;
        }
    }

    updateDeadlineCalculations() {
        // Update all tasks with current deadline status
        this.tasks.forEach(task => {
            task.deadlineInfo = this.calculateDeadlineInfo(task.end_date, task.status);
        });

        // Update UI if dashboard is visible
        if (document.getElementById('dashboard').style.display !== 'none') {
            this.updateDeadlineAlerts();
            this.updateTasksList();
            this.updateOverviewStats();
        }
    }

    updateDashboardStats() {
        if (document.getElementById('overviewSection').style.display !== 'none') {
            this.showOverview();
        }
    }

    updateUserOnlineStatus() {
        if (this.currentUser) {
            // Mark current user as online
            this.userOnlineStatus[this.currentUser.id] = {
                status: 'online',
                lastSeen: new Date().toISOString()
            };
            
            // Update user's last activity
            this.currentUser.last_activity = new Date().toISOString();
            this.saveCurrentUser();
        }
    }

    updateChatMessages() {
        if (this.currentChatUser && document.getElementById('chatSection').style.display !== 'none') {
            this.renderChatMessages(this.currentChatUser.id);
            this.updateChatNotifications();
        }
    }

    calculateDeadlineInfo(endDate, status) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const deadline = new Date(endDate);
        deadline.setHours(0, 0, 0, 0);
        
        const timeDiff = deadline.getTime() - today.getTime();
        const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
        
        let urgencyLevel = 'safe';
        let displayText = '';
        let colorClass = 'deadline-safe';
        
        if (status === 'Completed') {
            urgencyLevel = 'completed';
            displayText = 'Completed';
            colorClass = 'deadline-safe';
        } else if (daysDiff < 0) {
            urgencyLevel = 'overdue';
            displayText = `${Math.abs(daysDiff)} days overdue`;
            colorClass = 'deadline-overdue';
        } else if (daysDiff === 0) {
            urgencyLevel = 'today';
            displayText = 'Due today';
            colorClass = 'deadline-urgent';
        } else if (daysDiff === 1) {
            urgencyLevel = 'urgent';
            displayText = 'Due tomorrow';
            colorClass = 'deadline-urgent';
        } else if (daysDiff <= 2) {
            urgencyLevel = 'urgent';
            displayText = `${daysDiff} days remaining`;
            colorClass = 'deadline-urgent';
        } else if (daysDiff <= 7) {
            urgencyLevel = 'warning';
            displayText = `${daysDiff} days remaining`;
            colorClass = 'deadline-warning';
        } else {
            urgencyLevel = 'safe';
            displayText = `${daysDiff} days remaining`;
            colorClass = 'deadline-safe';
        }
        
        return {
            urgencyLevel,
            displayText,
            colorClass,
            daysRemaining: daysDiff,
            isOverdue: daysDiff < 0 && status !== 'Completed'
        };
    }

    hashPassword(password) {
        if (this.bcryptReady && typeof bcrypt !== 'undefined') {
            return bcrypt.hashSync(password, 10);
        }
        return btoa(password);
    }

    comparePassword(password, hash) {
        if (this.bcryptReady && typeof bcrypt !== 'undefined') {
            return bcrypt.compareSync(password, hash);
        }
        return btoa(password) === hash;
    }

    // Enhanced User Data Management for Cross-Browser Compatibility
    saveCurrentUser() {
        if (this.currentUser) {
            // Save to localStorage with timestamp for cross-device sync
            const userData = {
                ...this.currentUser,
                lastSync: new Date().toISOString(),
                sessionId: this.generateSessionId()
            };
            localStorage.setItem('ce_current_user', JSON.stringify(userData));
            
            // Update user in users array
            const userIndex = this.users.findIndex(u => u.id === this.currentUser.id);
            if (userIndex !== -1) {
                this.users[userIndex] = { ...this.users[userIndex], ...this.currentUser };
                this.saveData();
            }
        }
    }

    generateSessionId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // Load configuration
    loadAppConfig() {
        const savedConfig = localStorage.getItem('ce_app_config');
        if (savedConfig) {
            this.appConfig = JSON.parse(savedConfig);
        } else {
            this.appConfig = {
                app_name: "Civil Engineering Task Manager",
                menu_items: {
                    overview: "Overview",
                    my_tasks: "My Tasks",
                    schedule: "Schedule",
                    chat: "Chat",
                    history: "History",
                    profile: "Profile",
                    admin_panel: "Admin Panel",
                    team_progress: "Team Progress",
                    reports: "Reports",
                    settings: "Settings"
                },
                company_info: {
                    name: "Civil Engineering Solutions",
                    logo: "🏗️"
                },
                features: {
                    edit_requests: true,
                    pdf_reports: true,
                    team_dashboard: true,
                    calendar_view: true,
                    deadline_alerts: true,
                    real_time_updates: true,
                    chat_system: true,
                    task_history: true
                },
                timing: {
                    timezone: "IST",
                    update_intervals: {
                        clock: 1000,
                        deadlines: 60000,
                        stats: 30000,
                        chat: 2000
                    }
                }
            };
            this.saveAppConfig();
        }
        this.applyConfiguration();
    }

    saveAppConfig() {
        localStorage.setItem('ce_app_config', JSON.stringify(this.appConfig));
    }

    applyConfiguration() {
        const appTitle = document.getElementById('appTitle');
        if (appTitle) {
            appTitle.textContent = this.appConfig.app_name;
        }
        
        const sidebarTitle = document.getElementById('sidebarTitle');
        if (sidebarTitle) {
            sidebarTitle.textContent = this.appConfig.company_info.logo + ' ' + this.appConfig.app_name.split(' ')[0];
        }
    }

    // Load sample data with enhanced demo data
    loadSampleData() {
        const existingUsers = localStorage.getItem('ce_users');
        const existingTasks = localStorage.getItem('ce_tasks');
        const existingMessages = localStorage.getItem('ce_messages');
        const existingTaskHistory = localStorage.getItem('ce_task_history');
        const existingEditRequests = localStorage.getItem('ce_edit_requests');

        if (!existingUsers) {
            const sampleUsers = [
                {
                    id: 1,
                    username: 'admin',
                    password_hash: this.hashPassword('admin123'),
                    email: 'admin@company.com',
                    role: 'admin',
                    created_date: '2025-01-01T00:00:00.000Z',
                    last_login: '2025-07-04T08:05:00.000Z',
                    last_activity: '2025-07-04T08:05:00.000Z'
                },
                {
                    id: 2,
                    username: 'john_engineer',
                    password_hash: this.hashPassword('password123'),
                    email: 'john@company.com',
                    role: 'user',
                    created_date: '2025-01-15T00:00:00.000Z',
                    last_login: '2025-07-04T07:30:00.000Z',
                    last_activity: '2025-07-04T07:30:00.000Z'
                },
                {
                    id: 3,
                    username: 'sarah_supervisor',
                    password_hash: this.hashPassword('securepass'),
                    email: 'sarah@company.com',
                    role: 'user',
                    created_date: '2025-01-20T00:00:00.000Z',
                    last_login: '2025-07-04T06:45:00.000Z',
                    last_activity: '2025-07-04T06:45:00.000Z'
                }
            ];
            localStorage.setItem('ce_users', JSON.stringify(sampleUsers));
        }

        if (!existingTasks) {
            const currentTime = new Date().toISOString();
            const sampleTasks = [
                {
                    id: 1,
                    title: 'Foundation Excavation',
                    description: 'Excavate foundation for new building structure',
                    assigned_by: 1,
                    assigned_to: 2,
                    priority: 'High',
                    status: 'In Progress',
                    start_date: '2025-07-05',
                    end_date: '2025-07-10',
                    created_date: '2025-07-04T08:00:00.000Z',
                    assignment_date: '2025-07-04T08:00:00.000Z',
                    completed_date: null,
                    remarks: '',
                    user_id: 1,
                    assignee_comments: 'Foundation work is progressing well',
                    progress_notes: ['Site preparation completed'],
                    locked_for_editing: false,
                    updated_date: '2025-07-04T08:00:00.000Z'
                },
                {
                    id: 2,
                    title: 'Concrete Mix Design',
                    description: 'Prepare concrete mix design for foundation',
                    assigned_by: 3,
                    assigned_to: 2,
                    priority: 'Medium',
                    status: 'Completed',
                    start_date: '2025-07-01',
                    end_date: '2025-07-03',
                    created_date: '2025-07-01T09:00:00.000Z',
                    assignment_date: '2025-07-01T09:00:00.000Z',
                    completed_date: '2025-07-03T16:30:00.000Z',
                    remarks: 'Completed mix design with 28-day strength of 25 MPa. Ready for foundation work.',
                    user_id: 3,
                    assignee_comments: '',
                    progress_notes: [],
                    locked_for_editing: true,
                    updated_date: '2025-07-03T16:30:00.000Z'
                },
                {
                    id: 3,
                    title: 'Site Survey',
                    description: 'Complete topographical survey of construction site',
                    assigned_by: 1,
                    assigned_to: 3,
                    priority: 'High',
                    status: 'Not Started',
                    start_date: '2025-07-06',
                    end_date: '2025-07-08',
                    created_date: '2025-07-04T10:00:00.000Z',
                    assignment_date: '2025-07-04T10:00:00.000Z',
                    completed_date: null,
                    remarks: '',
                    user_id: 1,
                    assignee_comments: '',
                    progress_notes: [],
                    locked_for_editing: false,
                    updated_date: '2025-07-04T10:00:00.000Z'
                }
            ];
            localStorage.setItem('ce_tasks', JSON.stringify(sampleTasks));
        }

        if (!existingMessages) {
            const sampleMessages = [
                {
                    id: 1,
                    sender_id: 1,
                    receiver_id: 2,
                    message: 'Please coordinate with Sarah for the foundation excavation schedule.',
                    timestamp: '2025-07-04T08:15:00.000Z',
                    is_read: false
                },
                {
                    id: 2,
                    sender_id: 2,
                    receiver_id: 3,
                    message: 'The concrete mix design is ready. Let me know when you need the specifications.',
                    timestamp: '2025-07-04T09:30:00.000Z',
                    is_read: true
                }
            ];
            localStorage.setItem('ce_messages', JSON.stringify(sampleMessages));
        }

        if (!existingTaskHistory) {
            const sampleTaskHistory = [
                {
                    id: 1,
                    task_id: 1,
                    action: 'created',
                    user_id: 1,
                    timestamp: '2025-07-04T08:00:00.000Z',
                    details: 'Task created and assigned to john_engineer'
                },
                {
                    id: 2,
                    task_id: 2,
                    action: 'completed',
                    user_id: 2,
                    timestamp: '2025-07-03T16:30:00.000Z',
                    details: 'Task completed with remarks: Completed mix design with 28-day strength of 25 MPa'
                },
                {
                    id: 3,
                    task_id: 3,
                    action: 'created',
                    user_id: 1,
                    timestamp: '2025-07-04T10:00:00.000Z',
                    details: 'Task created and assigned to sarah_supervisor'
                }
            ];
            localStorage.setItem('ce_task_history', JSON.stringify(sampleTaskHistory));
        }

        if (!existingEditRequests) {
            const sampleEditRequests = [
                {
                    id: 1,
                    task_id: 2,
                    requested_by: 2,
                    assigned_by: 3,
                    reason: 'Need to update concrete specifications based on new requirements',
                    status: 'pending',
                    request_date: '2025-07-04T08:00:00.000Z',
                    response_date: null,
                    admin_notes: ''
                }
            ];
            localStorage.setItem('ce_edit_requests', JSON.stringify(sampleEditRequests));
        }

        this.loadData();
    }

    loadData() {
        this.users = JSON.parse(localStorage.getItem('ce_users')) || [];
        this.tasks = JSON.parse(localStorage.getItem('ce_tasks')) || [];
        this.messages = JSON.parse(localStorage.getItem('ce_messages')) || [];
        this.taskHistory = JSON.parse(localStorage.getItem('ce_task_history')) || [];
        this.editRequests = JSON.parse(localStorage.getItem('ce_edit_requests')) || [];
        
        // Update deadline info for all tasks
        this.tasks.forEach(task => {
            task.deadlineInfo = this.calculateDeadlineInfo(task.end_date, task.status);
        });
    }

    saveData() {
        localStorage.setItem('ce_users', JSON.stringify(this.users));
        localStorage.setItem('ce_tasks', JSON.stringify(this.tasks));
        localStorage.setItem('ce_messages', JSON.stringify(this.messages));
        localStorage.setItem('ce_task_history', JSON.stringify(this.taskHistory));
        localStorage.setItem('ce_edit_requests', JSON.stringify(this.editRequests));
    }

    setupEventListeners() {
        // Authentication
        document.getElementById('loginForm').addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('registerForm').addEventListener('submit', (e) => this.handleRegister(e));
        document.getElementById('showRegister').addEventListener('click', (e) => {
            e.preventDefault();
            this.showRegisterPage();
        });
        document.getElementById('showLogin').addEventListener('click', (e) => {
            e.preventDefault();
            this.showLoginPage();
        });
        document.getElementById('logoutBtn').addEventListener('click', () => this.handleLogout());

        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => this.handleNavigation(e));
        });

        // Task Management
        document.getElementById('addTaskBtn').addEventListener('click', () => this.showTaskModal());
        document.getElementById('saveTaskBtn').addEventListener('click', () => this.saveTask());
        document.getElementById('taskForm').addEventListener('submit', (e) => e.preventDefault());

        // Task Status Change Handler for Remarks
        document.getElementById('taskStatus').addEventListener('change', (e) => this.toggleRemarksField(e));

        // Edit Request Management
        document.getElementById('submitEditRequestBtn').addEventListener('click', () => this.submitEditRequest());
        document.getElementById('editRequestForm').addEventListener('submit', (e) => e.preventDefault());

        // User Management
        const createUserBtn = document.getElementById('createUserBtn');
        if (createUserBtn) {
            createUserBtn.addEventListener('click', () => this.showCreateUserModal());
        }
        
        const saveUserBtn = document.getElementById('saveUserBtn');
        if (saveUserBtn) {
            saveUserBtn.addEventListener('click', () => this.createUser());
        }
        
        const createUserForm = document.getElementById('createUserForm');
        if (createUserForm) {
            createUserForm.addEventListener('submit', (e) => e.preventDefault());
        }

        // Filters
        document.getElementById('statusFilter').addEventListener('change', () => this.filterTasks());
        document.getElementById('priorityFilter').addEventListener('change', () => this.filterTasks());
        document.getElementById('deadlineFilter').addEventListener('change', () => this.filterTasks());
        
        const assigneeFilter = document.getElementById('assigneeFilter');
        if (assigneeFilter) {
            assigneeFilter.addEventListener('change', () => this.filterTasks());
        }
        
        document.getElementById('searchTasks').addEventListener('input', () => this.filterTasks());

        // Chat System
        document.getElementById('sendMessageBtn').addEventListener('click', () => this.sendMessage());
        document.getElementById('chatMessageInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            }
        });

        // History Filters
        const historyFilter = document.getElementById('historyFilter');
        const historyUserFilter = document.getElementById('historyUserFilter');
        const historySearch = document.getElementById('historySearch');
        
        if (historyFilter) historyFilter.addEventListener('change', () => this.filterHistory());
        if (historyUserFilter) historyUserFilter.addEventListener('change', () => this.filterHistory());
        if (historySearch) historySearch.addEventListener('input', () => this.filterHistory());

        // Profile Management
        document.getElementById('profileForm').addEventListener('submit', (e) => this.updateProfile(e));
        document.getElementById('changePasswordForm').addEventListener('submit', (e) => this.changePassword(e));

        // Reports
        const generateReportBtn = document.getElementById('generateReportBtn');
        if (generateReportBtn) {
            generateReportBtn.addEventListener('click', () => this.generatePDFReport());
        }

        // Settings
        const saveSettingsBtn = document.getElementById('saveSettingsBtn');
        if (saveSettingsBtn) {
            saveSettingsBtn.addEventListener('click', () => this.saveSettings());
        }
        
        const resetSettingsBtn = document.getElementById('resetSettingsBtn');
        if (resetSettingsBtn) {
            resetSettingsBtn.addEventListener('click', () => this.resetSettings());
        }
    }

    // Enhanced Authentication Methods
    handleLogin(e) {
        e.preventDefault();
        const username = document.getElementById('loginUsername').value.trim();
        const password = document.getElementById('loginPassword').value;

        if (!username || !password) {
            this.showAlert('Please enter both username and password', 'danger');
            return;
        }

        const user = this.users.find(u => u.username === username);
        if (user && this.comparePassword(password, user.password_hash)) {
            user.last_login = new Date().toISOString();
            user.last_activity = new Date().toISOString();
            this.currentUser = user;
            this.saveCurrentUser();
            this.showDashboard();
            this.showAlert('Login successful!', 'success');
            this.updateUserOnlineStatus();
        } else {
            this.showAlert('Invalid username or password', 'danger');
        }
    }

    handleRegister(e) {
        e.preventDefault();
        const username = document.getElementById('registerUsername').value.trim();
        const email = document.getElementById('registerEmail').value.trim();
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (!username || !email || !password || !confirmPassword) {
            this.showAlert('Please fill in all fields', 'danger');
            return;
        }

        if (password !== confirmPassword) {
            this.showAlert('Passwords do not match', 'danger');
            return;
        }

        if (this.users.find(u => u.username === username)) {
            this.showAlert('Username already exists', 'danger');
            return;
        }

        if (this.users.find(u => u.email === email)) {
            this.showAlert('Email already registered', 'danger');
            return;
        }

        const newUser = {
            id: this.getNextId(this.users),
            username,
            password_hash: this.hashPassword(password),
            email,
            role: 'user',
            created_date: new Date().toISOString(),
            last_login: new Date().toISOString(),
            last_activity: new Date().toISOString()
        };

        this.users.push(newUser);
        this.saveData();
        this.showAlert('Registration successful! Please login.', 'success');
        this.showLoginPage();
    }

    handleLogout() {
        // Clear intervals
        if (this.clockInterval) clearInterval(this.clockInterval);
        if (this.deadlineInterval) clearInterval(this.deadlineInterval);
        if (this.statsInterval) clearInterval(this.statsInterval);
        if (this.chatInterval) clearInterval(this.chatInterval);
        
        // Mark user as offline
        if (this.currentUser) {
            this.userOnlineStatus[this.currentUser.id] = {
                status: 'offline',
                lastSeen: new Date().toISOString()
            };
        }
        
        this.currentUser = null;
        this.currentChatUser = null;
        localStorage.removeItem('ce_current_user');
        this.showLoginPage();
        this.showAlert('Logged out successfully', 'info');
    }

    checkAuthStatus() {
        const savedUser = localStorage.getItem('ce_current_user');
        if (savedUser) {
            try {
                this.currentUser = JSON.parse(savedUser);
                // Verify user still exists in system
                const userExists = this.users.find(u => u.id === this.currentUser.id);
                if (userExists) {
                    this.showDashboard();
                    this.updateUserOnlineStatus();
                } else {
                    this.showLoginPage();
                }
            } catch (error) {
                console.error('Error parsing saved user:', error);
                this.showLoginPage();
            }
        } else {
            this.showLoginPage();
        }
    }

    // UI Navigation
    showLoginPage() {
        // Clear intervals when showing login page
        if (this.clockInterval) clearInterval(this.clockInterval);
        if (this.deadlineInterval) clearInterval(this.deadlineInterval);
        if (this.statsInterval) clearInterval(this.statsInterval);
        if (this.chatInterval) clearInterval(this.chatInterval);
        
        document.getElementById('loginPage').style.display = 'flex';
        document.getElementById('registerPage').style.display = 'none';
        document.getElementById('dashboard').style.display = 'none';
        document.getElementById('loginForm').reset();
    }

    showRegisterPage() {
        document.getElementById('loginPage').style.display = 'none';
        document.getElementById('registerPage').style.display = 'flex';
        document.getElementById('dashboard').style.display = 'none';
        document.getElementById('registerForm').reset();
    }

    showDashboard() {
        document.getElementById('loginPage').style.display = 'none';
        document.getElementById('registerPage').style.display = 'none';
        document.getElementById('dashboard').style.display = 'flex';
        
        this.updateUserInfo();
        this.setupAdminAccess();
        this.populateUserSelects();
        
        setTimeout(() => {
            this.showOverview();
        }, 100);
    }

    updateUserInfo() {
        document.getElementById('userWelcome').textContent = `Welcome, ${this.currentUser.username}!`;
        document.getElementById('userRole').textContent = this.currentUser.role.charAt(0).toUpperCase() + this.currentUser.role.slice(1);
        document.getElementById('userRole').className = `badge ${this.currentUser.role === 'admin' ? 'bg-warning' : 'bg-primary'}`;
    }

    setupAdminAccess() {
        const adminElements = document.querySelectorAll('.admin-only');
        const isAdmin = this.currentUser.role === 'admin';
        
        adminElements.forEach(element => {
            element.style.display = isAdmin ? 'block' : 'none';
        });

        const adminNavItems = [
            document.querySelector('[data-section="admin"]'),
            document.querySelector('[data-section="team-progress"]'),
            document.querySelector('[data-section="reports"]'),
            document.querySelector('[data-section="settings"]')
        ];

        adminNavItems.forEach(item => {
            if (item) {
                item.style.display = isAdmin ? 'flex' : 'none';
            }
        });
    }

    populateUserSelects() {
        const selects = ['taskAssignedTo', 'assigneeFilter', 'historyUserFilter'];
        selects.forEach(selectId => {
            const select = document.getElementById(selectId);
            if (select) {
                const currentValue = select.value;
                const optionText = selectId === 'historyUserFilter' ? 'All Users' : 'Select User';
                select.innerHTML = `<option value="">${optionText}</option>`;
                this.users.forEach(user => {
                    const option = document.createElement('option');
                    option.value = user.id;
                    option.textContent = user.username;
                    if (user.id == currentValue) {
                        option.selected = true;
                    }
                    select.appendChild(option);
                });
            }
        });
    }

    handleNavigation(e) {
        e.preventDefault();
        const section = e.currentTarget.dataset.section;
        
        document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
        e.currentTarget.classList.add('active');

        document.querySelectorAll('.content-section').forEach(section => {
            section.style.display = 'none';
        });

        const sectionTitles = {
            'overview': 'Dashboard Overview',
            'tasks': 'My Tasks',
            'schedule': 'Schedule',
            'chat': 'Team Chat',
            'history': 'Task History',
            'edit-requests': 'Edit Requests',
            'profile': 'Profile Management',
            'admin': 'Admin Panel',
            'team-progress': 'Team Progress Dashboard',
            'reports': 'Reports Generator',
            'settings': 'Application Settings'
        };

        document.getElementById('sectionTitle').textContent = sectionTitles[section] || 'Dashboard';
        
        const sectionMap = {
            'overview': 'overviewSection',
            'tasks': 'tasksSection',
            'schedule': 'scheduleSection',
            'chat': 'chatSection',
            'history': 'historySection',
            'edit-requests': 'editRequestsSection',
            'profile': 'profileSection',
            'admin': 'adminSection',
            'team-progress': 'teamProgressSection',
            'reports': 'reportsSection',
            'settings': 'settingsSection'
        };

        const sectionElement = document.getElementById(sectionMap[section]);
        if (sectionElement) {
            sectionElement.style.display = 'block';
        }

        switch (section) {
            case 'overview':
                this.showOverview();
                break;
            case 'tasks':
                this.showTasks();
                break;
            case 'schedule':
                this.showSchedule();
                break;
            case 'chat':
                this.showChat();
                break;
            case 'history':
                this.showHistory();
                break;
            case 'edit-requests':
                this.showEditRequests();
                break;
            case 'profile':
                this.showProfile();
                break;
            case 'admin':
                this.showAdmin();
                break;
            case 'team-progress':
                this.showTeamProgress();
                break;
            case 'reports':
                this.showReports();
                break;
            case 'settings':
                this.showSettings();
                break;
        }
    }

    // Overview Section with Real-Time Updates
    showOverview() {
        const userTasks = this.currentUser.role === 'admin' ? 
            this.tasks : 
            this.tasks.filter(task => task.user_id === this.currentUser.id || task.assigned_to === this.currentUser.id);

        const stats = this.calculateStats(userTasks);
        this.updateStatCards(stats);
        this.updateDeadlineAlerts();
        
        setTimeout(() => {
            this.renderCharts(userTasks);
        }, 300);
        
        this.renderRecentTasks();
    }

    calculateStats(tasks) {
        return {
            total: tasks.length,
            pending: tasks.filter(t => t.status === 'Not Started').length,
            inProgress: tasks.filter(t => t.status === 'In Progress').length,
            completed: tasks.filter(t => t.status === 'Completed').length,
            overdue: tasks.filter(t => t.deadlineInfo && t.deadlineInfo.isOverdue).length
        };
    }

    updateStatCards(stats) {
        document.getElementById('totalTasks').textContent = stats.total;
        document.getElementById('pendingTasks').textContent = stats.pending;
        document.getElementById('inProgressTasks').textContent = stats.inProgress;
        document.getElementById('overdueTasks').textContent = stats.overdue;
    }

    updateDeadlineAlerts() {
        const alertsContainer = document.getElementById('deadlineAlerts');
        if (!alertsContainer) return;

        const userTasks = this.currentUser.role === 'admin' ? 
            this.tasks : 
            this.tasks.filter(task => task.user_id === this.currentUser.id || task.assigned_to === this.currentUser.id);

        // Get urgent tasks (overdue, due today, or due within 3 days)
        const urgentTasks = userTasks.filter(task => {
            if (!task.deadlineInfo) {
                task.deadlineInfo = this.calculateDeadlineInfo(task.end_date, task.status);
            }
            return task.deadlineInfo.urgencyLevel === 'overdue' || 
                   task.deadlineInfo.urgencyLevel === 'today' || 
                   task.deadlineInfo.urgencyLevel === 'urgent';
        }).sort((a, b) => a.deadlineInfo.daysRemaining - b.deadlineInfo.daysRemaining);

        if (urgentTasks.length === 0) {
            alertsContainer.innerHTML = `
                <div class="deadline-alert-item safe">
                    <div class="deadline-alert-title">
                        <i class="fas fa-check-circle text-success"></i>
                        No urgent deadlines
                    </div>
                    <div class="deadline-alert-info">
                        <span>All tasks are on track</span>
                        <span class="deadline-badge deadline-safe">Good</span>
                    </div>
                </div>
            `;
            return;
        }

        alertsContainer.innerHTML = urgentTasks.map(task => {
            const assignee = this.users.find(u => u.id === task.assigned_to);
            const creator = this.users.find(u => u.id === task.user_id);
            
            return `
                <div class="deadline-alert-item ${task.deadlineInfo.urgencyLevel}" data-task-id="${task.id}">
                    <div class="deadline-alert-title">
                        <i class="fas fa-${task.deadlineInfo.urgencyLevel === 'overdue' ? 'exclamation-triangle' : 'clock'}"></i>
                        ${task.title}
                    </div>
                    <div class="deadline-alert-info">
                        <span>
                            ${assignee ? `Assigned to: ${assignee.username}` : `Created by: ${creator ? creator.username : 'Unknown'}`}
                            | Priority: ${task.priority}
                        </span>
                        <span class="deadline-badge ${task.deadlineInfo.colorClass}">
                            ${task.deadlineInfo.displayText}
                        </span>
                    </div>
                </div>
            `;
        }).join('');

        // Add click handlers to alert items
        alertsContainer.querySelectorAll('.deadline-alert-item').forEach(item => {
            item.style.cursor = 'pointer';
            item.addEventListener('click', () => {
                const taskId = parseInt(item.dataset.taskId);
                this.editTask(taskId);
            });
        });
    }

    updateTasksList() {
        if (document.getElementById('tasksSection').style.display !== 'none') {
            this.renderTasks();
        }
    }

    updateOverviewStats() {
        const userTasks = this.currentUser.role === 'admin' ? 
            this.tasks : 
            this.tasks.filter(task => task.user_id === this.currentUser.id || task.assigned_to === this.currentUser.id);

        // Calculate overdue tasks
        const overdueTasks = userTasks.filter(task => {
            if (!task.deadlineInfo) {
                task.deadlineInfo = this.calculateDeadlineInfo(task.end_date, task.status);
            }
            return task.deadlineInfo.isOverdue;
        });

        // Update overdue counter
        const overdueElement = document.getElementById('overdueTasks');
        if (overdueElement) {
            overdueElement.textContent = overdueTasks.length;
        }
    }

    renderCharts(tasks) {
        if (typeof Chart === 'undefined') {
            console.warn('Chart.js not loaded, skipping chart rendering');
            return;
        }
        
        this.renderStatusChart(tasks);
        this.renderPriorityChart(tasks);
    }

    renderStatusChart(tasks) {
        const canvas = document.getElementById('taskStatusChart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        
        if (this.charts.status) {
            this.charts.status.destroy();
        }

        const statusData = {
            'Not Started': tasks.filter(t => t.status === 'Not Started').length,
            'In Progress': tasks.filter(t => t.status === 'In Progress').length,
            'Completed': tasks.filter(t => t.status === 'Completed').length
        };

        this.charts.status = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(statusData),
                datasets: [{
                    data: Object.values(statusData),
                    backgroundColor: ['#FFC185', '#1FB8CD', '#B4413C'],
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    renderPriorityChart(tasks) {
        const canvas = document.getElementById('taskPriorityChart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        
        if (this.charts.priority) {
            this.charts.priority.destroy();
        }

        const priorityData = {
            'High': tasks.filter(t => t.priority === 'High').length,
            'Medium': tasks.filter(t => t.priority === 'Medium').length,
            'Low': tasks.filter(t => t.priority === 'Low').length
        };

        this.charts.priority = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: Object.keys(priorityData),
                datasets: [{
                    label: 'Number of Tasks',
                    data: Object.values(priorityData),
                    backgroundColor: ['#DB4545', '#D2BA4C', '#5D878F'],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    }

    renderRecentTasks() {
        const recentTasks = this.tasks
            .filter(task => task.user_id === this.currentUser.id || task.assigned_to === this.currentUser.id || this.currentUser.role === 'admin')
            .sort((a, b) => new Date(b.created_date || b.updated_date) - new Date(a.created_date || a.updated_date))
            .slice(0, 5);

        const container = document.getElementById('recentTasksList');
        
        if (recentTasks.length === 0) {
            container.innerHTML = '<p class="text-muted">No recent tasks</p>';
            return;
        }

        container.innerHTML = recentTasks.map(task => {
            if (!task.deadlineInfo) {
                task.deadlineInfo = this.calculateDeadlineInfo(task.end_date, task.status);
            }
            
            return `
                <div class="recent-task-item" data-task-id="${task.id}" style="cursor: pointer;">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h6 class="mb-1">${task.title}</h6>
                            <small class="text-muted">${task.description.substring(0, 100)}...</small>
                        </div>
                        <div class="text-end">
                            <span class="status-badge status-${task.status.toLowerCase().replace(' ', '-')}">${task.status}</span>
                            <br>
                            <small class="deadline-countdown ${task.deadlineInfo.colorClass}">
                                ${task.deadlineInfo.displayText}
                            </small>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        container.querySelectorAll('.recent-task-item').forEach(item => {
            item.addEventListener('click', () => {
                const tasksNavItem = document.querySelector('[data-section="tasks"]');
                if (tasksNavItem) {
                    tasksNavItem.click();
                }
            });
        });
    }

    // Enhanced Tasks Section with Priority Ordering and Separation
    showTasks() {
        this.populateUserSelects();
        this.renderTasks();
    }

    renderTasks() {
        let tasksToShow = [];
        
        if (this.currentUser.role === 'admin') {
            tasksToShow = this.tasks;
        } else {
            tasksToShow = this.tasks.filter(task => 
                task.user_id === this.currentUser.id || task.assigned_to === this.currentUser.id
            );
        }

        // Separate ongoing and completed tasks
        const ongoingTasks = tasksToShow.filter(task => task.status !== 'Completed')
            .sort((a, b) => this.sortTasksByPriority(a, b));
        
        const completedTasks = tasksToShow.filter(task => task.status === 'Completed')
            .sort((a, b) => new Date(b.completed_date || 0) - new Date(a.completed_date || 0));

        this.renderTasksList('ongoingTasksList', ongoingTasks);
        this.renderTasksList('completedTasksList', completedTasks);
    }

    sortTasksByPriority(a, b) {
        const priorityOrder = { 'High': 3, 'Medium': 2, 'Low': 1 };
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
        
        if (priorityDiff !== 0) {
            return priorityDiff;
        }
        
        // If same priority, sort by deadline
        return new Date(a.end_date) - new Date(b.end_date);
    }

    renderTasksList(containerId, tasks) {
        const tasksList = document.getElementById(containerId);
        if (!tasksList) return;
        
        if (tasks.length === 0) {
            const emptyMessage = containerId === 'ongoingTasksList' ? 
                'No ongoing tasks' : 'No completed tasks';
            tasksList.innerHTML = `
                <div class="text-center py-5">
                    <i class="fas fa-tasks fa-3x text-muted mb-3"></i>
                    <h4 class="text-muted">${emptyMessage}</h4>
                    <p class="text-muted">Tasks will appear here when available.</p>
                </div>
            `;
            return;
        }

        tasksList.innerHTML = tasks.map(task => this.createTaskCard(task)).join('');
    }

    createTaskCard(task) {
        const user = this.users.find(u => u.id === task.user_id || u.id === task.assigned_by);
        const assignee = this.users.find(u => u.id === task.assigned_to);
        const isCurrentUserTask = task.user_id === this.currentUser.id || task.assigned_to === this.currentUser.id;
        const canEdit = (isCurrentUserTask || this.currentUser.role === 'admin') && !task.locked_for_editing;
        const isAssignee = task.assigned_to === this.currentUser.id;
        const isCompleted = task.status === 'Completed';
        const canRequestEdit = isCompleted && isAssignee && task.locked_for_editing;
        
        // Update deadline info
        if (!task.deadlineInfo) {
            task.deadlineInfo = this.calculateDeadlineInfo(task.end_date, task.status);
        }
        
        let cardClass = 'task-card';
        if (task.locked_for_editing) {
            cardClass += ' locked-task';
        } else if (task.deadlineInfo.isOverdue) {
            cardClass += ' overdue-task';
        } else if (task.deadlineInfo.urgencyLevel === 'today' || task.deadlineInfo.urgencyLevel === 'urgent') {
            cardClass += ' deadline-urgent-task';
        } else if (task.deadlineInfo.urgencyLevel === 'warning') {
            cardClass += ' deadline-warning-task';
        }
        
        return `
            <div class="${cardClass}" data-task-id="${task.id}">
                <div class="task-card-header">
                    <div>
                        <h5 class="task-title">${task.title}</h5>
                    </div>
                    <div class="task-header-badges">
                        <span class="priority-badge priority-${task.priority.toLowerCase()}">${task.priority}</span>
                        <span class="status-badge status-${task.status.toLowerCase().replace(' ', '-')}">${task.status}</span>
                        ${task.deadlineInfo.isOverdue ? '<span class="badge bg-danger">OVERDUE</span>' : ''}
                        ${task.locked_for_editing ? '<span class="badge bg-warning">LOCKED</span>' : ''}
                    </div>
                </div>
                <div class="task-card-body">
                    ${task.locked_for_editing ? `
                        <div class="locked-task-notice">
                            <i class="fas fa-lock"></i>
                            <span>This completed task is locked for editing. ${canRequestEdit ? 'You can request permission to edit it.' : 'Contact the task assignor to request editing permission.'}</span>
                        </div>
                    ` : ''}
                    <p class="task-description">${task.description}</p>
                    <div class="task-meta">
                        <div class="task-meta-item">
                            <i class="fas fa-calendar-alt"></i>
                            <span>Duration: ${task.start_date} - ${task.end_date}</span>
                        </div>
                        <div class="task-meta-item task-deadline-info">
                            <i class="fas fa-clock"></i>
                            <span>Deadline: 
                                <span class="deadline-countdown ${task.deadlineInfo.colorClass}">
                                    ${task.deadlineInfo.displayText}
                                </span>
                            </span>
                        </div>
                        <div class="task-meta-item">
                            <i class="fas fa-user"></i>
                            <span>Created by: ${user ? user.username : 'Unknown'}</span>
                        </div>
                        ${assignee ? `
                            <div class="task-meta-item">
                                <i class="fas fa-user-tag"></i>
                                <span>Assigned to: ${assignee.username}</span>
                            </div>
                        ` : ''}
                    </div>
                    <div class="task-timestamps">
                        <div class="timestamp-item">
                            <span><i class="fas fa-plus"></i> Created:</span>
                            <span>${this.formatDateTime(task.created_date)}</span>
                        </div>
                        ${task.assignment_date ? `
                            <div class="timestamp-item">
                                <span><i class="fas fa-share"></i> Assigned:</span>
                                <span>${this.formatDateTime(task.assignment_date)}</span>
                            </div>
                        ` : ''}
                        ${task.completed_date ? `
                            <div class="timestamp-item">
                                <span><i class="fas fa-check"></i> Completed:</span>
                                <span>${this.formatDateTime(task.completed_date)}</span>
                            </div>
                        ` : ''}
                    </div>
                    ${task.assignee_comments ? `
                        <div class="task-comments">
                            <strong>Comments:</strong> ${task.assignee_comments}
                        </div>
                    ` : ''}
                    ${task.remarks ? `
                        <div class="task-remarks">
                            <strong>Completion Remarks:</strong> ${task.remarks}
                        </div>
                    ` : ''}
                </div>
                <div class="task-actions">
                    ${canEdit ? `
                        <button class="btn btn-sm btn-primary" onclick="taskManager.editTask(${task.id})">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="taskManager.deleteTask(${task.id})">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    ` : ''}
                    ${canRequestEdit ? `
                        <button class="btn btn-sm btn-warning" onclick="taskManager.showEditRequestModal(${task.id})">
                            <i class="fas fa-unlock-alt"></i> Request to Edit
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }

    formatDateTime(dateTimeString) {
        if (!dateTimeString) return 'N/A';
        const date = new Date(dateTimeString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    }

    filterTasks() {
        const statusFilter = document.getElementById('statusFilter').value;
        const priorityFilter = document.getElementById('priorityFilter').value;
        const deadlineFilter = document.getElementById('deadlineFilter').value;
        const assigneeFilter = document.getElementById('assigneeFilter');
        const assigneeValue = assigneeFilter ? assigneeFilter.value : '';
        const searchQuery = document.getElementById('searchTasks').value.toLowerCase();

        let filteredTasks = this.currentUser.role === 'admin' ? 
            this.tasks : 
            this.tasks.filter(task => task.user_id === this.currentUser.id || task.assigned_to === this.currentUser.id);

        if (statusFilter) {
            filteredTasks = filteredTasks.filter(task => task.status === statusFilter);
        }

        if (priorityFilter) {
            filteredTasks = filteredTasks.filter(task => task.priority === priorityFilter);
        }

        if (deadlineFilter) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            filteredTasks = filteredTasks.filter(task => {
                if (!task.deadlineInfo) {
                    task.deadlineInfo = this.calculateDeadlineInfo(task.end_date, task.status);
                }
                
                switch (deadlineFilter) {
                    case 'overdue':
                        return task.deadlineInfo.isOverdue;
                    case 'today':
                        return task.deadlineInfo.urgencyLevel === 'today';
                    case 'week':
                        return task.deadlineInfo.daysRemaining >= 0 && task.deadlineInfo.daysRemaining <= 7 && task.status !== 'Completed';
                    case 'month':
                        return task.deadlineInfo.daysRemaining >= 0 && task.deadlineInfo.daysRemaining <= 30 && task.status !== 'Completed';
                    default:
                        return true;
                }
            });
        }

        if (assigneeValue) {
            filteredTasks = filteredTasks.filter(task => task.assigned_to == assigneeValue);
        }

        if (searchQuery) {
            filteredTasks = filteredTasks.filter(task => 
                task.title.toLowerCase().includes(searchQuery) ||
                task.description.toLowerCase().includes(searchQuery)
            );
        }

        // Separate and render filtered tasks
        const ongoingTasks = filteredTasks.filter(task => task.status !== 'Completed')
            .sort((a, b) => this.sortTasksByPriority(a, b));
        
        const completedTasks = filteredTasks.filter(task => task.status === 'Completed')
            .sort((a, b) => new Date(b.completed_date || 0) - new Date(a.completed_date || 0));

        this.renderTasksList('ongoingTasksList', ongoingTasks);
        this.renderTasksList('completedTasksList', completedTasks);
    }

    showTaskModal(task = null) {
        const modal = document.getElementById('taskModal');
        const title = document.getElementById('taskModalTitle');
        const form = document.getElementById('taskForm');
        
        this.populateUserSelects();
        
        if (task) {
            title.textContent = 'Edit Task';
            document.getElementById('taskId').value = task.id;
            document.getElementById('taskTitle').value = task.title;
            document.getElementById('taskDescription').value = task.description;
            document.getElementById('taskStartDate').value = task.start_date;
            document.getElementById('taskEndDate').value = task.end_date;
            document.getElementById('taskPriority').value = task.priority;
            document.getElementById('taskStatus').value = task.status;
            document.getElementById('taskAssignedTo').value = task.assigned_to || '';
            document.getElementById('taskRemarks').value = task.remarks || '';
            
            // Show remarks field if task is completed
            this.toggleRemarksField({ target: { value: task.status } });
        } else {
            title.textContent = 'Add Task';
            form.reset();
            document.getElementById('taskId').value = '';
            // Set default start date to today
            const today = new Date().toISOString().split('T')[0];
            document.getElementById('taskStartDate').value = today;
            document.getElementById('taskRemarksContainer').style.display = 'none';
        }
        
        this.taskModal.show();
    }

    toggleRemarksField(e) {
        const status = e.target.value;
        const remarksContainer = document.getElementById('taskRemarksContainer');
        const remarksField = document.getElementById('taskRemarks');
        
        if (status === 'Completed') {
            remarksContainer.style.display = 'block';
            remarksField.required = true;
        } else {
            remarksContainer.style.display = 'none';
            remarksField.required = false;
            remarksField.value = '';
        }
    }

    saveTask() {
        const taskId = document.getElementById('taskId').value;
        const oldTask = taskId ? this.tasks.find(t => t.id === parseInt(taskId)) : null;
        const currentTime = new Date().toISOString();
        
        const taskData = {
            title: document.getElementById('taskTitle').value,
            description: document.getElementById('taskDescription').value,
            start_date: document.getElementById('taskStartDate').value,
            end_date: document.getElementById('taskEndDate').value,
            priority: document.getElementById('taskPriority').value,
            status: document.getElementById('taskStatus').value,
            assigned_to: parseInt(document.getElementById('taskAssignedTo').value) || null,
            remarks: document.getElementById('taskRemarks').value || '',
            updated_date: currentTime
        };

        // Validate required fields
        if (!taskData.title || !taskData.description || !taskData.start_date || !taskData.end_date) {
            this.showAlert('Please fill in all required fields', 'danger');
            return;
        }

        if (taskData.status === 'Completed' && !taskData.remarks) {
            this.showAlert('Please provide completion remarks when marking task as completed', 'danger');
            return;
        }

        if (taskId) {
            const taskIndex = this.tasks.findIndex(t => t.id === parseInt(taskId));
            if (taskIndex !== -1) {
                // Check if status changed to completed
                const wasCompleted = oldTask.status === 'Completed';
                const nowCompleted = taskData.status === 'Completed';
                
                if (!wasCompleted && nowCompleted) {
                    taskData.locked_for_editing = true;
                    taskData.completed_date = currentTime;
                    
                    // Add to task history
                    this.addTaskHistory(parseInt(taskId), 'completed', this.currentUser.id, 
                        `Task completed with remarks: ${taskData.remarks}`);
                } else if (oldTask.status !== taskData.status) {
                    // Add status change to history
                    this.addTaskHistory(parseInt(taskId), 'status_changed', this.currentUser.id, 
                        `Status changed from "${oldTask.status}" to "${taskData.status}"`);
                }
                
                this.tasks[taskIndex] = { ...this.tasks[taskIndex], ...taskData };
                // Update deadline info
                this.tasks[taskIndex].deadlineInfo = this.calculateDeadlineInfo(taskData.end_date, taskData.status);
                this.showAlert('Task updated successfully!', 'success');
                
                // Add edit history
                this.addTaskHistory(parseInt(taskId), 'edited', this.currentUser.id, 
                    `Task details updated`);
            }
        } else {
            const newTask = {
                id: this.getNextId(this.tasks),
                user_id: this.currentUser.id,
                assigned_by: this.currentUser.id,
                created_date: currentTime,
                assignment_date: taskData.assigned_to ? currentTime : null,
                completed_date: taskData.status === 'Completed' ? currentTime : null,
                assignee_comments: '',
                progress_notes: [],
                locked_for_editing: taskData.status === 'Completed',
                ...taskData
            };
            
            // Calculate deadline info for new task
            newTask.deadlineInfo = this.calculateDeadlineInfo(newTask.end_date, newTask.status);
            this.tasks.push(newTask);
            this.showAlert('Task created successfully!', 'success');
            
            // Add to task history
            const assignee = this.users.find(u => u.id === newTask.assigned_to);
            const assignmentText = assignee ? ` and assigned to ${assignee.username}` : '';
            this.addTaskHistory(newTask.id, 'created', this.currentUser.id, 
                `Task created${assignmentText}`);
        }

        this.saveData();
        this.taskModal.hide();
        this.renderTasks();
        this.updateDeadlineCalculations();
        
        if (this.calendar) {
            this.updateCalendarEvents();
        }
    }

    addTaskHistory(taskId, action, userId, details) {
        const historyEntry = {
            id: this.getNextId(this.taskHistory),
            task_id: taskId,
            action: action,
            user_id: userId,
            timestamp: new Date().toISOString(),
            details: details
        };
        
        this.taskHistory.push(historyEntry);
        this.saveData();
    }

    editTask(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            if (task.locked_for_editing) {
                this.showAlert('This task is locked for editing. Please request permission first.', 'warning');
                return;
            }
            this.showTaskModal(task);
        }
    }

    deleteTask(taskId) {
        if (confirm('Are you sure you want to delete this task?')) {
            const task = this.tasks.find(t => t.id === taskId);
            
            // Add to history before deletion
            this.addTaskHistory(taskId, 'deleted', this.currentUser.id, 
                `Task "${task.title}" was deleted`);
            
            this.tasks = this.tasks.filter(t => t.id !== taskId);
            this.saveData();
            this.renderTasks();
            this.updateDeadlineCalculations();
            this.showAlert('Task deleted successfully!', 'success');
            
            if (this.calendar) {
                this.updateCalendarEvents();
            }
        }
    }

    // Chat System Implementation
    showChat() {
        this.renderChatUsers();
        this.updateChatNotifications();
    }

    renderChatUsers() {
        const container = document.getElementById('chatUsersList');
        const otherUsers = this.users.filter(u => u.id !== this.currentUser.id);
        
        if (otherUsers.length === 0) {
            container.innerHTML = '<p class="text-center text-muted p-3">No other users available</p>';
            return;
        }

        container.innerHTML = otherUsers.map(user => {
            const unreadCount = this.getUnreadMessageCount(user.id);
            const isOnline = this.isUserOnline(user.id);
            const userInitials = user.username.substring(0, 2).toUpperCase();
            
            return `
                <div class="chat-user-item" data-user-id="${user.id}" onclick="taskManager.selectChatUser(${user.id})">
                    <div class="user-avatar">
                        ${userInitials}
                    </div>
                    <div class="user-info-chat">
                        <div class="user-name">${user.username}</div>
                        <div class="user-status ${isOnline ? 'status-online' : 'status-offline'}">
                            <i class="fas fa-circle"></i>
                            ${isOnline ? 'Online' : 'Offline'}
                        </div>
                    </div>
                    ${unreadCount > 0 ? `<div class="unread-indicator"></div>` : ''}
                </div>
            `;
        }).join('');
    }

    isUserOnline(userId) {
        const userStatus = this.userOnlineStatus[userId];
        if (!userStatus) return false;
        
        const lastSeen = new Date(userStatus.lastSeen);
        const now = new Date();
        const timeDiff = now - lastSeen;
        
        // Consider user online if last seen within 5 minutes
        return timeDiff < 5 * 60 * 1000;
    }

    getUnreadMessageCount(userId) {
        return this.messages.filter(msg => 
            msg.sender_id === userId && 
            msg.receiver_id === this.currentUser.id && 
            !msg.is_read
        ).length;
    }

    selectChatUser(userId) {
        const user = this.users.find(u => u.id === userId);
        if (!user) return;
        
        this.currentChatUser = user;
        
        // Update UI
        document.querySelectorAll('.chat-user-item').forEach(item => {
            item.classList.remove('active');
        });
        
        document.querySelector(`[data-user-id="${userId}"]`).classList.add('active');
        
        // Update chat header
        const chatHeader = document.getElementById('chatHeader');
        const isOnline = this.isUserOnline(userId);
        chatHeader.innerHTML = `
            <div class="user-avatar">
                ${user.username.substring(0, 2).toUpperCase()}
            </div>
            <div class="ms-2">
                <div class="fw-bold">${user.username}</div>
                <div class="user-status ${isOnline ? 'status-online' : 'status-offline'}">
                    <i class="fas fa-circle"></i>
                    ${isOnline ? 'Online' : 'Offline'}
                </div>
            </div>
        `;
        
        // Enable chat input
        document.getElementById('chatMessageInput').disabled = false;
        document.getElementById('sendMessageBtn').disabled = false;
        
        // Load and render messages
        this.renderChatMessages(userId);
        
        // Mark messages as read
        this.markMessagesAsRead(userId);
    }

    renderChatMessages(userId) {
        const container = document.getElementById('chatMessages');
        const conversation = this.messages.filter(msg => 
            (msg.sender_id === this.currentUser.id && msg.receiver_id === userId) ||
            (msg.sender_id === userId && msg.receiver_id === this.currentUser.id)
        ).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        
        if (conversation.length === 0) {
            container.innerHTML = `
                <div class="text-center text-muted">
                    <i class="fas fa-comments fa-3x mb-3"></i>
                    <p>No messages yet. Start the conversation!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = conversation.map(msg => {
            const isSent = msg.sender_id === this.currentUser.id;
            const time = this.formatMessageTime(msg.timestamp);
            
            return `
                <div class="message-bubble ${isSent ? 'sent' : 'received'}">
                    <div class="message-content">${msg.message}</div>
                    <div class="message-time">${time}</div>
                </div>
            `;
        }).join('');
        
        // Scroll to bottom
        container.scrollTop = container.scrollHeight;
    }

    formatMessageTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const isToday = date.toDateString() === now.toDateString();
        
        if (isToday) {
            return date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        } else {
            return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        }
    }

    sendMessage() {
        if (!this.currentChatUser) return;
        
        const input = document.getElementById('chatMessageInput');
        const message = input.value.trim();
        
        if (!message) return;
        
        const newMessage = {
            id: this.getNextId(this.messages),
            sender_id: this.currentUser.id,
            receiver_id: this.currentChatUser.id,
            message: message,
            timestamp: new Date().toISOString(),
            is_read: false
        };
        
        this.messages.push(newMessage);
        this.saveData();
        
        input.value = '';
        this.renderChatMessages(this.currentChatUser.id);
    }

    markMessagesAsRead(userId) {
        this.messages.forEach(msg => {
            if (msg.sender_id === userId && msg.receiver_id === this.currentUser.id) {
                msg.is_read = true;
            }
        });
        this.saveData();
        this.updateChatNotifications();
    }

    updateChatNotifications() {
        const unreadTotal = this.messages.filter(msg => 
            msg.receiver_id === this.currentUser.id && !msg.is_read
        ).length;
        
        const badge = document.getElementById('chatNotificationBadge');
        if (unreadTotal > 0) {
            badge.textContent = unreadTotal > 99 ? '99+' : unreadTotal;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
        
        // Update chat users list to show unread indicators
        if (document.getElementById('chatSection').style.display !== 'none') {
            this.renderChatUsers();
        }
    }

    // History Section Implementation
    showHistory() {
        this.populateUserSelects();
        this.renderHistory();
    }

    renderHistory() {
        let historyToShow = this.taskHistory;
        
        // Filter based on user permissions
        if (this.currentUser.role !== 'admin') {
            const userTaskIds = this.tasks
                .filter(task => task.user_id === this.currentUser.id || task.assigned_to === this.currentUser.id)
                .map(task => task.id);
            historyToShow = historyToShow.filter(entry => userTaskIds.includes(entry.task_id));
        }
        
        // Sort by timestamp (newest first)
        historyToShow = historyToShow.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        this.renderHistoryTimeline(historyToShow);
    }

    renderHistoryTimeline(history) {
        const container = document.getElementById('historyTimeline');
        if (!container) return;
        
        if (history.length === 0) {
            container.innerHTML = `
                <div class="text-center py-5">
                    <i class="fas fa-history fa-3x text-muted mb-3"></i>
                    <h4 class="text-muted">No history available</h4>
                    <p class="text-muted">Task activities will appear here when available.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = history.map(entry => {
            const task = this.tasks.find(t => t.id === entry.task_id);
            const user = this.users.find(u => u.id === entry.user_id);
            const time = this.formatDateTime(entry.timestamp);
            
            return `
                <div class="history-item ${entry.action}">
                    <div class="history-header">
                        <div class="history-action">
                            ${this.getActionIcon(entry.action)} ${this.getActionText(entry.action)}
                        </div>
                        <div class="history-time">${time}</div>
                    </div>
                    <div class="history-details">
                        <strong>Task:</strong> ${task ? task.title : 'Deleted Task'}<br>
                        <strong>User:</strong> <span class="history-user">${user ? user.username : 'Unknown'}</span><br>
                        <strong>Details:</strong> ${entry.details}
                    </div>
                </div>
            `;
        }).join('');
    }

    getActionIcon(action) {
        const icons = {
            'created': '<i class="fas fa-plus-circle text-success"></i>',
            'completed': '<i class="fas fa-check-circle text-primary"></i>',
            'edited': '<i class="fas fa-edit text-warning"></i>',
            'assigned': '<i class="fas fa-user-tag text-info"></i>',
            'deleted': '<i class="fas fa-trash text-danger"></i>',
            'status_changed': '<i class="fas fa-exchange-alt text-info"></i>'
        };
        return icons[action] || '<i class="fas fa-info-circle"></i>';
    }

    getActionText(action) {
        const texts = {
            'created': 'Task Created',
            'completed': 'Task Completed',
            'edited': 'Task Edited',
            'assigned': 'Task Assigned',
            'deleted': 'Task Deleted',
            'status_changed': 'Status Changed'
        };
        return texts[action] || 'Task Activity';
    }

    filterHistory() {
        const actionFilter = document.getElementById('historyFilter').value;
        const userFilter = document.getElementById('historyUserFilter').value;
        const searchQuery = document.getElementById('historySearch').value.toLowerCase();

        let filteredHistory = this.taskHistory;
        
        // Filter based on user permissions
        if (this.currentUser.role !== 'admin') {
            const userTaskIds = this.tasks
                .filter(task => task.user_id === this.currentUser.id || task.assigned_to === this.currentUser.id)
                .map(task => task.id);
            filteredHistory = filteredHistory.filter(entry => userTaskIds.includes(entry.task_id));
        }

        if (actionFilter) {
            filteredHistory = filteredHistory.filter(entry => entry.action === actionFilter);
        }

        if (userFilter) {
            filteredHistory = filteredHistory.filter(entry => entry.user_id == userFilter);
        }

        if (searchQuery) {
            filteredHistory = filteredHistory.filter(entry => {
                const task = this.tasks.find(t => t.id === entry.task_id);
                const user = this.users.find(u => u.id === entry.user_id);
                
                return (task && task.title.toLowerCase().includes(searchQuery)) ||
                       (user && user.username.toLowerCase().includes(searchQuery)) ||
                       entry.details.toLowerCase().includes(searchQuery);
            });
        }

        // Sort by timestamp (newest first)
        filteredHistory = filteredHistory.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        this.renderHistoryTimeline(filteredHistory);
    }

    // Edit Request System
    showEditRequestModal(taskId) {
        document.getElementById('editRequestTaskId').value = taskId;
        document.getElementById('editRequestReason').value = '';
        this.editRequestModal.show();
    }

    submitEditRequest() {
        const taskId = parseInt(document.getElementById('editRequestTaskId').value);
        const reason = document.getElementById('editRequestReason').value.trim();
        
        if (!reason) {
            this.showAlert('Please provide a reason for the edit request', 'danger');
            return;
        }

        const task = this.tasks.find(t => t.id === taskId);
        if (!task) {
            this.showAlert('Task not found', 'danger');
            return;
        }

        // Check if there's already a pending request for this task
        const existingRequest = this.editRequests.find(r => 
            r.task_id === taskId && 
            r.requested_by === this.currentUser.id && 
            r.status === 'pending'
        );

        if (existingRequest) {
            this.showAlert('You already have a pending edit request for this task', 'warning');
            return;
        }

        const newRequest = {
            id: this.getNextId(this.editRequests),
            task_id: taskId,
            requested_by: this.currentUser.id,
            assigned_by: task.user_id,
            reason: reason,
            status: 'pending',
            request_date: new Date().toISOString(),
            response_date: null,
            admin_notes: ''
        };

        this.editRequests.push(newRequest);
        this.saveData();
        this.editRequestModal.hide();
        this.showAlert('Edit request submitted successfully!', 'success');
        
        // Add to task history
        this.addTaskHistory(taskId, 'edit_requested', this.currentUser.id, 
            `Edit request submitted: ${reason}`);
    }

    approveEditRequest(requestId) {
        const request = this.editRequests.find(r => r.id === requestId);
        if (!request) return;

        const task = this.tasks.find(t => t.id === request.task_id);
        if (task) {
            task.locked_for_editing = false;
            request.status = 'approved';
            request.response_date = new Date().toISOString();
            
            this.saveData();
            this.showAlert('Edit request approved! Task is now unlocked for editing.', 'success');
            this.showEditRequests();
            this.renderTasks();
            
            // Add to task history
            this.addTaskHistory(request.task_id, 'edit_approved', this.currentUser.id, 
                'Edit request was approved and task unlocked');
        }
    }

    rejectEditRequest(requestId, reason = '') {
        const request = this.editRequests.find(r => r.id === requestId);
        if (!request) return;

        request.status = 'rejected';
        request.response_date = new Date().toISOString();
        request.admin_notes = reason;
        
        this.saveData();
        this.showAlert('Edit request rejected.', 'info');
        this.showEditRequests();
        
        // Add to task history
        this.addTaskHistory(request.task_id, 'edit_rejected', this.currentUser.id, 
            'Edit request was rejected');
    }

    showEditRequests() {
        this.renderMyEditRequests();
        this.renderIncomingEditRequests();
    }

    renderMyEditRequests() {
        const container = document.getElementById('myEditRequests');
        const myRequests = this.editRequests.filter(r => r.requested_by === this.currentUser.id);
        
        if (myRequests.length === 0) {
            container.innerHTML = '<p class="text-muted">No edit requests made</p>';
            return;
        }

        container.innerHTML = myRequests.map(request => {
            const task = this.tasks.find(t => t.id === request.task_id);
            const assignor = this.users.find(u => u.id === request.assigned_by);
            
            return `
                <div class="edit-request-card ${request.status}">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <h6 class="mb-1">${task ? task.title : 'Unknown Task'}</h6>
                        <span class="request-status-badge ${request.status}">${request.status.toUpperCase()}</span>
                    </div>
                    <p class="mb-2"><strong>Reason:</strong> ${request.reason}</p>
                    <div class="text-muted">
                        <small>Requested from: ${assignor ? assignor.username : 'Unknown'}</small><br>
                        <small>Date: ${this.formatDateTime(request.request_date)}</small>
                        ${request.response_date ? `<br><small>Responded: ${this.formatDateTime(request.response_date)}</small>` : ''}
                        ${request.admin_notes ? `<br><small>Notes: ${request.admin_notes}</small>` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    renderIncomingEditRequests() {
        const container = document.getElementById('incomingEditRequests');
        let incomingRequests = [];
        
        if (this.currentUser.role === 'admin') {
            incomingRequests = this.editRequests.filter(r => r.status === 'pending');
        } else {
            incomingRequests = this.editRequests.filter(r => 
                r.assigned_by === this.currentUser.id && r.status === 'pending'
            );
        }
        
        if (incomingRequests.length === 0) {
            container.innerHTML = '<p class="text-muted">No pending requests</p>';
            return;
        }

        container.innerHTML = incomingRequests.map(request => {
            const task = this.tasks.find(t => t.id === request.task_id);
            const requester = this.users.find(u => u.id === request.requested_by);
            
            return `
                <div class="edit-request-card pending">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <h6 class="mb-1">${task ? task.title : 'Unknown Task'}</h6>
                        <span class="request-status-badge pending">PENDING</span>
                    </div>
                    <p class="mb-2"><strong>Reason:</strong> ${request.reason}</p>
                    <div class="text-muted mb-3">
                        <small>Requested by: ${requester ? requester.username : 'Unknown'}</small><br>
                        <small>Date: ${this.formatDateTime(request.request_date)}</small>
                    </div>
                    <div class="d-flex gap-2">
                        <button class="btn btn-sm btn-success" onclick="taskManager.approveEditRequest(${request.id})">
                            <i class="fas fa-check"></i> Approve
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="taskManager.rejectEditRequest(${request.id})">
                            <i class="fas fa-times"></i> Reject
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Schedule Section with Enhanced Calendar
    showSchedule() {
        if (typeof FullCalendar === 'undefined') {
            document.getElementById('calendar').innerHTML = '<p class="text-center">Calendar feature is not available.</p>';
            return;
        }
        
        if (!this.calendar) {
            this.initializeCalendar();
        } else {
            this.updateCalendarEvents();
        }
    }

    initializeCalendar() {
        const calendarEl = document.getElementById('calendar');
        
        this.calendar = new FullCalendar.Calendar(calendarEl, {
            initialView: 'dayGridMonth',
            headerToolbar: {
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay'
            },
            events: this.getCalendarEvents(),
            eventClick: (info) => {
                const taskId = parseInt(info.event.id);
                this.editTask(taskId);
            },
            dateClick: (info) => {
                document.getElementById('taskStartDate').value = info.dateStr;
                this.showTaskModal();
            }
        });
        
        this.calendar.render();
    }

    getCalendarEvents() {
        return this.tasks
            .filter(task => task.user_id === this.currentUser.id || task.assigned_to === this.currentUser.id || this.currentUser.role === 'admin')
            .map(task => {
                if (!task.deadlineInfo) {
                    task.deadlineInfo = this.calculateDeadlineInfo(task.end_date, task.status);
                }
                
                return {
                    id: task.id,
                    title: task.title,
                    start: task.start_date,
                    end: task.end_date,
                    backgroundColor: this.getTaskColor(task),
                    borderColor: this.getTaskColor(task),
                    extendedProps: {
                        status: task.status,
                        priority: task.priority,
                        urgencyLevel: task.deadlineInfo.urgencyLevel
                    }
                };
            });
    }

    getTaskColor(task) {
        // Color based on deadline urgency if not completed
        if (task.status === 'Completed') {
            return '#28a745'; // Green for completed
        }
        
        if (!task.deadlineInfo) {
            task.deadlineInfo = this.calculateDeadlineInfo(task.end_date, task.status);
        }
        
        switch (task.deadlineInfo.urgencyLevel) {
            case 'overdue':
                return '#dc3545'; // Red
            case 'today':
            case 'urgent':
                return '#fd7e14'; // Orange
            case 'warning':
                return '#ffc107'; // Yellow
            default:
                // Color by priority for safe deadlines
                const priorityColors = {
                    'High': '#dc3545',
                    'Medium': '#fd7e14',
                    'Low': '#28a745'
                };
                return priorityColors[task.priority] || '#6c757d';
        }
    }

    updateCalendarEvents() {
        if (this.calendar) {
            this.calendar.removeAllEvents();
            this.calendar.addEventSource(this.getCalendarEvents());
        }
    }

    // User Management
    showCreateUserModal() {
        document.getElementById('createUserForm').reset();
        this.createUserModal.show();
    }

    createUser() {
        const username = document.getElementById('newUserUsername').value.trim();
        const email = document.getElementById('newUserEmail').value.trim();
        const password = document.getElementById('newUserPassword').value;
        const role = document.getElementById('newUserRole').value;

        if (!username || !email || !password || !role) {
            this.showAlert('Please fill in all fields', 'danger');
            return;
        }

        if (this.users.find(u => u.username === username)) {
            this.showAlert('Username already exists', 'danger');
            return;
        }

        if (this.users.find(u => u.email === email)) {
            this.showAlert('Email already registered', 'danger');
            return;
        }

        const newUser = {
            id: this.getNextId(this.users),
            username,
            password_hash: this.hashPassword(password),
            email,
            role,
            created_date: new Date().toISOString(),
            last_login: 'Never',
            last_activity: new Date().toISOString()
        };

        this.users.push(newUser);
        this.saveData();
        this.createUserModal.hide();
        this.renderUsersTable();
        this.populateUserSelects();
        this.showAlert('User created successfully!', 'success');
    }

    // Profile Section
    showProfile() {
        document.getElementById('profileUsername').value = this.currentUser.username;
        document.getElementById('profileEmail').value = this.currentUser.email;
        document.getElementById('profileRole').value = this.currentUser.role;
    }

    updateProfile(e) {
        e.preventDefault();
        const email = document.getElementById('profileEmail').value;
        
        this.currentUser.email = email;
        this.saveCurrentUser();
        this.showAlert('Profile updated successfully!', 'success');
    }

    changePassword(e) {
        e.preventDefault();
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmNewPassword = document.getElementById('confirmNewPassword').value;

        if (!this.comparePassword(currentPassword, this.currentUser.password_hash)) {
            this.showAlert('Current password is incorrect', 'danger');
            return;
        }

        if (newPassword !== confirmNewPassword) {
            this.showAlert('New passwords do not match', 'danger');
            return;
        }

        this.currentUser.password_hash = this.hashPassword(newPassword);
        this.saveCurrentUser();
        document.getElementById('changePasswordForm').reset();
        this.showAlert('Password changed successfully!', 'success');
    }

    // Admin Section
    showAdmin() {
        if (this.currentUser.role !== 'admin') {
            this.showAlert('Access denied. Admin privileges required.', 'danger');
            return;
        }

        this.renderUsersTable();
        this.renderAdminEditRequests();
    }

    renderUsersTable() {
        const tbody = document.getElementById('usersTable');
        if (!tbody) return;
        
        tbody.innerHTML = this.users.map(user => {
            const userTasks = this.tasks.filter(t => t.user_id === user.id || t.assigned_to === user.id);
            const isCurrentUser = user.id === this.currentUser.id;
            
            return `
                <tr>
                    <td>${user.username}</td>
                    <td>${user.email}</td>
                    <td>
                        <span class="badge ${user.role === 'admin' ? 'bg-warning' : 'bg-primary'}">
                            ${user.role}
                        </span>
                    </td>
                    <td>${userTasks.length}</td>
                    <td>${this.formatDateTime(user.last_login)}</td>
                    <td>
                        <div class="d-flex gap-1">
                            ${!isCurrentUser ? `
                                <button class="btn btn-sm btn-warning" onclick="taskManager.toggleUserRole(${user.id})">
                                    ${user.role === 'admin' ? 'Demote' : 'Promote'}
                                </button>
                                <button class="btn btn-sm btn-danger" onclick="taskManager.deleteUser(${user.id})">
                                    Delete
                                </button>
                            ` : '<span class="text-muted">Current User</span>'}
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    renderAdminEditRequests() {
        const container = document.getElementById('adminEditRequests');
        if (!container) return;

        const allRequests = this.editRequests;
        
        if (allRequests.length === 0) {
            container.innerHTML = '<p class="text-muted">No edit requests found</p>';
            return;
        }

        container.innerHTML = allRequests.map(request => {
            const task = this.tasks.find(t => t.id === request.task_id);
            const requester = this.users.find(u => u.id === request.requested_by);
            const assignor = this.users.find(u => u.id === request.assigned_by);
            
            return `
                <div class="edit-request-card ${request.status}">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <h6 class="mb-1">${task ? task.title : 'Unknown Task'}</h6>
                        <span class="request-status-badge ${request.status}">${request.status.toUpperCase()}</span>
                    </div>
                    <p class="mb-2"><strong>Reason:</strong> ${request.reason}</p>
                    <div class="text-muted mb-2">
                        <small>Requested by: ${requester ? requester.username : 'Unknown'}</small><br>
                        <small>Task assigned by: ${assignor ? assignor.username : 'Unknown'}</small><br>
                        <small>Date: ${this.formatDateTime(request.request_date)}</small>
                        ${request.response_date ? `<br><small>Responded: ${this.formatDateTime(request.response_date)}</small>` : ''}
                        ${request.admin_notes ? `<br><small>Admin notes: ${request.admin_notes}</small>` : ''}
                    </div>
                    ${request.status === 'pending' ? `
                        <div class="d-flex gap-2">
                            <button class="btn btn-sm btn-success" onclick="taskManager.approveEditRequest(${request.id})">
                                <i class="fas fa-check"></i> Approve
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="taskManager.rejectEditRequest(${request.id})">
                                <i class="fas fa-times"></i> Reject
                            </button>
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');
    }

    toggleUserRole(userId) {
        const user = this.users.find(u => u.id === userId);
        if (user) {
            user.role = user.role === 'admin' ? 'user' : 'admin';
            this.saveData();
            this.renderUsersTable();
            this.showAlert(`User role updated to ${user.role}`, 'success');
        }
    }

    deleteUser(userId) {
        if (confirm('Are you sure you want to delete this user and all their tasks?')) {
            this.users = this.users.filter(u => u.id !== userId);
            this.tasks = this.tasks.filter(t => t.user_id !== userId && t.assigned_to !== userId);
            this.editRequests = this.editRequests.filter(r => r.requested_by !== userId && r.assigned_by !== userId);
            this.messages = this.messages.filter(m => m.sender_id !== userId && m.receiver_id !== userId);
            this.taskHistory = this.taskHistory.filter(h => h.user_id !== userId);
            this.saveData();
            this.renderUsersTable();
            this.populateUserSelects();
            this.showAlert('User deleted successfully!', 'success');
        }
    }

    // Team Progress, Reports, and Settings (simplified for space)
    showTeamProgress() {
        if (this.currentUser.role !== 'admin') {
            this.showAlert('Access denied. Admin privileges required.', 'danger');
            return;
        }
        // Implementation simplified
    }

    showReports() {
        if (this.currentUser.role !== 'admin') {
            this.showAlert('Access denied. Admin privileges required.', 'danger');
            return;
        }
        // Implementation simplified
    }

    showSettings() {
        if (this.currentUser.role !== 'admin') {
            this.showAlert('Access denied. Admin privileges required.', 'danger');
            return;
        }
        // Implementation simplified
    }

    // Utility Methods
    showAlert(message, type) {
        const alertContainer = document.getElementById('alertContainer');
        const alertId = 'alert-' + Date.now();
        
        const alert = document.createElement('div');
        alert.id = alertId;
        alert.className = `alert alert-${type} alert-dismissible fade show`;
        alert.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        alertContainer.appendChild(alert);
        
        setTimeout(() => {
            const alertElement = document.getElementById(alertId);
            if (alertElement) {
                alertElement.remove();
            }
        }, 5000);
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString();
    }

    getNextId(array) {
        return array.length > 0 ? Math.max(...array.map(item => item.id)) + 1 : 1;
    }
}

// Initialize the application
const taskManager = new TaskManager();

// Global functions for onclick handlers
window.taskManager = taskManager;