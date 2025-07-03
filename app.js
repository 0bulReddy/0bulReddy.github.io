// Enhanced Civil Engineering Task Management Dashboard
class TaskManager {
    constructor() {
        this.currentUser = null;
        this.users = [];
        this.tasks = [];
        this.appConfig = {};
        this.taskModal = null;
        this.createUserModal = null;
        this.charts = {};
        this.calendar = null;
        this.bcryptReady = false;
        
        this.init();
    }

    init() {
        // Wait for bcrypt and other libraries to load
        this.waitForLibraries().then(() => {
            this.loadSampleData();
            this.loadAppConfig();
            this.setupEventListeners();
            this.taskModal = new bootstrap.Modal(document.getElementById('taskModal'));
            this.createUserModal = new bootstrap.Modal(document.getElementById('createUserModal'));
            this.checkAuthStatus();
        });
    }

    waitForLibraries() {
        return new Promise((resolve) => {
            let checkCount = 0;
            const maxChecks = 30; // 3 seconds max wait
            
            const checkLibraries = () => {
                checkCount++;
                
                // Check for bcrypt
                if (typeof bcrypt !== 'undefined') {
                    this.bcryptReady = true;
                }
                
                // Check for Chart.js
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
                    quick_actions: true,
                    pdf_reports: true,
                    team_dashboard: true,
                    calendar_view: true,
                    deadline_alerts: true
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
        // Update app title
        const appTitle = document.getElementById('appTitle');
        if (appTitle) {
            appTitle.textContent = this.appConfig.app_name;
        }
        
        const sidebarTitle = document.getElementById('sidebarTitle');
        if (sidebarTitle) {
            sidebarTitle.textContent = this.appConfig.company_info.logo + ' ' + this.appConfig.app_name.split(' ')[0];
        }
        
        // Update menu names
        const menuElements = {
            'navOverview': this.appConfig.menu_items.overview,
            'navTasks': this.appConfig.menu_items.my_tasks,
            'navSchedule': this.appConfig.menu_items.schedule,
            'navProfile': this.appConfig.menu_items.profile,
            'navAdmin': this.appConfig.menu_items.admin_panel,
            'navTeamProgress': this.appConfig.menu_items.team_progress,
            'navReports': this.appConfig.menu_items.reports,
            'navSettings': this.appConfig.menu_items.settings
        };
        
        Object.keys(menuElements).forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = menuElements[id];
            }
        });
    }

    // Load sample data if none exists
    loadSampleData() {
        const existingUsers = localStorage.getItem('ce_users');
        const existingTasks = localStorage.getItem('ce_tasks');

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
            localStorage.setItem('ce_users', JSON.stringify(sampleUsers));
        }

        if (!existingTasks) {
            const sampleTasks = [
                {
                    id: 1,
                    user_id: 1,
                    assigned_to: 2,
                    title: 'Foundation Survey',
                    description: 'Complete topographical survey for foundation work',
                    start_date: '2025-07-01',
                    end_date: '2025-07-05',
                    priority: 'High',
                    status: 'In Progress',
                    response_status: 'accepted',
                    assignee_comments: 'Survey equipment ready, starting tomorrow',
                    progress_notes: ['Initial site inspection completed', 'Survey markers placed'],
                    created_date: '2025-07-01',
                    updated_date: '2025-07-03'
                },
                {
                    id: 2,
                    user_id: 2,
                    assigned_to: 3,
                    title: 'Concrete Testing',
                    description: 'Test concrete samples for strength analysis',
                    start_date: '2025-07-03',
                    end_date: '2025-07-08',
                    priority: 'Medium',
                    status: 'Not Started',
                    response_status: 'pending',
                    assignee_comments: '',
                    progress_notes: [],
                    created_date: '2025-07-03',
                    updated_date: '2025-07-03'
                },
                {
                    id: 3,
                    user_id: 3,
                    assigned_to: 1,
                    title: 'Safety Inspection',
                    description: 'Weekly safety inspection of construction site',
                    start_date: '2025-07-02',
                    end_date: '2025-07-02',
                    priority: 'High',
                    status: 'Completed',
                    response_status: 'completed',
                    assignee_comments: 'All safety protocols followed, minor issues documented',
                    progress_notes: ['Site walkthrough completed', 'Safety report submitted'],
                    created_date: '2025-07-02',
                    updated_date: '2025-07-02'
                },
                {
                    id: 4,
                    user_id: 1,
                    assigned_to: 2,
                    title: 'Steel Frame Quality Check',
                    description: 'Quality assurance for steel frame installation phase 2',
                    start_date: '2025-07-04',
                    end_date: '2025-07-10',
                    priority: 'Medium',
                    status: 'Not Started',
                    response_status: 'pending',
                    assignee_comments: '',
                    progress_notes: [],
                    created_date: '2025-07-04',
                    updated_date: '2025-07-04'
                }
            ];
            localStorage.setItem('ce_tasks', JSON.stringify(sampleTasks));
        }

        this.loadData();
    }

    loadData() {
        this.users = JSON.parse(localStorage.getItem('ce_users')) || [];
        this.tasks = JSON.parse(localStorage.getItem('ce_tasks')) || [];
    }

    saveData() {
        localStorage.setItem('ce_users', JSON.stringify(this.users));
        localStorage.setItem('ce_tasks', JSON.stringify(this.tasks));
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

    // Authentication Methods
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
            localStorage.setItem('ce_current_user', JSON.stringify(user));
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
                this.showDashboard();
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
        
        // Show overview by default
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

        // Also update the navigation items specifically
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

        console.log('Admin access setup completed. Is admin:', isAdmin);
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
        
        // Update active navigation
        document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
        e.currentTarget.classList.add('active');

        // Show corresponding section
        document.querySelectorAll('.content-section').forEach(section => {
            section.style.display = 'none';
        });

        const sectionTitles = {
            'overview': 'Dashboard Overview',
            'tasks': this.appConfig.menu_items.my_tasks,
            'schedule': this.appConfig.menu_items.schedule,
            'profile': 'Profile Management',
            'admin': 'Admin Panel',
            'team-progress': 'Team Progress Dashboard',
            'reports': 'Reports Generator',
            'settings': 'Application Settings'
        };

        document.getElementById('sectionTitle').textContent = sectionTitles[section] || 'Dashboard';
        
        // Map section names to actual element IDs
        const sectionMap = {
            'overview': 'overviewSection',
            'tasks': 'tasksSection',
            'schedule': 'scheduleSection',
            'profile': 'profileSection',
            'admin': 'adminSection',
            'team-progress': 'teamProgressSection',
            'reports': 'reportsSection',
            'settings': 'settingsSection'
        };

        const sectionElement = document.getElementById(sectionMap[section]);
        if (sectionElement) {
            sectionElement.style.display = 'block';
        } else {
            console.warn(`Section element not found for: ${section}`);
        }

        // Load section-specific data
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

    // Overview Section
    showOverview() {
        const userTasks = this.currentUser.role === 'admin' ? 
            this.tasks : 
            this.tasks.filter(task => task.user_id === this.currentUser.id || task.assigned_to === this.currentUser.id);

        const stats = this.calculateStats(userTasks);
        this.updateStatCards(stats);
        
        // Wait a bit for the DOM to be ready, then render charts
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
            completed: tasks.filter(t => t.status === 'Completed').length
        };
    }

    updateStatCards(stats) {
        document.getElementById('totalTasks').textContent = stats.total;
        document.getElementById('pendingTasks').textContent = stats.pending;
        document.getElementById('inProgressTasks').textContent = stats.inProgress;
        document.getElementById('completedTasks').textContent = stats.completed;
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
            .sort((a, b) => new Date(b.updated_date) - new Date(a.updated_date))
            .slice(0, 5);

        const container = document.getElementById('recentTasksList');
        
        if (recentTasks.length === 0) {
            container.innerHTML = '<p class="text-muted">No recent tasks</p>';
            return;
        }

        container.innerHTML = recentTasks.map(task => `
            <div class="recent-task-item" data-task-id="${task.id}" style="cursor: pointer;">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <h6 class="mb-1">${task.title}</h6>
                        <small class="text-muted">${task.description.substring(0, 100)}...</small>
                    </div>
                    <div class="text-end">
                        <span class="status-badge status-${task.status.toLowerCase().replace(' ', '-')}">${task.status}</span>
                        <br>
                        <small class="text-muted">${task.end_date}</small>
                    </div>
                </div>
            </div>
        `).join('');

        // Make recent tasks clickable to navigate to tasks section
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
        const canEdit = isCurrentUserTask || this.currentUser.role === 'admin';
        const isAssignee = task.assigned_to === this.currentUser.id;
        const isOverdue = new Date(task.end_date) < new Date() && task.status !== 'Completed';
        
        return `
            <div class="task-card" data-task-id="${task.id}">
                <div class="task-card-header">
                    <div>
                        <h5 class="task-title">${task.title}</h5>
                        ${isOverdue ? '<span class="badge bg-danger">OVERDUE</span>' : ''}
                    </div>
                    <div class="d-flex gap-2">
                        <span class="priority-badge priority-${task.priority.toLowerCase()}">${task.priority}</span>
                        <span class="status-badge status-${task.status.toLowerCase().replace(' ', '-')}">${task.status}</span>
                    </div>
                </div>
                <div class="task-card-body">
                    <p class="task-description">${task.description}</p>
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
                </div>
                ${isAssignee && this.appConfig.features.quick_actions ? `
                    <div class="quick-actions mb-2 px-3">
                        <small class="text-muted d-block mb-2">Quick Actions:</small>
                        <div class="d-flex gap-2 flex-wrap">
                            ${task.status !== 'In Progress' ? `
                                <button class="btn btn-sm btn-warning" onclick="taskManager.quickUpdateTask(${task.id}, 'In Progress')">
                                    <i class="fas fa-play"></i> Start
                                </button>
                            ` : ''}
                            ${task.status !== 'Completed' ? `
                                <button class="btn btn-sm btn-success" onclick="taskManager.quickUpdateTask(${task.id}, 'Completed')">
                                    <i class="fas fa-check"></i> Complete
                                </button>
                            ` : ''}
                            <button class="btn btn-sm btn-info" onclick="taskManager.requestClarification(${task.id})">
                                <i class="fas fa-question-circle"></i> Need Help
                            </button>
                        </div>
                    </div>
                ` : ''}
                ${canEdit ? `
                    <div class="task-actions">
                        <button class="btn btn-sm btn-primary" onclick="taskManager.editTask(${task.id})">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="taskManager.deleteTask(${task.id})">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                ` : ''}
            </div>
        `;
    }

    quickUpdateTask(taskId, newStatus) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            task.status = newStatus;
            task.updated_date = new Date().toISOString().split('T')[0];
            task.response_status = newStatus === 'Completed' ? 'completed' : 'in_progress';
            
            this.saveData();
            this.renderTasks();
            this.showAlert(`Task status updated to ${newStatus}`, 'success');
        }
    }

    requestClarification(taskId) {
        const comment = prompt('Please describe what clarification you need:');
        if (comment) {
            const task = this.tasks.find(t => t.id === taskId);
            if (task) {
                task.assignee_comments = comment;
                task.response_status = 'needs_clarification';
                task.updated_date = new Date().toISOString().split('T')[0];
                
                this.saveData();
                this.renderTasks();
                this.showAlert('Clarification request sent', 'info');
            }
        }
    }

    filterTasks() {
        const statusFilter = document.getElementById('statusFilter').value;
        const priorityFilter = document.getElementById('priorityFilter').value;
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

        if (assigneeValue) {
            filteredTasks = filteredTasks.filter(task => task.assigned_to == assigneeValue);
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
        } else {
            title.textContent = 'Add Task';
            form.reset();
            document.getElementById('taskId').value = '';
        }
        
        this.taskModal.show();
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
            updated_date: new Date().toISOString().split('T')[0]
        };

        if (taskId) {
            // Update existing task
            const taskIndex = this.tasks.findIndex(t => t.id === parseInt(taskId));
            if (taskIndex !== -1) {
                this.tasks[taskIndex] = { ...this.tasks[taskIndex], ...taskData };
                this.showAlert('Task updated successfully!', 'success');
            }
        } else {
            // Create new task
            const newTask = {
                id: this.getNextId(this.tasks),
                user_id: this.currentUser.id,
                created_date: new Date().toISOString().split('T')[0],
                response_status: 'pending',
                assignee_comments: '',
                progress_notes: [],
                ...taskData
            };
            this.tasks.push(newTask);
            this.showAlert('Task created successfully!', 'success');
        }

        this.saveData();
        this.taskModal.hide();
        this.renderTasks();
        
        // Update calendar if visible
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
            this.showAlert('Task deleted successfully!', 'success');
            
            // Update calendar if visible
            if (this.calendar) {
                this.updateCalendarEvents();
            }
        }
    }

    // Schedule Section
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
                // Pre-fill start date when clicking on a date
                document.getElementById('taskStartDate').value = info.dateStr;
                this.showTaskModal();
            }
        });
        
        this.calendar.render();
    }

    getCalendarEvents() {
        return this.tasks
            .filter(task => task.user_id === this.currentUser.id || task.assigned_to === this.currentUser.id || this.currentUser.role === 'admin')
            .map(task => ({
                id: task.id,
                title: task.title,
                start: task.start_date,
                end: task.end_date,
                backgroundColor: this.getTaskColor(task),
                borderColor: this.getTaskColor(task),
                extendedProps: {
                    status: task.status,
                    priority: task.priority
                }
            }));
    }

    getTaskColor(task) {
        const colors = {
            'High': '#dc3545',
            'Medium': '#fd7e14',
            'Low': '#28a745'
        };
        return colors[task.priority] || '#6c757d';
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
            created_date: new Date().toISOString().split('T')[0],
            last_login: 'Never'
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
        this.renderAllTasks();
    }

    renderUsersTable() {
        const tbody = document.getElementById('usersTable');
        if (!tbody) return;
        
        tbody.innerHTML = this.users.map(user => {
            const userTasks = this.tasks.filter(t => t.user_id === user.id);
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

    renderAllTasks() {
        const allTasksList = document.getElementById('allTasksList');
        if (allTasksList) {
            allTasksList.innerHTML = this.tasks.map(task => this.createTaskCard(task)).join('');
        }
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
            this.saveData();
            this.renderUsersTable();
            this.renderAllTasks();
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
        const totalTasks = this.tasks.length;
        const completedTasks = this.tasks.filter(t => t.status === 'Completed').length;
        const overdueTasks = this.tasks.filter(t => new Date(t.end_date) < new Date() && t.status !== 'Completed').length;

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

    renderUserStatsTable() {
        const tbody = document.getElementById('userStatsTable');
        if (!tbody) return;
        
        const userStats = this.users.map(user => {
            const allUserTasks = this.tasks.filter(t => t.user_id === user.id || t.assigned_to === user.id);
            const completedTasks = allUserTasks.filter(t => t.status === 'Completed');
            const inProgressTasks = allUserTasks.filter(t => t.status === 'In Progress');
            const overdueTasks = allUserTasks.filter(t => 
                new Date(t.end_date) < new Date() && t.status !== 'Completed'
            );
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
        // Check if jsPDF is available
        if (typeof window.jsPDF === 'undefined') {
            this.showAlert('PDF library not loaded. Please refresh the page.', 'danger');
            return;
        }

        const reportType = document.getElementById('reportType').value;
        const dateRange = document.getElementById('reportDateRange').value;
        
        const { jsPDF } = window.jsPDF;
        const doc = new jsPDF();
        
        // Add header
        doc.setFontSize(18);
        doc.text(this.appConfig.company_info.name, 20, 20);
        doc.setFontSize(14);
        doc.text(`${this.getReportTitle(reportType)} - ${this.formatDateRange(dateRange)}`, 20, 30);
        doc.setFontSize(10);
        doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, 40);
        doc.text(`Generated by: ${this.currentUser.username}`, 20, 45);
        
        let yPosition = 60;
        
        // Generate report content based on type
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
        
        // Save the PDF
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
        
        doc.setFontSize(10);
        doc.text(`Total Users: ${this.users.length}`, 20, yPosition);
        yPosition += 5;
        doc.text(`Total Tasks: ${this.tasks.length}`, 20, yPosition);
        yPosition += 5;
        doc.text(`Completed Tasks: ${this.tasks.filter(t => t.status === 'Completed').length}`, 20, yPosition);
        yPosition += 5;
        doc.text(`In Progress Tasks: ${this.tasks.filter(t => t.status === 'In Progress').length}`, 20, yPosition);
        yPosition += 5;
        doc.text(`Pending Tasks: ${this.tasks.filter(t => t.status === 'Not Started').length}`, 20, yPosition);
        
        return yPosition + 15;
    }

    generateTaskCompletionReport(doc, yPosition, dateRange) {
        doc.setFontSize(12);
        doc.text('Task Completion Report', 20, yPosition);
        yPosition += 15;
        
        const completedTasks = this.tasks.filter(t => t.status === 'Completed');
        
        doc.setFontSize(10);
        completedTasks.forEach(task => {
            const user = this.users.find(u => u.id === task.user_id);
            doc.text(`${task.title} - Completed by: ${user ? user.username : 'Unknown'}`, 20, yPosition);
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
            const userTasks = this.tasks.filter(t => t.user_id === user.id || t.assigned_to === user.id);
            const completed = userTasks.filter(t => t.status === 'Completed').length;
            const completionRate = userTasks.length > 0 ? Math.round((completed / userTasks.length) * 100) : 0;
            
            doc.text(`${user.username}: ${completed}/${userTasks.length} tasks (${completionRate}%)`, 20, yPosition);
            yPosition += 5;
        });
        
        return yPosition + 10;
    }

    generateProjectTimelineReport(doc, yPosition, dateRange) {
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

    generateAdminOverviewReport(doc, yPosition, dateRange) {
        doc.setFontSize(12);
        doc.text('Administrative Overview', 20, yPosition);
        yPosition += 15;
        
        doc.setFontSize(10);
        doc.text('System Statistics:', 20, yPosition);
        yPosition += 5;
        doc.text(`• Total registered users: ${this.users.length}`, 25, yPosition);
        yPosition += 5;
        doc.text(`• Active admin users: ${this.users.filter(u => u.role === 'admin').length}`, 25, yPosition);
        yPosition += 5;
        doc.text(`• Total tasks created: ${this.tasks.length}`, 25, yPosition);
        yPosition += 5;
        doc.text(`• Overall completion rate: ${Math.round((this.tasks.filter(t => t.status === 'Completed').length / this.tasks.length) * 100) || 0}%`, 25, yPosition);
        
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
        
        const checkboxes = {
            'enableQuickActions': this.appConfig.features.quick_actions,
            'enablePdfReports': this.appConfig.features.pdf_reports,
            'enableTeamDashboard': this.appConfig.features.team_dashboard,
            'enableCalendarView': this.appConfig.features.calendar_view,
            'enableDeadlineAlerts': this.appConfig.features.deadline_alerts
        };
        
        Object.keys(checkboxes).forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.checked = checkboxes[id];
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
        
        this.appConfig.features.quick_actions = document.getElementById('enableQuickActions').checked;
        this.appConfig.features.pdf_reports = document.getElementById('enablePdfReports').checked;
        this.appConfig.features.team_dashboard = document.getElementById('enableTeamDashboard').checked;
        this.appConfig.features.calendar_view = document.getElementById('enableCalendarView').checked;
        this.appConfig.features.deadline_alerts = document.getElementById('enableDeadlineAlerts').checked;
        
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
                    quick_actions: true,
                    pdf_reports: true,
                    team_dashboard: true,
                    calendar_view: true,
                    deadline_alerts: true
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