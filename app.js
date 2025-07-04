// Comprehensive Civil Engineering Task Management System
class TaskManager {
    constructor() {
        this.currentUser = null;
        this.users = [];
        this.tasks = [];
        this.messages = [];
        this.editRequests = [];
        this.taskModal = null;
        this.createUserModal = null;
        this.charts = {};
        this.calendar = null;
        this.bcryptReady = false;
        this.clockInterval = null;
        this.deadlineInterval = null;
        
        this.init();
    }

    init() {
        this.waitForLibraries().then(() => {
            this.loadSampleData();
            this.setupEventListeners();
            this.initializeModals();
            this.checkAuthStatus();
            this.startRealTimeUpdates();
        });
    }

    waitForLibraries() {
        return new Promise((resolve) => {
            let checkCount = 0;
            const maxChecks = 50;
            
            const checkLibraries = () => {
                checkCount++;
                
                if (typeof bcrypt !== 'undefined') {
                    this.bcryptReady = true;
                }
                
                const chartReady = typeof Chart !== 'undefined';
                const bootstrapReady = typeof bootstrap !== 'undefined';
                
                if (chartReady && bootstrapReady) {
                    if (!this.bcryptReady) {
                        console.warn('bcrypt not loaded, using simple password encoding');
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

    initializeModals() {
        if (typeof bootstrap !== 'undefined') {
            this.taskModal = new bootstrap.Modal(document.getElementById('taskModal'));
            this.createUserModal = new bootstrap.Modal(document.getElementById('createUserModal'));
        }
    }

    // Real-time updates system
    startRealTimeUpdates() {
        // Update clock every second
        this.clockInterval = setInterval(() => {
            this.updateLiveClock();
        }, 1000);

        // Update deadline calculations every minute
        this.deadlineInterval = setInterval(() => {
            this.updateDeadlineCalculations();
        }, 60000);

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
            hour12: false
        };
        
        const formattedDateTime = now.toLocaleDateString('en-US', options);
        const clockElement = document.getElementById('currentDateTime');
        if (clockElement) {
            clockElement.textContent = formattedDateTime;
        }
    }

    updateDeadlineCalculations() {
        this.tasks.forEach(task => {
            task.deadlineInfo = this.calculateDeadlineInfo(task.end_date, task.status);
        });

        // Update UI if dashboard is visible
        if (document.getElementById('overviewSection') && document.getElementById('overviewSection').style.display !== 'none') {
            this.updateDeadlineAlerts();
            this.updateOverviewStats();
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
        } else if (daysDiff <= 3) {
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

    // Password management - Simplified for demo purposes
    hashPassword(password) {
        // Simple hash for demo - in production use proper bcrypt
        return btoa(password + 'ce_salt_2025');
    }

    comparePassword(password, hash) {
        // Simple comparison for demo
        return btoa(password + 'ce_salt_2025') === hash;
    }

    // Sample data loading
    loadSampleData() {
        // Always reload fresh sample data for demo
        const sampleUsers = [
            {
                id: 1,
                username: 'admin',
                password_hash: this.hashPassword('admin123'),
                email: 'admin@company.com',
                role: 'admin',
                created_date: '2025-01-01',
                last_login: new Date().toISOString().split('T')[0]
            },
            {
                id: 2,
                username: 'john_engineer',
                password_hash: this.hashPassword('password123'),
                email: 'john@company.com',
                role: 'user',
                created_date: '2025-01-01',
                last_login: new Date().toISOString().split('T')[0]
            },
            {
                id: 3,
                username: 'sarah_supervisor',
                password_hash: this.hashPassword('securepass'),
                email: 'sarah@company.com',
                role: 'user',
                created_date: '2025-01-01',
                last_login: new Date().toISOString().split('T')[0]
            }
        ];

        // Check if users already exist in localStorage
        const existingUsers = localStorage.getItem('ce_users');
        if (!existingUsers) {
            localStorage.setItem('ce_users', JSON.stringify(sampleUsers));
        }

        const today = new Date();
        const formatDate = (days) => {
            const date = new Date(today);
            date.setDate(date.getDate() + days);
            return date.toISOString().split('T')[0];
        };

        const sampleTasks = [
            {
                id: 1,
                user_id: 1,
                assigned_to: 2,
                title: 'Foundation Inspection',
                description: 'Inspect foundation concrete pour for Building A according to safety standards',
                start_date: formatDate(-2),
                end_date: formatDate(-1), // Overdue
                priority: 'High',
                status: 'In Progress',
                response_status: 'accepted',
                assignee_comments: 'Foundation inspection in progress, found minor issues',
                completion_remarks: '',
                created_date: formatDate(-2),
                assigned_date: formatDate(-2),
                completion_date: null
            },
            {
                id: 2,
                user_id: 1,
                assigned_to: 3,
                title: 'Steel Frame Check',
                description: 'Quality check for steel frame installation',
                start_date: formatDate(0),
                end_date: formatDate(0), // Due today
                priority: 'High',
                status: 'Not Started',
                response_status: 'pending',
                assignee_comments: '',
                completion_remarks: '',
                created_date: formatDate(0),
                assigned_date: formatDate(0),
                completion_date: null
            },
            {
                id: 3,
                user_id: 2,
                assigned_to: 1,
                title: 'Site Safety Audit',
                description: 'Comprehensive safety audit of construction site',
                start_date: formatDate(-5),
                end_date: formatDate(-2), // Completed
                priority: 'Medium',
                status: 'Completed',
                response_status: 'accepted',
                assignee_comments: 'Safety audit completed successfully',
                completion_remarks: 'All safety protocols are properly implemented. No major issues found.',
                created_date: formatDate(-5),
                assigned_date: formatDate(-5),
                completion_date: formatDate(-2)
            },
            {
                id: 4,
                user_id: 1,
                assigned_to: 2,
                title: 'Material Quality Testing',
                description: 'Test concrete and steel materials for quality compliance',
                start_date: formatDate(1),
                end_date: formatDate(3), // Due in 3 days
                priority: 'Medium',
                status: 'Not Started',
                response_status: 'pending',
                assignee_comments: '',
                completion_remarks: '',
                created_date: formatDate(0),
                assigned_date: formatDate(0),
                completion_date: null
            }
        ];

        const existingTasks = localStorage.getItem('ce_tasks');
        if (!existingTasks) {
            localStorage.setItem('ce_tasks', JSON.stringify(sampleTasks));
        }

        const sampleMessages = [
            {
                id: 1,
                user_id: 1,
                username: 'admin',
                message: 'Welcome to the Civil Engineering Task Management System! Please ensure all safety protocols are followed.',
                timestamp: new Date().toISOString()
            },
            {
                id: 2,
                user_id: 2,
                username: 'john_engineer',
                message: 'Foundation inspection is progressing well. Minor adjustments needed.',
                timestamp: new Date(Date.now() - 3600000).toISOString()
            }
        ];

        const existingMessages = localStorage.getItem('ce_messages');
        if (!existingMessages) {
            localStorage.setItem('ce_messages', JSON.stringify(sampleMessages));
        }

        this.loadData();
    }

    loadData() {
        this.users = JSON.parse(localStorage.getItem('ce_users')) || [];
        this.tasks = JSON.parse(localStorage.getItem('ce_tasks')) || [];
        this.messages = JSON.parse(localStorage.getItem('ce_messages')) || [];
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

        // Task status change handling for completion remarks
        document.getElementById('taskStatus').addEventListener('change', (e) => {
            const remarksGroup = document.getElementById('completionRemarksGroup');
            if (e.target.value === 'Completed') {
                remarksGroup.style.display = 'block';
                document.getElementById('completionRemarks').required = true;
            } else {
                remarksGroup.style.display = 'none';
                document.getElementById('completionRemarks').required = false;
            }
        });

        // User Management (Admin)
        const createUserBtn = document.getElementById('createUserBtn');
        if (createUserBtn) {
            createUserBtn.addEventListener('click', () => this.showCreateUserModal());
        }
        
        const saveUserBtn = document.getElementById('saveUserBtn');
        if (saveUserBtn) {
            saveUserBtn.addEventListener('click', () => this.createUser());
        }

        // Filters
        document.getElementById('statusFilter').addEventListener('change', () => this.filterTasks());
        document.getElementById('priorityFilter').addEventListener('change', () => this.filterTasks());
        document.getElementById('deadlineFilter').addEventListener('change', () => this.filterTasks());
        document.getElementById('assigneeFilter').addEventListener('change', () => this.filterTasks());
        document.getElementById('searchTasks').addEventListener('input', () => this.filterTasks());

        // Chat System
        document.getElementById('sendMessageBtn').addEventListener('click', () => this.sendMessage());
        document.getElementById('messageInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            }
        });

        // Profile Management
        document.getElementById('profileForm').addEventListener('submit', (e) => this.updateProfile(e));
        document.getElementById('changePasswordForm').addEventListener('submit', (e) => this.changePassword(e));

        // Reports
        const generateReportBtn = document.getElementById('generateReportBtn');
        if (generateReportBtn) {
            generateReportBtn.addEventListener('click', () => this.generatePDFReport());
        }
    }

    // Authentication Methods
    handleLogin(e) {
        e.preventDefault();
        const username = document.getElementById('loginUsername').value.trim();
        const password = document.getElementById('loginPassword').value;

        if (!username || !password) {
            this.showAlert('Please enter both username and password', 'danger');
            return;
        }

        // Ensure users are loaded
        this.loadData();
        
        const user = this.users.find(u => u.username === username);
        if (user && this.comparePassword(password, user.password_hash)) {
            user.last_login = new Date().toISOString().split('T')[0];
            this.currentUser = user;
            localStorage.setItem('ce_current_user', JSON.stringify(user));
            this.saveData();
            this.showDashboard();
            this.showAlert('Login successful!', 'success');
        } else {
            this.showAlert('Invalid username or password. Try admin/admin123 or john_engineer/password123', 'danger');
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

        if (password.length < 6) {
            this.showAlert('Password must be at least 6 characters long', 'danger');
            return;
        }

        // Ensure users are loaded
        this.loadData();

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
        this.showAlert('Registration successful! Please login with your new credentials.', 'success');
        this.showLoginPage();
    }

    handleLogout() {
        // Clear intervals
        if (this.clockInterval) clearInterval(this.clockInterval);
        if (this.deadlineInterval) clearInterval(this.deadlineInterval);
        
        this.currentUser = null;
        localStorage.removeItem('ce_current_user');
        this.showLoginPage();
        this.showAlert('Logged out successfully', 'info');
    }

    checkAuthStatus() {
        const savedUser = localStorage.getItem('ce_current_user');
        if (savedUser) {
            try {
                this.currentUser = JSON.parse(savedUser);
                // Verify user still exists
                this.loadData();
                const userExists = this.users.find(u => u.id === this.currentUser.id);
                if (userExists) {
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

    // UI Navigation
    showLoginPage() {
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
        this.showOverview();
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
            document.querySelector('[data-section="reports"]')
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
            'schedule': 'Schedule Calendar',
            'chat': 'Team Chat',
            'history': 'Task History',
            'profile': 'Profile Management',
            'admin': 'Admin Panel',
            'team-progress': 'Team Progress Dashboard',
            'reports': 'PDF Reports Generator'
        };

        document.getElementById('sectionTitle').textContent = sectionTitles[section] || 'Dashboard';
        
        const sectionMap = {
            'overview': 'overviewSection',
            'tasks': 'tasksSection',
            'schedule': 'scheduleSection',
            'chat': 'chatSection',
            'history': 'historySection',
            'profile': 'profileSection',
            'admin': 'adminSection',
            'team-progress': 'teamProgressSection',
            'reports': 'reportsSection'
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
        }
    }

    // Overview Section
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
            overdue: tasks.filter(t => t.deadlineInfo && t.deadlineInfo.isOverdue).length
        };
    }

    updateStatCards(stats) {
        document.getElementById('totalTasks').textContent = stats.total;
        document.getElementById('pendingTasks').textContent = stats.pending;
        document.getElementById('inProgressTasks').textContent = stats.inProgress;
        document.getElementById('overdueTasks').textContent = stats.overdue;
    }

    updateOverviewStats() {
        if (document.getElementById('overviewSection') && document.getElementById('overviewSection').style.display !== 'none') {
            this.showOverview();
        }
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
                        <i class="fas fa-check-circle text-success me-2"></i>
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
                        <i class="fas fa-${task.deadlineInfo.urgencyLevel === 'overdue' ? 'exclamation-triangle' : 'clock'} me-2"></i>
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
            item.addEventListener('click', () => {
                const taskId = parseInt(item.dataset.taskId);
                this.editTask(taskId);
            });
        });
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
            .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
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
                <div class="recent-task-item" data-task-id="${task.id}">
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

    // Tasks Section
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

        // Sort tasks by priority and deadline
        tasksToShow.sort((a, b) => {
            // First sort by priority
            const priorityOrder = { 'High': 3, 'Medium': 2, 'Low': 1 };
            const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
            if (priorityDiff !== 0) return priorityDiff;
            
            // Then sort by deadline
            const aDeadline = new Date(a.end_date);
            const bDeadline = new Date(b.end_date);
            return aDeadline - bDeadline;
        });

        const tasksList = document.getElementById('tasksList');
        
        if (tasksToShow.length === 0) {
            tasksList.innerHTML = `
                <div class="text-center py-5">
                    <i class="fas fa-tasks fa-3x text-muted mb-3"></i>
                    <h4 class="text-muted">No tasks yet</h4>
                    <p class="text-muted">Create your first task to get started!</p>
                </div>
            `;
            return;
        }

        tasksList.innerHTML = tasksToShow.map(task => this.createTaskCard(task)).join('');
    }

    createTaskCard(task) {
        const user = this.users.find(u => u.id === task.user_id);
        const assignee = this.users.find(u => u.id === task.assigned_to);
        const isCurrentUserTask = task.user_id === this.currentUser.id || task.assigned_to === this.currentUser.id;
        const canEdit = (isCurrentUserTask || this.currentUser.role === 'admin');
        
        // Update deadline info
        if (!task.deadlineInfo) {
            task.deadlineInfo = this.calculateDeadlineInfo(task.end_date, task.status);
        }
        
        let cardClass = 'task-card';
        if (task.deadlineInfo.isOverdue) {
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
                    </div>
                </div>
                <div class="task-card-body">
                    <p class="task-description">${task.description}</p>
                    <div class="task-meta">
                        <div class="task-meta-item">
                            <i class="fas fa-calendar-alt"></i>
                            <span>${task.start_date} - ${task.end_date}</span>
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
                    ${task.assignee_comments ? `
                        <div class="task-comments mt-2">
                            <strong>Comments:</strong> ${task.assignee_comments}
                        </div>
                    ` : ''}
                    ${task.completion_remarks ? `
                        <div class="task-comments mt-2">
                            <strong>Completion Remarks:</strong> ${task.completion_remarks}
                        </div>
                    ` : ''}
                </div>
                <div class="task-actions">
                    ${canEdit ? `
                        <button class="btn btn-sm btn-primary" onclick="taskManager.editTask(${task.id})">
                            <i class="fas fa-edit me-1"></i>Edit
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="taskManager.deleteTask(${task.id})">
                            <i class="fas fa-trash me-1"></i>Delete
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
        const assigneeFilter = document.getElementById('assigneeFilter').value;
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

        if (assigneeFilter) {
            filteredTasks = filteredTasks.filter(task => task.assigned_to == assigneeFilter);
        }

        if (searchQuery) {
            filteredTasks = filteredTasks.filter(task => 
                task.title.toLowerCase().includes(searchQuery) ||
                task.description.toLowerCase().includes(searchQuery)
            );
        }

        const tasksList = document.getElementById('tasksList');
        tasksList.innerHTML = filteredTasks.map(task => this.createTaskCard(task)).join('');
    }

    showTaskModal(task = null) {
        const title = document.getElementById('taskModalTitle');
        const form = document.getElementById('taskForm');
        const remarksGroup = document.getElementById('completionRemarksGroup');
        
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
            
            if (task.status === 'Completed') {
                remarksGroup.style.display = 'block';
                document.getElementById('completionRemarks').value = task.completion_remarks || '';
                document.getElementById('completionRemarks').required = true;
            } else {
                remarksGroup.style.display = 'none';
                document.getElementById('completionRemarks').required = false;
            }
        } else {
            title.textContent = 'Add Task';
            form.reset();
            document.getElementById('taskId').value = '';
            remarksGroup.style.display = 'none';
            document.getElementById('completionRemarks').required = false;
            // Set default start date to today
            const today = new Date().toISOString().split('T')[0];
            document.getElementById('taskStartDate').value = today;
        }
        
        if (this.taskModal) {
            this.taskModal.show();
        }
    }

    saveTask() {
        const taskId = document.getElementById('taskId').value;
        const taskData = {
            title: document.getElementById('taskTitle').value,
            description: document.getElementById('taskDescription').value,
            start_date: document.getElementById('taskStartDate').value,
            end_date: document.getElementById('taskEndDate').value,
            priority: document.getElementById('taskPriority').value,
            status: document.getElementById('taskStatus').value,
            assigned_to: parseInt(document.getElementById('taskAssignedTo').value) || null,
            assignee_comments: '',
            completion_remarks: document.getElementById('completionRemarks').value || '',
            assigned_date: new Date().toISOString().split('T')[0]
        };

        // Validation
        if (!taskData.title || !taskData.description || !taskData.start_date || !taskData.end_date) {
            this.showAlert('Please fill in all required fields', 'danger');
            return;
        }

        if (taskData.status === 'Completed' && !taskData.completion_remarks) {
            this.showAlert('Completion remarks are required when marking task as completed', 'danger');
            return;
        }

        if (new Date(taskData.start_date) > new Date(taskData.end_date)) {
            this.showAlert('Start date cannot be after end date', 'danger');
            return;
        }

        if (taskId) {
            const taskIndex = this.tasks.findIndex(t => t.id === parseInt(taskId));
            if (taskIndex !== -1) {
                this.tasks[taskIndex] = { ...this.tasks[taskIndex], ...taskData };
                if (taskData.status === 'Completed' && !this.tasks[taskIndex].completion_date) {
                    this.tasks[taskIndex].completion_date = new Date().toISOString().split('T')[0];
                }
                this.showAlert('Task updated successfully!', 'success');
            }
        } else {
            const newTask = {
                id: this.getNextId(this.tasks),
                user_id: this.currentUser.id,
                created_date: new Date().toISOString().split('T')[0],
                completion_date: taskData.status === 'Completed' ? new Date().toISOString().split('T')[0] : null,
                response_status: 'pending',
                ...taskData
            };
            this.tasks.push(newTask);
            this.showAlert('Task created successfully!', 'success');
        }

        this.saveData();
        if (this.taskModal) {
            this.taskModal.hide();
        }
        this.renderTasks();
        this.updateDeadlineCalculations();
        
        if (this.calendar) {
            this.updateCalendarEvents();
        }
    }

    editTask(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            this.showTaskModal(task);
        }
    }

    deleteTask(taskId) {
        if (confirm('Are you sure you want to delete this task?')) {
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

    // Schedule Section with Calendar
    showSchedule() {
        if (typeof FullCalendar === 'undefined') {
            document.getElementById('calendar').innerHTML = '<p class="text-center">Calendar feature is not available. FullCalendar library not loaded.</p>';
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

    // Chat System
    showChat() {
        this.renderUsersList();
        this.renderChatMessages();
    }

    renderUsersList() {
        const container = document.getElementById('usersList');
        const otherUsers = this.users.filter(u => u.id !== this.currentUser.id);
        
        container.innerHTML = otherUsers.map(user => `
            <div class="user-list-item online" data-user-id="${user.id}">
                <div class="user-status">
                    <span class="status-indicator"></span>
                    <span>${user.username}</span>
                </div>
                <small class="text-muted">${user.role}</small>
            </div>
        `).join('');
    }

    renderChatMessages() {
        const container = document.getElementById('chatMessages');
        
        container.innerHTML = this.messages.map(message => `
            <div class="chat-message ${message.user_id === this.currentUser.id ? 'own' : 'other'}">
                <div>
                    <span class="chat-username">${message.username}</span>
                    <span class="chat-timestamp">${new Date(message.timestamp).toLocaleTimeString()}</span>
                </div>
                <div class="chat-text">${message.message}</div>
            </div>
        `).join('');
        
        container.scrollTop = container.scrollHeight;
    }

    sendMessage() {
        const messageInput = document.getElementById('messageInput');
        const messageText = messageInput.value.trim();
        
        if (!messageText) return;
        
        const newMessage = {
            id: this.getNextId(this.messages),
            user_id: this.currentUser.id,
            username: this.currentUser.username,
            message: messageText,
            timestamp: new Date().toISOString()
        };
        
        this.messages.push(newMessage);
        this.saveData();
        messageInput.value = '';
        this.renderChatMessages();
    }

    // Task History
    showHistory() {
        this.renderCompletedTasks();
    }

    renderCompletedTasks() {
        const container = document.getElementById('completedTasksList');
        const completedTasks = this.tasks
            .filter(task => task.status === 'Completed' && 
                    (task.user_id === this.currentUser.id || task.assigned_to === this.currentUser.id || this.currentUser.role === 'admin'))
            .sort((a, b) => new Date(b.completion_date) - new Date(a.completion_date));
        
        if (completedTasks.length === 0) {
            container.innerHTML = '<p class="text-muted">No completed tasks found</p>';
            return;
        }

        container.innerHTML = completedTasks.map(task => {
            const user = this.users.find(u => u.id === task.user_id);
            const assignee = this.users.find(u => u.id === task.assigned_to);
            
            return `
                <div class="task-card">
                    <div class="task-card-header">
                        <div>
                            <h5 class="task-title">${task.title}</h5>
                        </div>
                        <div class="task-header-badges">
                            <span class="priority-badge priority-${task.priority.toLowerCase()}">${task.priority}</span>
                            <span class="status-badge status-completed">Completed</span>
                        </div>
                    </div>
                    <div class="task-card-body">
                        <p class="task-description">${task.description}</p>
                        <div class="task-meta">
                            <div class="task-meta-item">
                                <i class="fas fa-calendar-alt"></i>
                                <span>Duration: ${task.start_date} - ${task.end_date}</span>
                            </div>
                            <div class="task-meta-item">
                                <i class="fas fa-check-circle"></i>
                                <span>Completed: ${task.completion_date}</span>
                            </div>
                            <div class="task-meta-item">
                                <i class="fas fa-user"></i>
                                <span>Created by: ${user ? user.username : 'Unknown'}</span>
                            </div>
                            ${assignee ? `
                                <div class="task-meta-item">
                                    <i class="fas fa-user-tag"></i>
                                    <span>Completed by: ${assignee.username}</span>
                                </div>
                            ` : ''}
                        </div>
                        ${task.completion_remarks ? `
                            <div class="task-comments mt-2">
                                <strong>Completion Remarks:</strong> ${task.completion_remarks}
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    // Profile Management
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
        localStorage.setItem('ce_current_user', JSON.stringify(this.currentUser));
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

        if (newPassword.length < 6) {
            this.showAlert('New password must be at least 6 characters long', 'danger');
            return;
        }

        this.currentUser.password_hash = this.hashPassword(newPassword);
        const userIndex = this.users.findIndex(u => u.id === this.currentUser.id);
        if (userIndex !== -1) {
            this.users[userIndex] = this.currentUser;
        }
        
        this.saveData();
        localStorage.setItem('ce_current_user', JSON.stringify(this.currentUser));
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
    }

    showCreateUserModal() {
        document.getElementById('createUserForm').reset();
        if (this.createUserModal) {
            this.createUserModal.show();
        }
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
        if (this.createUserModal) {
            this.createUserModal.hide();
        }
        this.renderUsersTable();
        this.populateUserSelects();
        this.showAlert('User created successfully!', 'success');
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
            this.messages = this.messages.filter(m => m.user_id !== userId);
            this.saveData();
            this.renderUsersTable();
            this.populateUserSelects();
            this.showAlert('User deleted successfully!', 'success');
        }
    }

    // Team Progress
    showTeamProgress() {
        if (this.currentUser.role !== 'admin') {
            this.showAlert('Access denied. Admin privileges required.', 'danger');
            return;
        }
        this.renderTeamStats();
        setTimeout(() => {
            this.renderTeamCharts();
        }, 300);
    }

    renderTeamStats() {
        const container = document.getElementById('teamStatsCards');
        if (!container) return;
        
        const totalUsers = this.users.length;
        const totalTasks = this.tasks.length;
        const completedTasks = this.tasks.filter(t => t.status === 'Completed').length;
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
            const userTasks = this.tasks.filter(t => t.user_id === user.id || t.assigned_to === user.id);
            const completedTasks = userTasks.filter(t => t.status === 'Completed');
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
            'Completed': this.tasks.filter(t => t.status === 'Completed').length
        };

        this.charts.teamProductivity = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: Object.keys(statusData),
                datasets: [{
                    data: Object.values(statusData),
                    backgroundColor: ['#FFC185', '#1FB8CD', '#B4413C']
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

    // Reports Section
    showReports() {
        if (this.currentUser.role !== 'admin') {
            this.showAlert('Access denied. Admin privileges required.', 'danger');
            return;
        }
    }

    generatePDFReport() {
        if (typeof window.jsPDF === 'undefined') {
            this.showAlert('PDF library not loaded. Please refresh the page and try again.', 'danger');
            return;
        }

        const reportType = document.getElementById('reportType').value;
        const dateRange = document.getElementById('reportDateRange').value;
        
        const { jsPDF } = window.jsPDF;
        const doc = new jsPDF();
        
        // Header
        doc.setFontSize(18);
        doc.text('Civil Engineering Task Manager', 20, 20);
        doc.setFontSize(14);
        doc.text(`${this.getReportTitle(reportType)} - ${this.formatDateRange(dateRange)}`, 20, 30);
        doc.setFontSize(10);
        doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 40);
        doc.text(`Generated by: ${this.currentUser.username}`, 20, 45);
        
        let yPosition = 60;
        
        switch (reportType) {
            case 'team-summary':
                yPosition = this.generateTeamSummaryReport(doc, yPosition);
                break;
            case 'task-completion':
                yPosition = this.generateTaskCompletionReport(doc, yPosition);
                break;
            case 'user-productivity':
                yPosition = this.generateUserProductivityReport(doc, yPosition);
                break;
            case 'project-timeline':
                yPosition = this.generateProjectTimelineReport(doc, yPosition);
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
            'project-timeline': 'Project Timeline Report'
        };
        return titles[type] || 'Report';
    }

    formatDateRange(range) {
        const ranges = {
            'all': 'All Time',
            'last-30-days': 'Last 30 Days',
            'last-90-days': 'Last 90 Days',
            'current-year': 'Current Year'
        };
        return ranges[range] || 'All Time';
    }

    generateTeamSummaryReport(doc, yPosition) {
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
        doc.text(`Total Tasks: ${this.tasks.length}`, 20, yPosition);
        yPosition += 5;
        doc.text(`Completed Tasks: ${this.tasks.filter(t => t.status === 'Completed').length}`, 20, yPosition);
        yPosition += 5;
        doc.text(`Overdue Tasks: ${overdueTasks}`, 20, yPosition);
        yPosition += 5;
        doc.text(`Completion Rate: ${Math.round((this.tasks.filter(t => t.status === 'Completed').length / this.tasks.length) * 100) || 0}%`, 20, yPosition);
        
        return yPosition + 15;
    }

    generateTaskCompletionReport(doc, yPosition) {
        doc.setFontSize(12);
        doc.text('Task Completion Report', 20, yPosition);
        yPosition += 15;
        
        const completedTasks = this.tasks.filter(t => t.status === 'Completed');
        
        doc.setFontSize(10);
        completedTasks.forEach(task => {
            const user = this.users.find(u => u.id === task.user_id);
            doc.text(`${task.title} - Created by: ${user ? user.username : 'Unknown'}`, 20, yPosition);
            yPosition += 5;
            if (yPosition > 280) {
                doc.addPage();
                yPosition = 20;
            }
        });
        
        return yPosition + 10;
    }

    generateUserProductivityReport(doc, yPosition) {
        doc.setFontSize(12);
        doc.text('User Productivity Report', 20, yPosition);
        yPosition += 15;
        
        doc.setFontSize(10);
        this.users.forEach(user => {
            const userTasks = this.tasks.filter(t => t.user_id === user.id || t.assigned_to === user.id);
            const completed = userTasks.filter(t => t.status === 'Completed').length;
            const completionRate = userTasks.length > 0 ? Math.round((completed / userTasks.length) * 100) : 0;
            
            doc.text(`${user.username}: ${completed}/${userTasks.length} tasks (${completionRate}%)`, 20, yPosition);
            yPosition += 5;
        });
        
        return yPosition + 10;
    }

    generateProjectTimelineReport(doc, yPosition) {
        doc.setFontSize(12);
        doc.text('Project Timeline Report', 20, yPosition);
        yPosition += 15;
        
        const sortedTasks = this.tasks.sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
        
        doc.setFontSize(10);
        sortedTasks.forEach(task => {
            doc.text(`${task.title}: ${task.start_date} to ${task.end_date} (${task.status})`, 20, yPosition);
            yPosition += 5;
            if (yPosition > 280) {
                doc.addPage();
                yPosition = 20;
            }
        });
        
        return yPosition + 10;
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

    getNextId(array) {
        return array.length > 0 ? Math.max(...array.map(item => item.id)) + 1 : 1;
    }
}

// Initialize the application
const taskManager = new TaskManager();

// Global functions for onclick handlers
window.taskManager = taskManager;