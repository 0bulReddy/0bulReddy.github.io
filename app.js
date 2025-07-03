// Civil Engineering Task Management Dashboard
class TaskManager {
    constructor() {
        this.currentUser = null;
        this.users = [];
        this.tasks = [];
        this.taskModal = null;
        this.responseModal = null;
        this.charts = {};
        this.calendar = null;
        this.bcryptReady = false;
        this.clockInterval = null;
        this.deadlineInterval = null;
        
        this.init();
    }

    init() {
        // Wait for bcrypt to load
        this.waitForBcrypt().then(() => {
            this.loadSampleData();
            this.setupEventListeners();
            this.taskModal = new bootstrap.Modal(document.getElementById('taskModal'));
            this.responseModal = new bootstrap.Modal(document.getElementById('taskResponseModal'));
            this.checkAuthStatus();
            this.startLiveClock();
        });
    }

    waitForBcrypt() {
        return new Promise((resolve) => {
            if (typeof bcrypt !== 'undefined') {
                this.bcryptReady = true;
                resolve();
            } else {
                // Fallback: check every 100ms for bcrypt to load
                const checkBcrypt = setInterval(() => {
                    if (typeof bcrypt !== 'undefined') {
                        this.bcryptReady = true;
                        clearInterval(checkBcrypt);
                        resolve();
                    }
                }, 100);
                
                // Fallback after 3 seconds: use simple password comparison
                setTimeout(() => {
                    if (!this.bcryptReady) {
                        console.warn('bcrypt not loaded, using simple password comparison');
                        clearInterval(checkBcrypt);
                        resolve();
                    }
                }, 3000);
            }
        });
    }

    hashPassword(password) {
        if (this.bcryptReady && typeof bcrypt !== 'undefined') {
            return bcrypt.hashSync(password, 10);
        }
        // Fallback: simple encoding (not secure, for demo only)
        return btoa(password);
    }

    comparePassword(password, hash) {
        if (this.bcryptReady && typeof bcrypt !== 'undefined') {
            return bcrypt.compareSync(password, hash);
        }
        // Fallback: simple comparison
        return btoa(password) === hash;
    }

    // Real-time clock functionality
    startLiveClock() {
        this.updateClock();
        this.clockInterval = setInterval(() => {
            this.updateClock();
        }, 1000);

        // Update deadline tracking every minute
        this.updateDeadlineTracking();
        this.deadlineInterval = setInterval(() => {
            this.updateDeadlineTracking();
        }, 60000);
    }

    updateClock() {
        const now = new Date();
        const timeString = now.toLocaleString('en-US', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        });
        
        const clockElement = document.getElementById('liveClock');
        if (clockElement) {
            clockElement.textContent = timeString;
        }
    }

    updateDeadlineTracking() {
        if (!this.currentUser) return;
        
        this.updateDeadlineAlerts();
        this.updateTaskDeadlines();
        if (this.calendar) {
            this.renderCalendar();
        }
    }

    updateDeadlineAlerts() {
        const userTasks = this.currentUser.role === 'admin' ? 
            this.tasks : 
            this.tasks.filter(task => task.assigned_to === this.currentUser.id);
        
        const alertsContainer = document.getElementById('deadlineAlerts');
        if (!alertsContainer) return;

        const upcomingTasks = userTasks.filter(task => {
            if (task.status === 'Completed') return false;
            const daysUntil = this.getDaysUntilDeadline(task.end_date);
            return daysUntil <= 7; // Show tasks due within 7 days
        }).sort((a, b) => {
            const daysA = this.getDaysUntilDeadline(a.end_date);
            const daysB = this.getDaysUntilDeadline(b.end_date);
            return daysA - daysB;
        });

        if (upcomingTasks.length === 0) {
            alertsContainer.innerHTML = '<p class="text-muted">No urgent deadlines at this time.</p>';
            return;
        }

        alertsContainer.innerHTML = upcomingTasks.map(task => {
            const daysUntil = this.getDaysUntilDeadline(task.end_date);
            const user = this.users.find(u => u.id === task.assigned_to);
            const { urgencyClass, urgencyText } = this.getUrgencyInfo(daysUntil);
            
            return `
                <div class="deadline-alert ${urgencyClass}">
                    <div class="deadline-info">
                        <h6>${task.title}</h6>
                        <p>Assigned to: ${user ? user.username : 'Unknown'} | Priority: ${task.priority}</p>
                    </div>
                    <div class="deadline-timer ${urgencyClass}">
                        ${urgencyText}
                    </div>
                </div>
            `;
        }).join('');
    }

    updateTaskDeadlines() {
        // Update task cards with deadline information
        const taskCards = document.querySelectorAll('.task-card');
        taskCards.forEach(card => {
            const taskId = card.dataset.taskId;
            if (taskId) {
                const task = this.tasks.find(t => t.id === parseInt(taskId));
                if (task) {
                    const deadlineElement = card.querySelector('.task-deadline');
                    if (deadlineElement) {
                        const daysUntil = this.getDaysUntilDeadline(task.end_date);
                        const { urgencyClass, urgencyText } = this.getUrgencyInfo(daysUntil);
                        
                        deadlineElement.textContent = urgencyText;
                        deadlineElement.className = `task-deadline ${urgencyClass}`;
                        
                        // Add overdue styling to card
                        if (daysUntil < 0) {
                            card.classList.add('overdue');
                        } else {
                            card.classList.remove('overdue');
                        }
                    }
                }
            }
        });
    }

    getDaysUntilDeadline(endDate) {
        const today = new Date();
        const deadline = new Date(endDate);
        const timeDiff = deadline.getTime() - today.getTime();
        return Math.ceil(timeDiff / (1000 * 3600 * 24));
    }

    getUrgencyInfo(daysUntil) {
        if (daysUntil < 0) {
            return {
                urgencyClass: 'overdue',
                urgencyText: `${Math.abs(daysUntil)} days overdue`
            };
        } else if (daysUntil === 0) {
            return {
                urgencyClass: 'urgent',
                urgencyText: 'Due today'
            };
        } else if (daysUntil === 1) {
            return {
                urgencyClass: 'urgent',
                urgencyText: 'Due tomorrow'
            };
        } else if (daysUntil <= 3) {
            return {
                urgencyClass: 'urgent',
                urgencyText: `${daysUntil} days until deadline`
            };
        } else if (daysUntil <= 7) {
            return {
                urgencyClass: 'warning',
                urgencyText: `${daysUntil} days until deadline`
            };
        } else {
            return {
                urgencyClass: 'normal',
                urgencyText: `${daysUntil} days until deadline`
            };
        }
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
                    user_id: 2,
                    assigned_to: 2,
                    title: 'Foundation Inspection',
                    description: 'Inspect foundation work for Building A compliance with structural requirements',
                    start_date: '2025-07-01',
                    end_date: '2025-07-05',
                    priority: 'High',
                    status: 'In Progress',
                    response_status: 'accepted',
                    created_date: '2025-06-28',
                    updated_date: '2025-07-02',
                    assignee_comments: '',
                    progress_notes: []
                },
                {
                    id: 2,
                    user_id: 2,
                    assigned_to: 3,
                    title: 'Steel Frame Quality Check',
                    description: 'Quality assurance for steel frame installation phase 2',
                    start_date: '2025-07-08',
                    end_date: '2025-07-12',
                    priority: 'Medium',
                    status: 'Pending Response',
                    response_status: 'pending',
                    created_date: '2025-06-30',
                    updated_date: '2025-06-30',
                    assignee_comments: '',
                    progress_notes: []
                },
                {
                    id: 3,
                    user_id: 3,
                    assigned_to: 3,
                    title: 'Concrete Pour Supervision',
                    description: 'Supervise concrete pouring for Level 3 slab',
                    start_date: '2025-06-25',
                    end_date: '2025-06-30',
                    priority: 'High',
                    status: 'Completed',
                    response_status: 'completed',
                    created_date: '2025-06-20',
                    updated_date: '2025-06-30',
                    assignee_comments: 'Completed successfully with no issues',
                    progress_notes: []
                },
                {
                    id: 4,
                    user_id: 3,
                    assigned_to: 2,
                    title: 'Site Safety Audit',
                    description: 'Weekly safety audit and compliance check',
                    start_date: '2025-07-15',
                    end_date: '2025-07-15',
                    priority: 'High',
                    status: 'Not Started',
                    response_status: 'pending',
                    created_date: '2025-07-01',
                    updated_date: '2025-07-01',
                    assignee_comments: '',
                    progress_notes: []
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
        document.getElementById('addCalendarTaskBtn').addEventListener('click', () => this.showTaskModal());
        document.getElementById('saveTaskBtn').addEventListener('click', () => this.saveTask());
        document.getElementById('taskForm').addEventListener('submit', (e) => e.preventDefault());

        // Task Response
        document.getElementById('submitResponseBtn').addEventListener('click', () => this.submitTaskResponse());
        document.getElementById('taskResponseForm').addEventListener('submit', (e) => e.preventDefault());

        // Filters
        document.getElementById('statusFilter').addEventListener('change', () => this.filterTasks());
        document.getElementById('priorityFilter').addEventListener('change', () => this.filterTasks());
        document.getElementById('searchTasks').addEventListener('input', () => this.filterTasks());

        // Profile Management
        document.getElementById('profileForm').addEventListener('submit', (e) => this.updateProfile(e));
        document.getElementById('changePasswordForm').addEventListener('submit', (e) => this.changePassword(e));

        // Admin User Creation
        document.getElementById('createUserForm').addEventListener('submit', (e) => this.createUser(e));
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
        
        // Clear intervals
        if (this.clockInterval) {
            clearInterval(this.clockInterval);
        }
        if (this.deadlineInterval) {
            clearInterval(this.deadlineInterval);
        }
        
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
        this.showOverview();
        this.setupAdminAccess();
    }

    updateUserInfo() {
        document.getElementById('userWelcome').textContent = `Welcome, ${this.currentUser.username}!`;
        document.getElementById('userRole').textContent = this.currentUser.role.charAt(0).toUpperCase() + this.currentUser.role.slice(1);
        document.getElementById('userRole').className = `badge ${this.currentUser.role === 'admin' ? 'bg-warning' : 'bg-primary'}`;
    }

    setupAdminAccess() {
        const adminElements = document.querySelectorAll('.admin-only');
        adminElements.forEach(element => {
            element.style.display = this.currentUser.role === 'admin' ? 'block' : 'none';
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
            'tasks': 'My Tasks',
            'calendar': 'Project Schedule',
            'profile': 'Profile Management',
            'admin': 'Admin Panel'
        };

        document.getElementById('sectionTitle').textContent = sectionTitles[section] || 'Dashboard';
        document.getElementById(`${section}Section`).style.display = 'block';

        // Load section-specific data
        switch (section) {
            case 'overview':
                this.showOverview();
                break;
            case 'tasks':
                this.showTasks();
                break;
            case 'calendar':
                this.showCalendar();
                break;
            case 'profile':
                this.showProfile();
                break;
            case 'admin':
                this.showAdmin();
                break;
        }
    }

    // Overview Section
    showOverview() {
        const userTasks = this.currentUser.role === 'admin' ? 
            this.tasks : 
            this.tasks.filter(task => task.assigned_to === this.currentUser.id);

        const stats = this.calculateStats(userTasks);
        this.updateStatCards(stats);
        this.renderCharts(userTasks);
        this.updateDeadlineAlerts();
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
        this.renderStatusChart(tasks);
        this.renderPriorityChart(tasks);
    }

    renderStatusChart(tasks) {
        const ctx = document.getElementById('taskStatusChart').getContext('2d');
        
        if (this.charts.status) {
            this.charts.status.destroy();
        }

        const statusData = {
            'Not Started': tasks.filter(t => t.status === 'Not Started').length,
            'In Progress': tasks.filter(t => t.status === 'In Progress').length,
            'Completed': tasks.filter(t => t.status === 'Completed').length,
            'Pending Response': tasks.filter(t => t.status === 'Pending Response').length
        };

        this.charts.status = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(statusData),
                datasets: [{
                    data: Object.values(statusData),
                    backgroundColor: ['#FFC185', '#1FB8CD', '#B4413C', '#ECEBD5'],
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
        const ctx = document.getElementById('taskPriorityChart').getContext('2d');
        
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

    // Tasks Section
    showTasks() {
        this.renderTasks();
    }

    renderTasks() {
        const userTasks = this.tasks.filter(task => 
            task.assigned_to === this.currentUser.id || 
            (this.currentUser.role === 'admin') ||
            task.user_id === this.currentUser.id
        );
        
        const tasksList = document.getElementById('tasksList');
        
        if (userTasks.length === 0) {
            tasksList.innerHTML = `
                <div class="text-center py-5">
                    <i class="fas fa-tasks fa-3x text-muted mb-3"></i>
                    <h4 class="text-muted">No tasks yet</h4>
                    <p class="text-muted">Create your first task to get started!</p>
                </div>
            `;
            return;
        }

        tasksList.innerHTML = userTasks.map(task => this.createTaskCard(task)).join('');
    }

    createTaskCard(task) {
        const creator = this.users.find(u => u.id === task.user_id);
        const assignee = this.users.find(u => u.id === task.assigned_to);
        const isAssignedToCurrentUser = task.assigned_to === this.currentUser.id;
        const isCreatedByCurrentUser = task.user_id === this.currentUser.id;
        const canEdit = isCreatedByCurrentUser || this.currentUser.role === 'admin';
        const needsResponse = isAssignedToCurrentUser && task.response_status === 'pending' && task.status === 'Pending Response';
        
        const daysUntil = this.getDaysUntilDeadline(task.end_date);
        const { urgencyClass, urgencyText } = this.getUrgencyInfo(daysUntil);
        
        return `
            <div class="task-card ${daysUntil < 0 ? 'overdue' : ''}" data-task-id="${task.id}">
                <div class="task-card-header">
                    <h5 class="task-title">${task.title}</h5>
                    <div class="d-flex gap-2">
                        <span class="priority-badge priority-${task.priority.toLowerCase()}">${task.priority}</span>
                        <span class="status-badge status-${task.status.toLowerCase().replace(' ', '-')}">${task.status}</span>
                    </div>
                </div>
                <div class="task-card-body">
                    ${needsResponse ? `
                        <div class="response-needed">
                            <h6><i class="fas fa-exclamation-circle"></i> Response Required</h6>
                            <p>This task has been assigned to you and requires your response.</p>
                        </div>
                    ` : ''}
                    <p class="task-description">${task.description}</p>
                    <div class="task-meta">
                        <div class="task-meta-item">
                            <i class="fas fa-calendar-alt"></i>
                            <span>${task.start_date} - ${task.end_date}</span>
                        </div>
                        <div class="task-meta-item">
                            <i class="fas fa-user-plus"></i>
                            <span>Created by: ${creator ? creator.username : 'Unknown'}</span>
                        </div>
                        <div class="task-meta-item">
                            <i class="fas fa-user"></i>
                            <span>Assigned to: ${assignee ? assignee.username : 'Unknown'}</span>
                        </div>
                        <div class="task-meta-item">
                            <i class="fas fa-clock"></i>
                            <span class="task-deadline ${urgencyClass}">${urgencyText}</span>
                        </div>
                        <div class="task-meta-item">
                            <i class="fas fa-info-circle"></i>
                            <span>Updated: ${task.updated_date}</span>
                        </div>
                    </div>
                    ${task.assignee_comments ? `
                        <div class="mt-3">
                            <strong>Assignee Comments:</strong>
                            <p class="text-muted">${task.assignee_comments}</p>
                        </div>
                    ` : ''}
                </div>
                <div class="task-actions">
                    ${needsResponse ? `
                        <button class="btn btn-warning btn-sm" onclick="taskManager.showTaskResponseModal(${task.id})">
                            <i class="fas fa-reply"></i> Respond
                        </button>
                    ` : ''}
                    ${canEdit ? `
                        <button class="btn btn-primary btn-sm" onclick="taskManager.editTask(${task.id})">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="taskManager.deleteTask(${task.id})">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    ` : ''}
                    ${isAssignedToCurrentUser && task.status !== 'Completed' && task.response_status === 'accepted' ? `
                        <button class="btn btn-success btn-sm" onclick="taskManager.markTaskCompleted(${task.id})">
                            <i class="fas fa-check"></i> Mark Complete
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }

    showTaskResponseModal(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;

        const creator = this.users.find(u => u.id === task.user_id);
        
        document.getElementById('responseTaskId').value = taskId;
        document.getElementById('taskResponseDetails').innerHTML = `
            <div class="mb-3">
                <h6>${task.title}</h6>
                <p class="text-muted">${task.description}</p>
                <p><strong>Created by:</strong> ${creator ? creator.username : 'Unknown'}</p>
                <p><strong>Deadline:</strong> ${task.end_date}</p>
                <p><strong>Priority:</strong> ${task.priority}</p>
            </div>
        `;
        
        // Reset form
        document.getElementById('taskResponseForm').reset();
        
        this.responseModal.show();
    }

    submitTaskResponse() {
        const taskId = parseInt(document.getElementById('responseTaskId').value);
        const action = document.getElementById('responseAction').value;
        const comments = document.getElementById('responseComments').value;

        if (!action) {
            this.showAlert('Please select an action', 'danger');
            return;
        }

        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;

        task.response_status = action;
        task.assignee_comments = comments;
        task.updated_date = new Date().toISOString().split('T')[0];

        switch (action) {
            case 'accepted':
                task.status = 'In Progress';
                this.showAlert('Task accepted successfully!', 'success');
                break;
            case 'needs_clarification':
                task.status = 'Pending Response';
                this.showAlert('Clarification request sent!', 'info');
                break;
            case 'completed':
                task.status = 'Completed';
                this.showAlert('Task marked as completed!', 'success');
                break;
        }

        this.saveData();
        this.responseModal.hide();
        this.renderTasks();
        this.updateDeadlineTracking();
        
        // Refresh charts and stats if on overview page
        if (document.getElementById('overviewSection').style.display !== 'none') {
            this.showOverview();
        }
    }

    markTaskCompleted(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;

        task.status = 'Completed';
        task.response_status = 'completed';
        task.updated_date = new Date().toISOString().split('T')[0];

        this.saveData();
        this.renderTasks();
        this.updateDeadlineTracking();
        this.showAlert('Task completed successfully!', 'success');
        
        // Refresh charts and stats if on overview page
        if (document.getElementById('overviewSection').style.display !== 'none') {
            this.showOverview();
        }
    }

    filterTasks() {
        const statusFilter = document.getElementById('statusFilter').value;
        const priorityFilter = document.getElementById('priorityFilter').value;
        const searchQuery = document.getElementById('searchTasks').value.toLowerCase();

        let filteredTasks = this.tasks.filter(task => 
            task.assigned_to === this.currentUser.id || 
            (this.currentUser.role === 'admin') ||
            task.user_id === this.currentUser.id
        );

        if (statusFilter) {
            filteredTasks = filteredTasks.filter(task => task.status === statusFilter);
        }

        if (priorityFilter) {
            filteredTasks = filteredTasks.filter(task => task.priority === priorityFilter);
        }

        if (searchQuery) {
            filteredTasks = filteredTasks.filter(task => 
                task.title.toLowerCase().includes(searchQuery) ||
                task.description.toLowerCase().includes(searchQuery)
            );
        }

        const tasksList = document.getElementById('tasksList');
        if (filteredTasks.length === 0) {
            tasksList.innerHTML = `
                <div class="text-center py-5">
                    <i class="fas fa-search fa-3x text-muted mb-3"></i>
                    <h4 class="text-muted">No tasks found</h4>
                    <p class="text-muted">Try adjusting your filters or search terms.</p>
                </div>
            `;
        } else {
            tasksList.innerHTML = filteredTasks.map(task => this.createTaskCard(task)).join('');
        }
    }

    // Calendar Section
    showCalendar() {
        // Initialize calendar if not already done
        if (!this.calendar) {
            this.initializeCalendar();
        } else {
            this.renderCalendar();
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
            editable: true,
            droppable: true,
            events: this.getCalendarEvents(),
            eventClick: (info) => {
                const taskId = parseInt(info.event.id);
                this.editTask(taskId);
            },
            dateClick: (info) => {
                this.showTaskModal(null, info.dateStr);
            },
            eventDrop: (info) => {
                this.updateTaskDates(parseInt(info.event.id), info.event.startStr, info.event.endStr || info.event.startStr);
            },
            eventResize: (info) => {
                this.updateTaskDates(parseInt(info.event.id), info.event.startStr, info.event.endStr);
            },
            height: 'auto'
        });
        
        this.calendar.render();
    }

    getCalendarEvents() {
        const userTasks = this.currentUser.role === 'admin' ? 
            this.tasks : 
            this.tasks.filter(task => task.assigned_to === this.currentUser.id || task.user_id === this.currentUser.id);

        return userTasks.map(task => {
            const assignee = this.users.find(u => u.id === task.assigned_to);
            const isOverdue = this.getDaysUntilDeadline(task.end_date) < 0 && task.status !== 'Completed';
            
            return {
                id: task.id.toString(),
                title: `${task.title} (${assignee ? assignee.username : 'Unknown'})`,
                start: task.start_date,
                end: task.end_date,
                backgroundColor: this.getEventColor(task.priority, task.status, isOverdue),
                borderColor: this.getEventColor(task.priority, task.status, isOverdue),
                textColor: '#ffffff',
                extendedProps: {
                    priority: task.priority,
                    status: task.status,
                    isOverdue: isOverdue
                },
                className: [
                    `priority-${task.priority.toLowerCase()}`,
                    `status-${task.status.toLowerCase().replace(' ', '-')}`,
                    isOverdue ? 'overdue' : ''
                ]
            };
        });
    }

    getEventColor(priority, status, isOverdue) {
        if (isOverdue && status !== 'Completed') {
            return '#F44336'; // Red for overdue
        }
        
        if (status === 'Completed') {
            return '#4CAF50'; // Green for completed
        }
        
        switch (priority) {
            case 'High': return '#F44336'; // Red
            case 'Medium': return '#FFC107'; // Orange
            case 'Low': return '#4CAF50'; // Green
            default: return '#2196F3'; // Blue
        }
    }

    renderCalendar() {
        if (this.calendar) {
            this.calendar.removeAllEvents();
            this.calendar.addEventSource(this.getCalendarEvents());
        }
    }

    updateTaskDates(taskId, startDate, endDate) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;

        task.start_date = startDate.split('T')[0];
        task.end_date = endDate.split('T')[0];
        task.updated_date = new Date().toISOString().split('T')[0];

        this.saveData();
        this.showAlert('Task dates updated successfully!', 'success');
        this.updateDeadlineTracking();
    }

    showTaskModal(task = null, selectedDate = null) {
        const modal = document.getElementById('taskModal');
        const title = document.getElementById('taskModalTitle');
        const form = document.getElementById('taskForm');
        
        // Populate assignee dropdown
        const assigneeSelect = document.getElementById('taskAssignedTo');
        assigneeSelect.innerHTML = this.users.map(user => 
            `<option value="${user.id}">${user.username} (${user.role})</option>`
        ).join('');
        
        if (task) {
            title.textContent = 'Edit Task';
            document.getElementById('taskId').value = task.id;
            document.getElementById('taskTitle').value = task.title;
            document.getElementById('taskDescription').value = task.description;
            document.getElementById('taskStartDate').value = task.start_date;
            document.getElementById('taskEndDate').value = task.end_date;
            document.getElementById('taskPriority').value = task.priority;
            document.getElementById('taskStatus').value = task.status;
            document.getElementById('taskAssignedTo').value = task.assigned_to;
        } else {
            title.textContent = 'Add Task';
            form.reset();
            document.getElementById('taskId').value = '';
            document.getElementById('taskAssignedTo').value = this.currentUser.id;
            
            if (selectedDate) {
                document.getElementById('taskStartDate').value = selectedDate;
                document.getElementById('taskEndDate').value = selectedDate;
            }
        }
        
        this.taskModal.show();
    }

    saveTask() {
        const taskId = document.getElementById('taskId').value;
        const assignedTo = parseInt(document.getElementById('taskAssignedTo').value);
        const taskData = {
            title: document.getElementById('taskTitle').value.trim(),
            description: document.getElementById('taskDescription').value.trim(),
            start_date: document.getElementById('taskStartDate').value,
            end_date: document.getElementById('taskEndDate').value,
            priority: document.getElementById('taskPriority').value,
            status: document.getElementById('taskStatus').value,
            assigned_to: assignedTo,
            updated_date: new Date().toISOString().split('T')[0]
        };

        // Validation
        if (!taskData.title || !taskData.description || !taskData.start_date || !taskData.end_date) {
            this.showAlert('Please fill in all required fields', 'danger');
            return;
        }

        if (new Date(taskData.start_date) > new Date(taskData.end_date)) {
            this.showAlert('Start date cannot be after end date', 'danger');
            return;
        }

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
                response_status: assignedTo === this.currentUser.id ? 'accepted' : 'pending',
                assignee_comments: '',
                progress_notes: [],
                ...taskData
            };
            
            // If assigning to someone else, set status to Pending Response
            if (assignedTo !== this.currentUser.id) {
                newTask.status = 'Pending Response';
            }
            
            this.tasks.push(newTask);
            this.showAlert('Task created successfully!', 'success');
        }

        this.saveData();
        this.taskModal.hide();
        
        // Refresh current view
        if (document.getElementById('tasksSection').style.display !== 'none') {
            this.renderTasks();
        }
        if (document.getElementById('calendarSection').style.display !== 'none') {
            this.renderCalendar();
        }
        if (document.getElementById('overviewSection').style.display !== 'none') {
            this.showOverview();
        }
        
        this.updateDeadlineTracking();
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
            
            // Refresh current view
            if (document.getElementById('tasksSection').style.display !== 'none') {
                this.renderTasks();
            }
            if (document.getElementById('calendarSection').style.display !== 'none') {
                this.renderCalendar();
            }
            if (document.getElementById('overviewSection').style.display !== 'none') {
                this.showOverview();
            }
            if (document.getElementById('adminSection').style.display !== 'none') {
                this.renderAllTasks();
            }
            
            this.updateDeadlineTracking();
            this.showAlert('Task deleted successfully!', 'success');
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
        const email = document.getElementById('profileEmail').value.trim();
        
        if (!email) {
            this.showAlert('Email is required', 'danger');
            return;
        }
        
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
        this.renderAllTasks();
    }

    createUser(e) {
        e.preventDefault();
        
        const username = document.getElementById('newUserUsername').value.trim();
        const email = document.getElementById('newUserEmail').value.trim();
        const password = document.getElementById('newUserPassword').value;
        const role = document.getElementById('newUserRole').value;

        // Validation
        if (!username || !email || !password || !role) {
            this.showAlert('Please fill in all fields', 'danger');
            return;
        }

        if (password.length < 6) {
            this.showAlert('Password must be at least 6 characters long', 'danger');
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
        
        // Reset form
        document.getElementById('createUserForm').reset();
        
        // Refresh user table
        this.renderUsersTable();
        
        this.showAlert(`User '${username}' created successfully!`, 'success');
    }

    renderUsersTable() {
        const tbody = document.getElementById('usersTable');
        tbody.innerHTML = this.users.map(user => {
            const userTasks = this.tasks.filter(t => t.assigned_to === user.id);
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
        if (this.tasks.length === 0) {
            allTasksList.innerHTML = `
                <div class="text-center py-5">
                    <i class="fas fa-tasks fa-3x text-muted mb-3"></i>
                    <h4 class="text-muted">No tasks in the system</h4>
                    <p class="text-muted">Tasks created by users will appear here.</p>
                </div>
            `;
        } else {
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
        const user = this.users.find(u => u.id === userId);
        if (!user) return;

        if (confirm(`Are you sure you want to delete user '${user.username}' and all their tasks?`)) {
            this.users = this.users.filter(u => u.id !== userId);
            this.tasks = this.tasks.filter(t => t.user_id !== userId && t.assigned_to !== userId);
            this.saveData();
            this.renderUsersTable();
            this.renderAllTasks();
            this.showAlert('User deleted successfully!', 'success');
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