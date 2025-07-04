// Enhanced Civil Engineering Task Management Dashboard with Chat System and Improved Cross-Browser Support
class TaskManager {
    constructor() {
        this.currentUser = null;
        this.users = [];
        this.tasks = [];
        this.completedTasks = [];
        this.editRequests = [];
        this.chatMessages = [];
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

        // Start chat updates (updates every 5 seconds)
        this.chatInterval = setInterval(() => {
            this.refreshChatMessages();
        }, 5000);

        // Initial updates
        this.updateLiveClock();
        this.updateDeadlineCalculations();
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

    // Enhanced password hashing with better cross-browser support
    hashPassword(password) {
        if (this.bcryptReady && typeof bcrypt !== 'undefined') {
            return bcrypt.hashSync(password, 10);
        }
        // Fallback with more robust encoding
        return this.simpleHash(password);
    }

    comparePassword(password, hash) {
        if (this.bcryptReady && typeof bcrypt !== 'undefined') {
            try {
                return bcrypt.compareSync(password, hash);
            } catch (e) {
                // If bcrypt fails, try simple hash comparison
                return this.simpleHash(password) === hash;
            }
        }
        return this.simpleHash(password) === hash;
    }

    simpleHash(password) {
        // More robust simple hashing for cross-browser compatibility
        let hash = 0;
        for (let i = 0; i < password.length; i++) {
            const char = password.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return 'simple_' + Math.abs(hash).toString(36) + '_' + btoa(password).slice(0, 10);
    }

    // Enhanced localStorage with better cross-browser support
    setStorageItem(key, value) {
        try {
            const serializedValue = JSON.stringify({
                data: value,
                timestamp: Date.now(),
                version: '3.0'
            });
            localStorage.setItem(key, serializedValue);
            
            // Also try sessionStorage as backup
            try {
                sessionStorage.setItem(key + '_backup', serializedValue);
            } catch (e) {
                console.warn('SessionStorage not available');
            }
        } catch (e) {
            console.error('Failed to save to localStorage:', e);
            this.showAlert('Warning: Data may not persist between sessions', 'warning');
        }
    }

    getStorageItem(key) {
        try {
            const item = localStorage.getItem(key);
            if (item) {
                const parsed = JSON.parse(item);
                // Check if it's the new format
                if (parsed.data && parsed.version) {
                    return parsed.data;
                }
                // Legacy format
                return parsed;
            }
            
            // Try backup from sessionStorage
            const backup = sessionStorage.getItem(key + '_backup');
            if (backup) {
                const parsed = JSON.parse(backup);
                if (parsed.data && parsed.version) {
                    // Restore to localStorage
                    this.setStorageItem(key, parsed.data);
                    return parsed.data;
                }
            }
        } catch (e) {
            console.error('Failed to read from localStorage:', e);
        }
        return null;
    }

    // Load configuration
    loadAppConfig() {
        const savedConfig = this.getStorageItem('ce_app_config');
        if (savedConfig) {
            this.appConfig = savedConfig;
        } else {
            this.appConfig = {
                app_name: "Civil Engineering Task Manager",
                menu_items: {
                    overview: "Overview",
                    my_tasks: "My Tasks",
                    schedule: "Schedule",
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
                    team_chat: true
                },
                timing: {
                    timezone: "IST",
                    update_intervals: {
                        clock: 1000,
                        deadlines: 60000,
                        stats: 30000,
                        chat: 5000
                    }
                }
            };
            this.saveAppConfig();
        }
        this.applyConfiguration();
    }

    saveAppConfig() {
        this.setStorageItem('ce_app_config', this.appConfig);
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

    // Load sample data with enhanced deadline examples and timestamps
    loadSampleData() {
        const existingUsers = this.getStorageItem('ce_users');
        const existingTasks = this.getStorageItem('ce_tasks');
        const existingCompletedTasks = this.getStorageItem('ce_completed_tasks');
        const existingEditRequests = this.getStorageItem('ce_edit_requests');
        const existingChatMessages = this.getStorageItem('ce_chat_messages');

        if (!existingUsers) {
            const sampleUsers = [
                {
                    id: 1,
                    username: 'admin',
                    password_hash: this.hashPassword('admin123'),
                    email: 'admin@civilengineering.com',
                    role: 'admin',
                    created_date: '2025-01-01',
                    last_login: '2025-07-03'
                },
                {
                    id: 2,
                    username: 'john_engineer',
                    password_hash: this.hashPassword('password123'),
                    email: 'john@civilengineering.com',
                    role: 'user',
                    created_date: '2025-01-15',
                    last_login: '2025-07-02'
                },
                {
                    id: 3,
                    username: 'sarah_supervisor',
                    password_hash: this.hashPassword('securepass'),
                    email: 'sarah@civilengineering.com',
                    role: 'user',
                    created_date: '2025-02-01',
                    last_login: '2025-07-01'
                }
            ];
            this.setStorageItem('ce_users', sampleUsers);
        }

        if (!existingTasks) {
            const today = new Date();
            const formatDate = (days) => {
                const date = new Date(today);
                date.setDate(date.getDate() + days);
                return date.toISOString().split('T')[0];
            };
            
            const formatDateTime = (days, hours = 9) => {
                const date = new Date(today);
                date.setDate(date.getDate() + days);
                date.setHours(hours, 0, 0, 0);
                return date.toISOString();
            };

            const sampleTasks = [
                {
                    id: 1,
                    user_id: 1,
                    assigned_to: 2,
                    title: 'Foundation Excavation - Phase 1',
                    description: 'Complete excavation for Building A foundation with proper soil analysis and safety measures',
                    start_date: formatDate(-5),
                    end_date: formatDate(-1), // Overdue
                    priority: 'High',
                    status: 'In Progress',
                    locked_for_editing: false,
                    assignee_comments: 'Excavation 80% complete, facing some rocky soil conditions',
                    progress_notes: ['Site preparation completed', 'Excavation equipment deployed', 'Soil samples taken'],
                    created_date: formatDate(-5),
                    updated_date: formatDate(-1),
                    assigned_timestamp: formatDateTime(-5, 9),
                    completion_timestamp: null,
                    remarks: ''
                },
                {
                    id: 2,
                    user_id: 1,
                    assigned_to: 3,
                    title: 'Concrete Pouring Schedule',
                    description: 'Plan and execute concrete pouring for foundation with quality control measures',
                    start_date: formatDate(0),
                    end_date: formatDate(0), // Due today
                    priority: 'High',
                    status: 'Not Started',
                    locked_for_editing: false,
                    assignee_comments: '',
                    progress_notes: [],
                    created_date: formatDate(-3),
                    updated_date: formatDate(-3),
                    assigned_timestamp: formatDateTime(-3, 10),
                    completion_timestamp: null,
                    remarks: ''
                },
                {
                    id: 3,
                    user_id: 2,
                    assigned_to: 1,
                    title: 'Steel Reinforcement Installation',
                    description: 'Install steel rebar according to structural drawings and specifications',
                    start_date: formatDate(-2),
                    end_date: formatDate(2), // Due in 2 days
                    priority: 'Medium',
                    status: 'In Progress',
                    locked_for_editing: false,
                    assignee_comments: 'Rebar placement in progress, 60% complete',
                    progress_notes: ['Material delivery completed', 'Rebar cutting started'],
                    created_date: formatDate(-2),
                    updated_date: formatDate(0),
                    assigned_timestamp: formatDateTime(-2, 14),
                    completion_timestamp: null,
                    remarks: ''
                },
                {
                    id: 5,
                    user_id: 3,
                    assigned_to: 1,
                    title: 'Structural Design Review',
                    description: 'Review and approve structural calculations and design drawings',
                    start_date: formatDate(1),
                    end_date: formatDate(10), // Due in 10 days
                    priority: 'Low',
                    status: 'Not Started',
                    locked_for_editing: false,
                    assignee_comments: '',
                    progress_notes: [],
                    created_date: formatDate(0),
                    updated_date: formatDate(0),
                    assigned_timestamp: formatDateTime(0, 11),
                    completion_timestamp: null,
                    remarks: ''
                }
            ];
            this.setStorageItem('ce_tasks', sampleTasks);
        }

        if (!existingCompletedTasks) {
            const today = new Date();
            const formatDate = (days) => {
                const date = new Date(today);
                date.setDate(date.getDate() + days);
                return date.toISOString().split('T')[0];
            };
            
            const formatDateTime = (days, hours = 9) => {
                const date = new Date(today);
                date.setDate(date.getDate() + days);
                date.setHours(hours, 0, 0, 0);
                return date.toISOString();
            };

            const sampleCompletedTasks = [
                {
                    id: 4,
                    user_id: 1,
                    assigned_to: 2,
                    title: 'Site Safety Inspection',
                    description: 'Comprehensive safety audit of construction site including equipment and procedures',
                    start_date: formatDate(-7),
                    end_date: formatDate(-3), // Completed (was due 3 days ago)
                    priority: 'High',
                    status: 'Completed',
                    locked_for_editing: true,
                    assignee_comments: 'Safety inspection completed successfully, all protocols followed',
                    progress_notes: ['Safety checklist prepared', 'Equipment inspection done', 'Report submitted'],
                    created_date: formatDate(-7),
                    updated_date: formatDate(-3),
                    assigned_timestamp: formatDateTime(-7, 8),
                    completion_timestamp: formatDateTime(-3, 16),
                    remarks: 'All safety protocols reviewed and documented. Minor recommendations provided for PPE storage improvements. Site meets all safety standards for current phase of construction.'
                }
            ];
            this.setStorageItem('ce_completed_tasks', sampleCompletedTasks);
        }

        if (!existingEditRequests) {
            const sampleEditRequests = [
                {
                    id: 1,
                    task_id: 4,
                    requested_by: 2,
                    assigned_by: 1,
                    reason: 'Need to update safety inspection report with additional equipment checks discovered after completion',
                    status: 'pending',
                    request_date: '2025-07-03',
                    response_date: null,
                    admin_notes: ''
                }
            ];
            this.setStorageItem('ce_edit_requests', sampleEditRequests);
        }

        if (!existingChatMessages) {
            const sampleChatMessages = [
                {
                    id: 1,
                    user_id: 1,
                    username: 'admin',
                    message: 'Welcome to the team chat! Please use this space for project coordination and updates.',
                    timestamp: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
                    type: 'group'
                },
                {
                    id: 2,
                    user_id: 2,
                    username: 'john_engineer',
                    message: 'Good morning team! Foundation excavation is progressing well despite the rocky conditions.',
                    timestamp: new Date(Date.now() - 1800000).toISOString(), // 30 minutes ago
                    type: 'group'
                }
            ];
            this.setStorageItem('ce_chat_messages', sampleChatMessages);
        }

        this.loadData();
    }

    loadData() {
        this.users = this.getStorageItem('ce_users') || [];
        this.tasks = this.getStorageItem('ce_tasks') || [];
        this.completedTasks = this.getStorageItem('ce_completed_tasks') || [];
        this.editRequests = this.getStorageItem('ce_edit_requests') || [];
        this.chatMessages = this.getStorageItem('ce_chat_messages') || [];
        
        // Update deadline info for all tasks
        this.tasks.forEach(task => {
            task.deadlineInfo = this.calculateDeadlineInfo(task.end_date, task.status);
        });
        
        this.completedTasks.forEach(task => {
            task.deadlineInfo = this.calculateDeadlineInfo(task.end_date, task.status);
        });
    }

    saveData() {
        this.setStorageItem('ce_users', this.users);
        this.setStorageItem('ce_tasks', this.tasks);
        this.setStorageItem('ce_completed_tasks', this.completedTasks);
        this.setStorageItem('ce_edit_requests', this.editRequests);
        this.setStorageItem('ce_chat_messages', this.chatMessages);
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

        // Task status change listener for remarks
        document.getElementById('taskStatus').addEventListener('change', (e) => {
            const remarksSection = document.getElementById('remarksSection');
            if (e.target.value === 'Completed') {
                remarksSection.style.display = 'block';
                document.getElementById('taskRemarks').required = true;
            } else {
                remarksSection.style.display = 'none';
                document.getElementById('taskRemarks').required = false;
            }
        });

        // Chat System
        document.getElementById('sendMessageBtn').addEventListener('click', () => this.sendChatMessage());
        document.getElementById('messageInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendChatMessage();
            }
        });

        // Task History Filters
        document.getElementById('historyPriorityFilter').addEventListener('change', () => this.filterTaskHistory());
        document.getElementById('historyDateFilter').addEventListener('change', () => this.filterTaskHistory());

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

    // Authentication Methods with Enhanced Cross-Browser Support
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
            user.last_login = new Date().toISOString().split('T')[0];
            this.currentUser = user;
            
            // Enhanced cross-browser user session storage
            this.setStorageItem('ce_current_user', user);
            
            this.saveData();
            this.showDashboard();
            this.showAlert('Login successful!', 'success');
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
            created_date: new Date().toISOString().split('T')[0],
            last_login: new Date().toISOString().split('T')[0]
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
        
        this.currentUser = null;
        try {
            localStorage.removeItem('ce_current_user');
            sessionStorage.removeItem('ce_current_user_backup');
        } catch (e) {
            console.warn('Error clearing user session');
        }
        this.showLoginPage();
        this.showAlert('Logged out successfully', 'info');
    }

    checkAuthStatus() {
        const savedUser = this.getStorageItem('ce_current_user');
        if (savedUser) {
            try {
                // Verify user still exists in users array
                const existingUser = this.users.find(u => u.id === savedUser.id && u.username === savedUser.username);
                if (existingUser) {
                    this.currentUser = existingUser;
                    this.showDashboard();
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

    // Team Chat System
    sendChatMessage() {
        const messageInput = document.getElementById('messageInput');
        const message = messageInput.value.trim();
        
        if (!message) return;
        
        const newMessage = {
            id: this.getNextId(this.chatMessages),
            user_id: this.currentUser.id,
            username: this.currentUser.username,
            message: message,
            timestamp: new Date().toISOString(),
            type: 'group'
        };
        
        this.chatMessages.push(newMessage);
        this.saveData();
        messageInput.value = '';
        this.renderChatMessages();
        
        // Scroll to bottom
        const chatContainer = document.getElementById('chatMessages');
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    refreshChatMessages() {
        if (document.getElementById('teamChatSection').style.display !== 'none') {
            const currentMessages = this.getStorageItem('ce_chat_messages') || [];
            if (currentMessages.length !== this.chatMessages.length) {
                this.chatMessages = currentMessages;
                this.renderChatMessages();
            }
        }
    }

    renderChatMessages() {
        const container = document.getElementById('chatMessages');
        if (!container) return;
        
        if (this.chatMessages.length === 0) {
            container.innerHTML = '<div class="text-center text-muted p-4">No messages yet. Start the conversation!</div>';
            return;
        }
        
        container.innerHTML = this.chatMessages.map(msg => {
            const isOwnMessage = msg.user_id === this.currentUser.id;
            const messageTime = new Date(msg.timestamp).toLocaleString();
            
            return `
                <div class="chat-message ${isOwnMessage ? 'own-message' : 'other-message'}">
                    <div class="chat-message-header">
                        <span class="chat-username">${msg.username}</span>
                        <span class="chat-timestamp">${messageTime}</span>
                    </div>
                    <div class="chat-text">${this.escapeHtml(msg.message)}</div>
                </div>
            `;
        }).join('');
        
        // Auto-scroll to bottom for new messages
        container.scrollTop = container.scrollHeight;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Task History System
    showTaskHistory() {
        this.renderTaskHistory();
    }

    renderTaskHistory() {
        const container = document.getElementById('taskHistoryList');
        if (!container) return;
        
        let tasksToShow = this.completedTasks;
        
        // Apply filters
        const priorityFilter = document.getElementById('historyPriorityFilter').value;
        const dateFilter = document.getElementById('historyDateFilter').value;
        
        if (priorityFilter) {
            tasksToShow = tasksToShow.filter(task => task.priority === priorityFilter);
        }
        
        if (dateFilter) {
            tasksToShow = tasksToShow.filter(task => {
                const completionDate = task.completion_timestamp ? 
                    new Date(task.completion_timestamp).toISOString().split('T')[0] : 
                    task.updated_date;
                return completionDate === dateFilter;
            });
        }
        
        // Filter by user access
        if (this.currentUser.role !== 'admin') {
            tasksToShow = tasksToShow.filter(task => 
                task.user_id === this.currentUser.id || task.assigned_to === this.currentUser.id
            );
        }
        
        if (tasksToShow.length === 0) {
            container.innerHTML = `
                <div class="text-center py-5">
                    <i class="fas fa-history fa-3x text-muted mb-3"></i>
                    <h4 class="text-muted">No completed tasks</h4>
                    <p class="text-muted">Completed tasks will appear here with full audit trail</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = tasksToShow.map(task => this.createHistoryCard(task)).join('');
    }

    createHistoryCard(task) {
        const user = this.users.find(u => u.id === task.user_id);
        const assignee = this.users.find(u => u.id === task.assigned_to);
        const assignedTime = task.assigned_timestamp ? new Date(task.assigned_timestamp).toLocaleString() : 'N/A';
        const completedTime = task.completion_timestamp ? new Date(task.completion_timestamp).toLocaleString() : 'N/A';
        
        return `
            <div class="history-card">
                <div class="history-header">
                    <h6 class="history-title">${task.title}</h6>
                    <div class="d-flex gap-2">
                        <span class="priority-badge priority-${task.priority.toLowerCase()}">${task.priority}</span>
                        <span class="status-badge status-completed">Completed</span>
                    </div>
                </div>
                <p class="text-muted mb-3">${task.description}</p>
                <div class="history-meta">
                    <div class="history-meta-item">
                        <span class="history-meta-label">Created by:</span>
                        ${user ? user.username : 'Unknown'}
                    </div>
                    <div class="history-meta-item">
                        <span class="history-meta-label">Assigned to:</span>
                        ${assignee ? assignee.username : 'Unassigned'}
                    </div>
                    <div class="history-meta-item">
                        <span class="history-meta-label">Assigned on:</span>
                        ${assignedTime}
                    </div>
                    <div class="history-meta-item">
                        <span class="history-meta-label">Completed on:</span>
                        ${completedTime}
                    </div>
                    <div class="history-meta-item">
                        <span class="history-meta-label">Deadline:</span>
                        ${task.end_date}
                    </div>
                </div>
                ${task.remarks ? `
                    <div class="task-remarks mt-3">
                        <strong>Completion Remarks:</strong>
                        <p class="mb-0 mt-1">${task.remarks}</p>
                    </div>
                ` : ''}
            </div>
        `;
    }

    filterTaskHistory() {
        this.renderTaskHistory();
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
        const selects = ['taskAssignedTo', 'assigneeFilter'];
        selects.forEach(selectId => {
            const select = document.getElementById(selectId);
            if (select) {
                const currentValue = select.value;
                select.innerHTML = '<option value="">Select User</option>';
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
            'team-chat': 'Team Chat',
            'task-history': 'Task History',
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
            'team-chat': 'teamChatSection',
            'task-history': 'taskHistorySection',
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
            case 'team-chat':
                this.showTeamChat();
                break;
            case 'task-history':
                this.showTaskHistory();
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

    // Team Chat Section
    showTeamChat() {
        this.renderChatMessages();
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
            completed: this.completedTasks.filter(t => 
                this.currentUser.role === 'admin' || 
                t.user_id === this.currentUser.id || 
                t.assigned_to === this.currentUser.id
            ).length,
            overdue: tasks.filter(t => t.deadlineInfo && t.deadlineInfo.isOverdue).length
        };
    }

    updateStatCards(stats) {
        document.getElementById('totalTasks').textContent = stats.total;
        document.getElementById('pendingTasks').textContent = stats.pending;
        document.getElementById('inProgressTasks').textContent = stats.inProgress;
        document.getElementById('overdueTasks').textContent = stats.overdue;
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
            'Pending Response': tasks.filter(t => t.status === 'Pending Response').length
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
        const allTasks = [...this.tasks, ...this.completedTasks];
        const recentTasks = allTasks
            .filter(task => task.user_id === this.currentUser.id || task.assigned_to === this.currentUser.id || this.currentUser.role === 'admin')
            .sort((a, b) => new Date(b.updated_date) - new Date(a.updated_date))
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

    // Enhanced Tasks Section with Priority Ordering and Timestamps
    showTasks() {
        this.renderTasks();
        this.populateUserSelects();
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

        const tasksList = document.getElementById('tasksList');
        
        if (tasksToShow.length === 0) {
            tasksList.innerHTML = `
                <div class="text-center py-5">
                    <i class="fas fa-tasks fa-3x text-muted mb-3"></i>
                    <h4 class="text-muted">No ongoing tasks</h4>
                    <p class="text-muted">Create your first task to get started!</p>
                </div>
            `;
            return;
        }

        // Sort by priority: High > Medium > Low
        const priorityOrder = { 'High': 1, 'Medium': 2, 'Low': 3 };
        tasksToShow.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

        tasksList.innerHTML = tasksToShow.map(task => this.createTaskCard(task)).join('');
    }

    createTaskCard(task) {
        const user = this.users.find(u => u.id === task.user_id);
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
        
        let cardClass = `task-card priority-${task.priority.toLowerCase()}`;
        if (task.locked_for_editing) {
            cardClass += ' locked-task';
        } else if (task.deadlineInfo.isOverdue) {
            cardClass += ' overdue-task';
        } else if (task.deadlineInfo.urgencyLevel === 'today' || task.deadlineInfo.urgencyLevel === 'urgent') {
            cardClass += ' deadline-urgent-task';
        } else if (task.deadlineInfo.urgencyLevel === 'warning') {
            cardClass += ' deadline-warning-task';
        }
        
        const assignedTime = task.assigned_timestamp ? new Date(task.assigned_timestamp).toLocaleString() : 'N/A';
        const completionTime = task.completion_timestamp ? new Date(task.completion_timestamp).toLocaleString() : null;
        
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
                    
                    <!-- Task Timestamps -->
                    <div class="task-timestamps">
                        <div class="timestamp-item">
                            <span class="timestamp-label">Assigned:</span>
                            <span class="timestamp-value">${assignedTime}</span>
                        </div>
                        ${completionTime ? `
                            <div class="timestamp-item">
                                <span class="timestamp-label">Completed:</span>
                                <span class="timestamp-value">${completionTime}</span>
                            </div>
                        ` : ''}
                        <div class="timestamp-item">
                            <span class="timestamp-label">Deadline:</span>
                            <span class="timestamp-value deadline-countdown ${task.deadlineInfo.colorClass}">
                                ${task.end_date} (${task.deadlineInfo.displayText})
                            </span>
                        </div>
                    </div>
                    
                    <div class="task-meta">
                        <div class="task-meta-item">
                            <i class="fas fa-calendar-alt"></i>
                            <span>${task.start_date} - ${task.end_date}</span>
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
                        <div class="task-meta-item">
                            <i class="fas fa-clock"></i>
                            <span>Updated: ${task.updated_date}</span>
                        </div>
                    </div>
                    ${task.assignee_comments ? `
                        <div class="task-comments mt-2">
                            <strong>Comments:</strong> ${task.assignee_comments}
                        </div>
                    ` : ''}
                    ${task.remarks ? `
                        <div class="task-remarks">
                            <strong>Completion Remarks:</strong>
                            <p class="mb-0 mt-1">${task.remarks}</p>
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

        // Sort by priority: High > Medium > Low
        const priorityOrder = { 'High': 1, 'Medium': 2, 'Low': 3 };
        filteredTasks.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

        const tasksList = document.getElementById('tasksList');
        tasksList.innerHTML = filteredTasks.map(task => this.createTaskCard(task)).join('');
    }

    showTaskModal(task = null) {
        const modal = document.getElementById('taskModal');
        const title = document.getElementById('taskModalTitle');
        const form = document.getElementById('taskForm');
        const remarksSection = document.getElementById('remarksSection');
        
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
            
            // Show remarks section if status is Completed
            if (task.status === 'Completed') {
                remarksSection.style.display = 'block';
                document.getElementById('taskRemarks').required = true;
            } else {
                remarksSection.style.display = 'none';
                document.getElementById('taskRemarks').required = false;
            }
        } else {
            title.textContent = 'Add Task';
            form.reset();
            document.getElementById('taskId').value = '';
            remarksSection.style.display = 'none';
            document.getElementById('taskRemarks').required = false;
            // Set default start date to today
            const today = new Date().toISOString().split('T')[0];
            document.getElementById('taskStartDate').value = today;
        }
        
        this.taskModal.show();
    }

    saveTask() {
        const taskId = document.getElementById('taskId').value;
        const oldTask = taskId ? this.tasks.find(t => t.id === parseInt(taskId)) : null;
        const taskData = {
            title: document.getElementById('taskTitle').value,
            description: document.getElementById('taskDescription').value,
            start_date: document.getElementById('taskStartDate').value,
            end_date: document.getElementById('taskEndDate').value,
            priority: document.getElementById('taskPriority').value,
            status: document.getElementById('taskStatus').value,
            assigned_to: parseInt(document.getElementById('taskAssignedTo').value) || null,
            updated_date: new Date().toISOString().split('T')[0],
            remarks: document.getElementById('taskRemarks').value || ''
        };

        // Validate remarks for completed tasks
        if (taskData.status === 'Completed' && !taskData.remarks.trim()) {
            this.showAlert('Please provide completion remarks for completed tasks', 'danger');
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
                    taskData.completion_timestamp = new Date().toISOString();
                    
                    // Move to completed tasks
                    const completedTask = { ...this.tasks[taskIndex], ...taskData };
                    this.completedTasks.push(completedTask);
                    this.tasks.splice(taskIndex, 1);
                } else {
                    this.tasks[taskIndex] = { ...this.tasks[taskIndex], ...taskData };
                    // Update deadline info
                    this.tasks[taskIndex].deadlineInfo = this.calculateDeadlineInfo(taskData.end_date, taskData.status);
                }
                this.showAlert('Task updated successfully!', 'success');
            }
        } else {
            const newTask = {
                id: this.getNextId([...this.tasks, ...this.completedTasks]),
                user_id: this.currentUser.id,
                created_date: new Date().toISOString().split('T')[0],
                assignee_comments: '',
                progress_notes: [],
                locked_for_editing: taskData.status === 'Completed',
                assigned_timestamp: new Date().toISOString(),
                completion_timestamp: taskData.status === 'Completed' ? new Date().toISOString() : null,
                ...taskData
            };
            
            if (taskData.status === 'Completed') {
                // Calculate deadline info for completed task
                newTask.deadlineInfo = this.calculateDeadlineInfo(newTask.end_date, newTask.status);
                this.completedTasks.push(newTask);
            } else {
                // Calculate deadline info for new task
                newTask.deadlineInfo = this.calculateDeadlineInfo(newTask.end_date, newTask.status);
                this.tasks.push(newTask);
            }
            this.showAlert('Task created successfully!', 'success');
        }

        this.saveData();
        this.taskModal.hide();
        this.renderTasks();
        this.updateDeadlineCalculations(); // Update real-time calculations
        
        if (this.calendar) {
            this.updateCalendarEvents();
        }
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
            this.tasks = this.tasks.filter(t => t.id !== taskId);
            this.saveData();
            this.renderTasks();
            this.updateDeadlineCalculations(); // Update real-time calculations
            this.showAlert('Task deleted successfully!', 'success');
            
            if (this.calendar) {
                this.updateCalendarEvents();
            }
        }
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

        const task = [...this.tasks, ...this.completedTasks].find(t => t.id === taskId);
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
            request_date: new Date().toISOString().split('T')[0],
            response_date: null,
            admin_notes: ''
        };

        this.editRequests.push(newRequest);
        this.saveData();
        this.editRequestModal.hide();
        this.showAlert('Edit request submitted successfully!', 'success');
    }

    approveEditRequest(requestId) {
        const request = this.editRequests.find(r => r.id === requestId);
        if (!request) return;

        const taskInCompleted = this.completedTasks.find(t => t.id === request.task_id);
        const taskInTasks = this.tasks.find(t => t.id === request.task_id);
        const task = taskInCompleted || taskInTasks;
        
        if (task) {
            task.locked_for_editing = false;
            request.status = 'approved';
            request.response_date = new Date().toISOString().split('T')[0];
            
            this.saveData();
            this.showAlert('Edit request approved! Task is now unlocked for editing.', 'success');
            this.showEditRequests();
            this.renderTasks();
        }
    }

    rejectEditRequest(requestId, reason = '') {
        const request = this.editRequests.find(r => r.id === requestId);
        if (!request) return;

        request.status = 'rejected';
        request.response_date = new Date().toISOString().split('T')[0];
        request.admin_notes = reason;
        
        this.saveData();
        this.showAlert('Edit request rejected.', 'info');
        this.showEditRequests();
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
            const task = [...this.tasks, ...this.completedTasks].find(t => t.id === request.task_id);
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
                        <small>Date: ${request.request_date}</small>
                        ${request.response_date ? `<br><small>Responded: ${request.response_date}</small>` : ''}
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
            const task = [...this.tasks, ...this.completedTasks].find(t => t.id === request.task_id);
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
                        <small>Date: ${request.request_date}</small>
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

    // Continue with remaining methods...
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
            created_date: new Date().toISOString().split('T')[0],
            last_login: 'Never'
        };

        this.users.push(newUser);
        this.saveData();
        this.createUserModal.hide();
        this.renderUsersTable();
        this.populateUserSelects();
        this.showAlert('User created successfully! User can now login from any browser or device.', 'success');
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
        const userIndex = this.users.findIndex(u => u.id === this.currentUser.id);
        if (userIndex !== -1) {
            this.users[userIndex] = this.currentUser;
        }
        
        this.saveData();
        this.setStorageItem('ce_current_user', this.currentUser);
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
        const userIndex = this.users.findIndex(u => u.id === this.currentUser.id);
        if (userIndex !== -1) {
            this.users[userIndex] = this.currentUser;
        }
        
        this.saveData();
        this.setStorageItem('ce_current_user', this.currentUser);
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
            const userTasks = [...this.tasks, ...this.completedTasks].filter(t => t.user_id === user.id || t.assigned_to === user.id);
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
                    <td>${user.last_login}</td>
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
            const task = [...this.tasks, ...this.completedTasks].find(t => t.id === request.task_id);
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
                        <small>Date: ${request.request_date}</small>
                        ${request.response_date ? `<br><small>Responded: ${request.response_date}</small>` : ''}
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
            this.completedTasks = this.completedTasks.filter(t => t.user_id !== userId && t.assigned_to !== userId);
            this.editRequests = this.editRequests.filter(r => r.requested_by !== userId && r.assigned_by !== userId);
            this.saveData();
            this.renderUsersTable();
            this.populateUserSelects();
            this.showAlert('User deleted successfully!', 'success');
        }
    }

    // Team Progress Section
    showTeamProgress() {
        if (this.currentUser.role !== 'admin') {
            this.showAlert('Access denied. Admin privileges required.', 'danger');
            return;
        }

        this.renderTeamStats();
        setTimeout(() => {
            this.renderTeamCharts();
        }, 300);
        this.renderUserStatsTable();
    }

    renderTeamStats() {
        const container = document.getElementById('teamStatsCards');
        if (!container) return;
        
        const totalUsers = this.users.length;
        const totalTasks = this.tasks.length + this.completedTasks.length;
        const completedTasks = this.completedTasks.length;
        const overdueTasks = this.tasks.filter(t => {
            if (!t.deadlineInfo) {
                t.deadlineInfo = this.calculateDeadlineInfo(t.end_date, t.status);
            }
            return t.deadlineInfo.isOverdue;
        }).length;

        container.innerHTML = `
            <div class="col-md-3">
                <div class="card stat-card">
                    <div class="card-body text-center">
                        <h3>${totalUsers}</h3>
                        <p>Total Users</p>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card stat-card">
                    <div class="card-body text-center">
                        <h3>${totalTasks}</h3>
                        <p>Total Tasks</p>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card stat-card">
                    <div class="card-body text-center">
                        <h3>${Math.round((completedTasks / totalTasks) * 100) || 0}%</h3>
                        <p>Completion Rate</p>
                    </div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="card stat-card">
                    <div class="card-body text-center">
                        <h3>${overdueTasks}</h3>
                        <p>Overdue Tasks</p>
                    </div>
                </div>
            </div>
        `;
    }

    renderTeamCharts() {
        if (typeof Chart === 'undefined') {
            console.warn('Chart.js not loaded, skipping team chart rendering');
            return;
        }
        
        this.renderUserProgressChart();
        this.renderTeamProductivityChart();
    }

    renderUserProgressChart() {
        const canvas = document.getElementById('userProgressChart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        
        if (this.charts.userProgress) {
            this.charts.userProgress.destroy();
        }

        const userData = this.users.map(user => {
            const userTasks = [...this.tasks, ...this.completedTasks].filter(t => t.user_id === user.id || t.assigned_to === user.id);
            const completedTasks = this.completedTasks.filter(t => t.user_id === user.id || t.assigned_to === user.id);
            return {
                username: user.username,
                total: userTasks.length,
                completed: completedTasks.length
            };
        });

        this.charts.userProgress = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: userData.map(u => u.username),
                datasets: [
                    {
                        label: 'Total Tasks',
                        data: userData.map(u => u.total),
                        backgroundColor: '#1FB8CD'
                    },
                    {
                        label: 'Completed Tasks',
                        data: userData.map(u => u.completed),
                        backgroundColor: '#B4413C'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
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

    renderTeamProductivityChart() {
        const canvas = document.getElementById('teamProductivityChart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        
        if (this.charts.teamProductivity) {
            this.charts.teamProductivity.destroy();
        }

        const statusData = {
            'Not Started': this.tasks.filter(t => t.status === 'Not Started').length,
            'In Progress': this.tasks.filter(t => t.status === 'In Progress').length,
            'Pending Response': this.tasks.filter(t => t.status === 'Pending Response').length,
            'Completed': this.completedTasks.length
        };

        this.charts.teamProductivity = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: Object.keys(statusData),
                datasets: [{
                    data: Object.values(statusData),
                    backgroundColor: ['#FFC185', '#1FB8CD', '#B4413C', '#5D878F']
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

    renderUserStatsTable() {
        const tbody = document.getElementById('userStatsTable');
        if (!tbody) return;
        
        const userStats = this.users.map(user => {
            const allUserTasks = [...this.tasks, ...this.completedTasks].filter(t => t.user_id === user.id || t.assigned_to === user.id);
            const completedTasks = this.completedTasks.filter(t => t.user_id === user.id || t.assigned_to === user.id);
            const inProgressTasks = this.tasks.filter(t => (t.user_id === user.id || t.assigned_to === user.id) && t.status === 'In Progress');
            const overdueTasks = this.tasks.filter(t => {
                if (t.user_id !== user.id && t.assigned_to !== user.id) return false;
                if (!t.deadlineInfo) {
                    t.deadlineInfo = this.calculateDeadlineInfo(t.end_date, t.status);
                }
                return t.deadlineInfo.isOverdue;
            });
            const completionRate = allUserTasks.length > 0 ? 
                Math.round((completedTasks.length / allUserTasks.length) * 100) : 0;

            return {
                user,
                total: allUserTasks.length,
                completed: completedTasks.length,
                inProgress: inProgressTasks.length,
                overdue: overdueTasks.length,
                completionRate
            };
        });

        tbody.innerHTML = userStats.map(stat => `
            <tr>
                <td>${stat.user.username}</td>
                <td>${stat.total}</td>
                <td><span class="badge bg-success">${stat.completed}</span></td>
                <td><span class="badge bg-warning">${stat.inProgress}</span></td>
                <td><span class="badge bg-danger">${stat.overdue}</span></td>
                <td>${stat.completionRate}%</td>
                <td>
                    <div class="progress" style="height: 20px;">
                        <div class="progress-bar bg-success" role="progressbar" 
                             style="width: ${stat.completionRate}%" 
                             aria-valuenow="${stat.completionRate}" 
                             aria-valuemin="0" aria-valuemax="100">
                            ${stat.completionRate}%
                        </div>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    // Reports Section
    showReports() {
        if (this.currentUser.role !== 'admin') {
            this.showAlert('Access denied. Admin privileges required.', 'danger');
            return;
        }
    }

    generatePDFReport() {
        if (typeof window.jsPDF === 'undefined') {
            this.showAlert('PDF library not loaded. Please refresh the page.', 'danger');
            return;
        }

        const reportType = document.getElementById('reportType').value;
        const dateRange = document.getElementById('reportDateRange').value;
        
        const { jsPDF } = window.jsPDF;
        const doc = new jsPDF();
        
        doc.setFontSize(18);
        doc.text(this.appConfig.company_info.name, 20, 20);
        doc.setFontSize(14);
        doc.text(`${this.getReportTitle(reportType)} - ${this.formatDateRange(dateRange)}`, 20, 30);
        doc.setFontSize(10);
        doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 40);
        doc.text(`Generated by: ${this.currentUser.username}`, 20, 45);
        
        let yPosition = 60;
        
        switch (reportType) {
            case 'team-summary':
                yPosition = this.generateTeamSummaryReport(doc, yPosition, dateRange);
                break;
            case 'task-completion':
                yPosition = this.generateTaskCompletionReport(doc, yPosition, dateRange);
                break;
            case 'user-productivity':
                yPosition = this.generateUserProductivityReport(doc, yPosition, dateRange);
                break;
            case 'project-timeline':
                yPosition = this.generateProjectTimelineReport(doc, yPosition, dateRange);
                break;
            case 'admin-overview':
                yPosition = this.generateAdminOverviewReport(doc, yPosition, dateRange);
                break;
        }
        
        doc.save(`${reportType}-${dateRange}-${new Date().toISOString().split('T')[0]}.pdf`);
        this.showAlert('PDF report generated successfully!', 'success');
    }

    getReportTitle(type) {
        const titles = {
            'team-summary': 'Team Summary Report',
            'task-completion': 'Task Completion Report',
            'user-productivity': 'User Productivity Report',
            'project-timeline': 'Project Timeline Report',
            'admin-overview': 'Administrative Overview Report'
        };
        return titles[type] || 'Report';
    }

    formatDateRange(range) {
        const ranges = {
            'all': 'All Time',
            'last-7-days': 'Last 7 Days',
            'last-30-days': 'Last 30 Days',
            'last-90-days': 'Last 90 Days',
            'current-year': 'Current Year'
        };
        return ranges[range] || 'All Time';
    }

    generateTeamSummaryReport(doc, yPosition, dateRange) {
        doc.setFontSize(12);
        doc.text('Team Summary', 20, yPosition);
        yPosition += 10;
        
        const overdueTasks = this.tasks.filter(t => {
            if (!t.deadlineInfo) {
                t.deadlineInfo = this.calculateDeadlineInfo(t.end_date, t.status);
            }
            return t.deadlineInfo.isOverdue;
        }).length;
        
        doc.setFontSize(10);
        doc.text(`Total Users: ${this.users.length}`, 20, yPosition);
        yPosition += 5;
        doc.text(`Total Tasks: ${this.tasks.length + this.completedTasks.length}`, 20, yPosition);
        yPosition += 5;
        doc.text(`Completed Tasks: ${this.completedTasks.length}`, 20, yPosition);
        yPosition += 5;
        doc.text(`Ongoing Tasks: ${this.tasks.length}`, 20, yPosition);
        yPosition += 5;
        doc.text(`Overdue Tasks: ${overdueTasks}`, 20, yPosition);
        yPosition += 5;
        doc.text(`Edit Requests: ${this.editRequests.length}`, 20, yPosition);
        yPosition += 5;
        doc.text(`Pending Edit Requests: ${this.editRequests.filter(r => r.status === 'pending').length}`, 20, yPosition);
        
        return yPosition + 15;
    }

    generateTaskCompletionReport(doc, yPosition, dateRange) {
        doc.setFontSize(12);
        doc.text('Task Completion Report', 20, yPosition);
        yPosition += 15;
        
        doc.setFontSize(10);
        this.completedTasks.forEach(task => {
            const user = this.users.find(u => u.id === task.user_id);
            const assignee = this.users.find(u => u.id === task.assigned_to);
            const completionTime = task.completion_timestamp ? new Date(task.completion_timestamp).toLocaleDateString() : 'N/A';
            doc.text(`${task.title} - Assigned to: ${assignee ? assignee.username : 'Unknown'} - Completed: ${completionTime}`, 20, yPosition);
            yPosition += 5;
            if (yPosition > 280) {
                doc.addPage();
                yPosition = 20;
            }
        });
        
        return yPosition + 10;
    }

    generateUserProductivityReport(doc, yPosition, dateRange) {
        doc.setFontSize(12);
        doc.text('User Productivity Report', 20, yPosition);
        yPosition += 15;
        
        doc.setFontSize(10);
        this.users.forEach(user => {
            const allUserTasks = [...this.tasks, ...this.completedTasks].filter(t => t.user_id === user.id || t.assigned_to === user.id);
            const completed = this.completedTasks.filter(t => t.user_id === user.id || t.assigned_to === user.id).length;
            const overdue = this.tasks.filter(t => {
                if (t.user_id !== user.id && t.assigned_to !== user.id) return false;
                if (!t.deadlineInfo) {
                    t.deadlineInfo = this.calculateDeadlineInfo(t.end_date, t.status);
                }
                return t.deadlineInfo.isOverdue;
            }).length;
            const completionRate = allUserTasks.length > 0 ? Math.round((completed / allUserTasks.length) * 100) : 0;
            
            doc.text(`${user.username}: ${completed}/${allUserTasks.length} tasks (${completionRate}%) - ${overdue} overdue`, 20, yPosition);
            yPosition += 5;
        });
        
        return yPosition + 10;
    }

    generateProjectTimelineReport(doc, yPosition, dateRange) {
        doc.setFontSize(12);
        doc.text('Project Timeline Report', 20, yPosition);
        yPosition += 15;
        
        const allTasks = [...this.tasks, ...this.completedTasks];
        const sortedTasks = allTasks.sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
        
        doc.setFontSize(10);
        sortedTasks.forEach(task => {
            if (!task.deadlineInfo) {
                task.deadlineInfo = this.calculateDeadlineInfo(task.end_date, task.status);
            }
            const statusText = task.status === 'Completed' ? 
                `Completed (${task.completion_timestamp ? new Date(task.completion_timestamp).toLocaleDateString() : 'N/A'})` : 
                task.status;
            doc.text(`${task.title}: ${task.start_date} to ${task.end_date} (${statusText}) - ${task.deadlineInfo.displayText}`, 20, yPosition);
            yPosition += 5;
            if (yPosition > 280) {
                doc.addPage();
                yPosition = 20;
            }
        });
        
        return yPosition + 10;
    }

    generateAdminOverviewReport(doc, yPosition, dateRange) {
        doc.setFontSize(12);
        doc.text('Administrative Overview', 20, yPosition);
        yPosition += 15;
        
        const overdueTasks = this.tasks.filter(t => {
            if (!t.deadlineInfo) {
                t.deadlineInfo = this.calculateDeadlineInfo(t.end_date, t.status);
            }
            return t.deadlineInfo.isOverdue;
        }).length;
        
        const totalTasks = this.tasks.length + this.completedTasks.length;
        
        doc.setFontSize(10);
        doc.text('System Statistics:', 20, yPosition);
        yPosition += 5;
        doc.text(`• Total registered users: ${this.users.length}`, 25, yPosition);
        yPosition += 5;
        doc.text(`• Active admin users: ${this.users.filter(u => u.role === 'admin').length}`, 25, yPosition);
        yPosition += 5;
        doc.text(`• Total tasks created: ${totalTasks}`, 25, yPosition);
        yPosition += 5;
        doc.text(`• Completed tasks: ${this.completedTasks.length}`, 25, yPosition);
        yPosition += 5;
        doc.text(`• Ongoing tasks: ${this.tasks.length}`, 25, yPosition);
        yPosition += 5;
        doc.text(`• Overdue tasks: ${overdueTasks}`, 25, yPosition);
        yPosition += 5;
        doc.text(`• Total edit requests: ${this.editRequests.length}`, 25, yPosition);
        yPosition += 5;
        doc.text(`• Pending edit requests: ${this.editRequests.filter(r => r.status === 'pending').length}`, 25, yPosition);
        yPosition += 5;
        doc.text(`• Overall completion rate: ${Math.round((this.completedTasks.length / totalTasks) * 100) || 0}%`, 25, yPosition);
        yPosition += 5;
        doc.text(`• Total chat messages: ${this.chatMessages.length}`, 25, yPosition);
        
        return yPosition + 10;
    }

    // Settings Section
    showSettings() {
        if (this.currentUser.role !== 'admin') {
            this.showAlert('Access denied. Admin privileges required.', 'danger');
            return;
        }
        
        this.loadSettingsForm();
    }

    loadSettingsForm() {
        const elements = {
            'appName': this.appConfig.app_name,
            'companyName': this.appConfig.company_info.name,
            'companyLogo': this.appConfig.company_info.logo,
            'menuOverview': this.appConfig.menu_items.overview,
            'menuTasks': this.appConfig.menu_items.my_tasks,
            'menuSchedule': this.appConfig.menu_items.schedule,
            'menuProfile': this.appConfig.menu_items.profile
        };
        
        Object.keys(elements).forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.value = elements[id];
            }
        });
    }

    saveSettings() {
        this.appConfig.app_name = document.getElementById('appName').value;
        this.appConfig.company_info.name = document.getElementById('companyName').value;
        this.appConfig.company_info.logo = document.getElementById('companyLogo').value;
        this.appConfig.menu_items.overview = document.getElementById('menuOverview').value;
        this.appConfig.menu_items.my_tasks = document.getElementById('menuTasks').value;
        this.appConfig.menu_items.schedule = document.getElementById('menuSchedule').value;
        this.appConfig.menu_items.profile = document.getElementById('menuProfile').value;
        
        this.saveAppConfig();
        this.applyConfiguration();
        this.showAlert('Settings saved successfully! Changes applied immediately.', 'success');
    }

    resetSettings() {
        if (confirm('Are you sure you want to reset all settings to default?')) {
            this.appConfig = {
                app_name: "Civil Engineering Task Manager",
                menu_items: {
                    overview: "Overview",
                    my_tasks: "My Tasks",
                    schedule: "Schedule",
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
                    team_chat: true
                },
                timing: {
                    timezone: "IST",
                    update_intervals: {
                        clock: 1000,
                        deadlines: 60000,
                        stats: 30000,
                        chat: 5000
                    }
                }
            };
            
            this.saveAppConfig();
            this.applyConfiguration();
            this.loadSettingsForm();
            this.showAlert('Settings reset to default!', 'info');
        }
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