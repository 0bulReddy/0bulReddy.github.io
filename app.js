// Civil Engineering Task Management Application
class TaskManager {
    constructor() {
        this.currentUser = null;
        this.users = [];
        this.tasks = [];
        this.editRequests = [];
        this.calendar = null;
        this.taskStatusChart = null;
        this.currentTaskId = null;
        
        this.initializeData();
        this.bindEvents();
        this.checkAuthState();
    }

    // Initialize application data
    initializeData() {
        // Load initial data from the provided JSON
        const initialData = {
            users: [
                {
                    id: 1,
                    username: "admin",
                    email: "admin@company.com", 
                    password: "password", // Simplified for demo
                    role: "admin",
                    created_date: "2025-01-01",
                    last_login: "2025-07-03"
                },
                {
                    id: 2,
                    username: "john_engineer",
                    email: "john@company.com",
                    password: "password", // Simplified for demo
                    role: "user",
                    created_date: "2025-01-02",
                    last_login: "2025-07-02"
                },
                {
                    id: 3,
                    username: "sarah_supervisor",
                    email: "sarah@company.com",
                    password: "password", // Simplified for demo
                    role: "user", 
                    created_date: "2025-01-03",
                    last_login: "2025-07-01"
                }
            ],
            tasks: [
                {
                    id: 1,
                    user_id: 1,
                    assigned_to: 2,
                    title: "Foundation Inspection",
                    description: "Inspect foundation for building A",
                    start_date: "2025-07-05", 
                    end_date: "2025-07-10",
                    priority: "High",
                    status: "In Progress",
                    response_status: "accepted",
                    created_date: "2025-07-01",
                    updated_date: "2025-07-02"
                },
                {
                    id: 2,
                    user_id: 2,
                    assigned_to: 3,
                    title: "Concrete Pour Planning",
                    description: "Plan concrete pour schedule for week 2",
                    start_date: "2025-07-08",
                    end_date: "2025-07-15", 
                    priority: "Medium",
                    status: "Completed",
                    response_status: "completed",
                    created_date: "2025-07-02",
                    updated_date: "2025-07-03"
                },
                {
                    id: 3,
                    user_id: 1,
                    assigned_to: 1,
                    title: "Safety Audit Review",
                    description: "Complete quarterly safety audit documentation",
                    start_date: "2025-07-12",
                    end_date: "2025-07-20",
                    priority: "Low", 
                    status: "Not Started",
                    response_status: "pending",
                    created_date: "2025-07-03",
                    updated_date: "2025-07-03"
                }
            ],
            editRequests: [
                {
                    id: 1,
                    task_id: 2,
                    requester_id: 3,
                    reason: "Need to update final measurements and completion notes",
                    status: "pending",
                    request_date: "2025-07-03",
                    approvals: {
                        admin: null,
                        creator: null
                    }
                }
            ]
        };

        // Check if data exists in localStorage, if not, initialize with default data
        if (!localStorage.getItem('users')) {
            localStorage.setItem('users', JSON.stringify(initialData.users));
        }
        if (!localStorage.getItem('tasks')) {
            localStorage.setItem('tasks', JSON.stringify(initialData.tasks));
        }
        if (!localStorage.getItem('editRequests')) {
            localStorage.setItem('editRequests', JSON.stringify(initialData.editRequests));
        }

        this.loadData();
    }

    // Load data from localStorage
    loadData() {
        this.users = JSON.parse(localStorage.getItem('users') || '[]');
        this.tasks = JSON.parse(localStorage.getItem('tasks') || '[]');
        this.editRequests = JSON.parse(localStorage.getItem('editRequests') || '[]');
    }

    // Save data to localStorage
    saveData() {
        localStorage.setItem('users', JSON.stringify(this.users));
        localStorage.setItem('tasks', JSON.stringify(this.tasks));
        localStorage.setItem('editRequests', JSON.stringify(this.editRequests));
    }

    // Bind event listeners
    bindEvents() {
        // Login/Register forms
        document.getElementById('loginForm').addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('registerForm').addEventListener('submit', (e) => this.handleRegister(e));
        document.getElementById('showRegister').addEventListener('click', (e) => this.showRegister(e));
        document.getElementById('showLogin').addEventListener('click', (e) => this.showLogin(e));

        // Navigation
        document.getElementById('navOverview').addEventListener('click', (e) => this.showSection(e, 'overview'));
        document.getElementById('navMyTasks').addEventListener('click', (e) => this.showSection(e, 'myTasks'));
        document.getElementById('navSchedule').addEventListener('click', (e) => this.showSection(e, 'schedule'));
        document.getElementById('navProfile').addEventListener('click', (e) => this.showSection(e, 'profile'));
        document.getElementById('navAdmin').addEventListener('click', (e) => this.showSection(e, 'admin'));
        document.getElementById('navLogout').addEventListener('click', (e) => this.handleLogout(e));

        // Task management
        document.getElementById('addTaskBtn').addEventListener('click', () => this.showAddTaskModal());
        document.getElementById('saveTaskBtn').addEventListener('click', () => this.saveTask());
        document.getElementById('updateTaskBtn').addEventListener('click', () => this.updateTask());
        document.getElementById('submitEditRequestBtn').addEventListener('click', () => this.submitEditRequest());
    }

    // Check authentication state
    checkAuthState() {
        const currentUser = localStorage.getItem('currentUser');
        if (currentUser) {
            this.currentUser = JSON.parse(currentUser);
            this.showMainApp();
        } else {
            this.showLogin();
        }
    }

    // Handle login
    handleLogin(e) {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        const user = this.users.find(u => u.username === username);
        if (user && user.password === password) {
            user.last_login = new Date().toISOString().split('T')[0];
            this.currentUser = user;
            localStorage.setItem('currentUser', JSON.stringify(user));
            this.saveData();
            this.showMainApp();
        } else {
            this.showAlert('Invalid username or password', 'danger');
        }
    }

    // Handle registration
    handleRegister(e) {
        e.preventDefault();
        const username = document.getElementById('regUsername').value;
        const email = document.getElementById('regEmail').value;
        const password = document.getElementById('regPassword').value;

        if (this.users.find(u => u.username === username)) {
            this.showAlert('Username already exists', 'danger');
            return;
        }

        const newUser = {
            id: Math.max(...this.users.map(u => u.id)) + 1,
            username,
            email,
            password, // Simplified for demo
            role: 'user',
            created_date: new Date().toISOString().split('T')[0],
            last_login: new Date().toISOString().split('T')[0]
        };

        this.users.push(newUser);
        this.saveData();
        this.showAlert('Registration successful! Please login.', 'success');
        this.showLogin();
    }

    // Show register form
    showRegister(e) {
        e.preventDefault();
        document.getElementById('loginPage').style.display = 'none';
        document.getElementById('registerPage').style.display = 'flex';
    }

    // Show login form
    showLogin(e) {
        if (e) e.preventDefault();
        document.getElementById('loginPage').style.display = 'flex';
        document.getElementById('registerPage').style.display = 'none';
        document.getElementById('mainApp').style.display = 'none';
    }

    // Show main application
    showMainApp() {
        document.getElementById('loginPage').style.display = 'none';
        document.getElementById('registerPage').style.display = 'none';
        document.getElementById('mainApp').style.display = 'block';
        
        // Show admin nav if user is admin
        if (this.currentUser.role === 'admin') {
            document.getElementById('navAdmin').style.display = 'block';
        }
        
        this.showSection(null, 'overview');
    }

    // Handle logout
    handleLogout(e) {
        e.preventDefault();
        localStorage.removeItem('currentUser');
        this.currentUser = null;
        this.showLogin();
    }

    // Show different sections
    showSection(e, section) {
        if (e) e.preventDefault();
        
        // Hide all sections
        document.querySelectorAll('.content-section').forEach(s => s.style.display = 'none');
        
        // Remove active class from nav links
        document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
        
        // Show selected section
        document.getElementById(section + 'Section').style.display = 'block';
        
        // Add active class to nav link
        if (e && e.target) {
            e.target.classList.add('active');
        }
        
        // Load section content
        switch (section) {
            case 'overview':
                this.loadOverview();
                break;
            case 'myTasks':
                this.loadMyTasks();
                break;
            case 'schedule':
                this.loadSchedule();
                break;
            case 'profile':
                this.loadProfile();
                break;
            case 'admin':
                this.loadAdmin();
                break;
        }
    }

    // Load overview section
    loadOverview() {
        const myTasks = this.tasks.filter(task => 
            task.assigned_to === this.currentUser.id || task.user_id === this.currentUser.id
        );
        
        const stats = {
            total: myTasks.length,
            inProgress: myTasks.filter(t => t.status === 'In Progress').length,
            completed: myTasks.filter(t => t.status === 'Completed').length,
            overdue: myTasks.filter(t => new Date(t.end_date) < new Date() && t.status !== 'Completed').length
        };

        document.getElementById('totalTasks').textContent = stats.total;
        document.getElementById('inProgressTasks').textContent = stats.inProgress;
        document.getElementById('completedTasks').textContent = stats.completed;
        document.getElementById('overdueTasks').textContent = stats.overdue;

        this.loadTaskStatusChart(stats);
        this.loadRecentTasks(myTasks);
    }

    // Load task status chart
    loadTaskStatusChart(stats) {
        const ctx = document.getElementById('taskStatusChart').getContext('2d');
        
        if (this.taskStatusChart) {
            this.taskStatusChart.destroy();
        }

        this.taskStatusChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Not Started', 'In Progress', 'Completed', 'Overdue'],
                datasets: [{
                    data: [
                        stats.total - stats.inProgress - stats.completed,
                        stats.inProgress,
                        stats.completed,
                        stats.overdue
                    ],
                    backgroundColor: ['#1FB8CD', '#FFC185', '#B4413C', '#ECEBD5']
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

    // Load recent tasks
    loadRecentTasks(tasks) {
        const recentTasks = tasks.slice(0, 5);
        const container = document.getElementById('recentTasks');
        
        if (recentTasks.length === 0) {
            container.innerHTML = '<div class="empty-state"><i class="fas fa-tasks"></i><h5>No tasks yet</h5><p>Start by creating your first task</p></div>';
            return;
        }

        container.innerHTML = recentTasks.map(task => `
            <div class="recent-task-item">
                <div class="recent-task-info">
                    <h6>${task.title}</h6>
                    <p>Due: ${new Date(task.end_date).toLocaleDateString()}</p>
                </div>
                <span class="status-badge status-${task.status.toLowerCase().replace(' ', '-')}">${task.status}</span>
            </div>
        `).join('');
    }

    // Load my tasks section
    loadMyTasks() {
        const myTasks = this.tasks.filter(task => 
            task.assigned_to === this.currentUser.id || task.user_id === this.currentUser.id
        );

        this.populateUserSelect();
        this.renderTasksTable(myTasks);
    }

    // Populate user select dropdown
    populateUserSelect() {
        const select = document.getElementById('taskAssignTo');
        select.innerHTML = '<option value="">Select User</option>';
        
        this.users.forEach(user => {
            select.innerHTML += `<option value="${user.id}">${user.username}</option>`;
        });
    }

    // Render tasks table
    renderTasksTable(tasks) {
        const tbody = document.getElementById('tasksTableBody');
        
        if (tasks.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">No tasks found</td></tr>';
            return;
        }

        tbody.innerHTML = tasks.map(task => {
            const assignedUser = this.users.find(u => u.id === task.assigned_to);
            const isCompleted = task.status === 'Completed';
            const canEdit = task.assigned_to === this.currentUser.id || task.user_id === this.currentUser.id;
            
            return `
                <tr>
                    <td>${task.title}</td>
                    <td>${assignedUser ? assignedUser.username : 'Unknown'}</td>
                    <td><span class="priority-badge priority-${task.priority.toLowerCase()}">${task.priority}</span></td>
                    <td><span class="status-badge status-${task.status.toLowerCase().replace(' ', '-')}">${task.status}</span></td>
                    <td>${new Date(task.end_date).toLocaleDateString()}</td>
                    <td>
                        <div class="action-buttons">
                            ${canEdit ? (isCompleted ? 
                                `<button class="btn btn-sm btn-outline-primary" onclick="taskManager.requestEdit(${task.id})">Request Edit</button>` :
                                `<button class="btn btn-sm btn-outline-primary" onclick="taskManager.editTask(${task.id})">Edit</button>`
                            ) : ''}
                            ${(task.user_id === this.currentUser.id || this.currentUser.role === 'admin') ? 
                                `<button class="btn btn-sm btn-outline-danger" onclick="taskManager.deleteTask(${task.id})">Delete</button>` : ''
                            }
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // Show add task modal
    showAddTaskModal() {
        this.populateUserSelect();
        const modal = new bootstrap.Modal(document.getElementById('addTaskModal'));
        modal.show();
    }

    // Save new task
    saveTask() {
        const title = document.getElementById('taskTitle').value;
        const description = document.getElementById('taskDescription').value;
        const assignedTo = parseInt(document.getElementById('taskAssignTo').value);
        const priority = document.getElementById('taskPriority').value;
        const startDate = document.getElementById('taskStartDate').value;
        const endDate = document.getElementById('taskEndDate').value;

        if (!title || !description || !assignedTo || !priority || !startDate || !endDate) {
            this.showAlert('Please fill in all fields', 'danger');
            return;
        }

        const newTask = {
            id: this.tasks.length > 0 ? Math.max(...this.tasks.map(t => t.id)) + 1 : 1,
            user_id: this.currentUser.id,
            assigned_to: assignedTo,
            title,
            description,
            start_date: startDate,
            end_date: endDate,
            priority,
            status: 'Not Started',
            response_status: 'pending',
            created_date: new Date().toISOString().split('T')[0],
            updated_date: new Date().toISOString().split('T')[0]
        };

        this.tasks.push(newTask);
        this.saveData();
        
        // Close modal and refresh
        bootstrap.Modal.getInstance(document.getElementById('addTaskModal')).hide();
        document.getElementById('addTaskForm').reset();
        this.loadMyTasks();
        this.showAlert('Task created successfully', 'success');
    }

    // Edit task
    editTask(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;

        this.currentTaskId = taskId;
        
        // Fill form with current task data
        document.getElementById('editTaskTitle').value = task.title;
        document.getElementById('editTaskDescription').value = task.description;
        document.getElementById('editTaskStatus').value = task.status;
        document.getElementById('editTaskPriority').value = task.priority;
        document.getElementById('editTaskStartDate').value = task.start_date;
        document.getElementById('editTaskEndDate').value = task.end_date;

        const modal = new bootstrap.Modal(document.getElementById('editTaskModal'));
        modal.show();
    }

    // Update task
    updateTask() {
        const task = this.tasks.find(t => t.id === this.currentTaskId);
        if (!task) return;

        task.title = document.getElementById('editTaskTitle').value;
        task.description = document.getElementById('editTaskDescription').value;
        task.status = document.getElementById('editTaskStatus').value;
        task.priority = document.getElementById('editTaskPriority').value;
        task.start_date = document.getElementById('editTaskStartDate').value;
        task.end_date = document.getElementById('editTaskEndDate').value;
        task.updated_date = new Date().toISOString().split('T')[0];

        this.saveData();
        
        // Close modal and refresh
        bootstrap.Modal.getInstance(document.getElementById('editTaskModal')).hide();
        this.loadMyTasks();
        this.showAlert('Task updated successfully', 'success');
    }

    // Request edit for completed task
    requestEdit(taskId) {
        this.currentTaskId = taskId;
        const modal = new bootstrap.Modal(document.getElementById('editRequestModal'));
        modal.show();
    }

    // Submit edit request
    submitEditRequest() {
        const reason = document.getElementById('editRequestReason').value;
        if (!reason.trim()) {
            this.showAlert('Please provide a reason for the edit request', 'danger');
            return;
        }

        const newRequest = {
            id: this.editRequests.length > 0 ? Math.max(...this.editRequests.map(r => r.id)) + 1 : 1,
            task_id: this.currentTaskId,
            requester_id: this.currentUser.id,
            reason,
            status: 'pending',
            request_date: new Date().toISOString().split('T')[0],
            approvals: {
                admin: null,
                creator: null
            }
        };

        this.editRequests.push(newRequest);
        this.saveData();
        
        // Close modal and refresh
        bootstrap.Modal.getInstance(document.getElementById('editRequestModal')).hide();
        document.getElementById('editRequestForm').reset();
        this.showAlert('Edit request submitted successfully', 'success');
    }

    // Delete task
    deleteTask(taskId) {
        if (confirm('Are you sure you want to delete this task?')) {
            this.tasks = this.tasks.filter(t => t.id !== taskId);
            this.saveData();
            this.loadMyTasks();
            this.showAlert('Task deleted successfully', 'success');
        }
    }

    // Load schedule section
    loadSchedule() {
        if (this.calendar) {
            this.calendar.destroy();
        }

        const calendarEl = document.getElementById('calendar');
        this.calendar = new FullCalendar.Calendar(calendarEl, {
            initialView: 'dayGridMonth',
            headerToolbar: {
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay'
            },
            events: this.tasks.map(task => ({
                id: task.id,
                title: task.title,
                start: task.start_date,
                end: task.end_date,
                color: this.getTaskColor(task.status)
            })),
            height: 'auto'
        });
        
        this.calendar.render();
    }

    // Get task color based on status
    getTaskColor(status) {
        switch (status) {
            case 'Not Started': return '#6c757d';
            case 'In Progress': return '#ffc107';
            case 'Completed': return '#198754';
            default: return '#6c757d';
        }
    }

    // Load profile section
    loadProfile() {
        const container = document.getElementById('profileContent');
        container.innerHTML = `
            <div class="profile-info">
                <h5>User Information</h5>
                <p><strong>Username:</strong> ${this.currentUser.username}</p>
                <p><strong>Email:</strong> ${this.currentUser.email}</p>
                <p><strong>Role:</strong> <span class="user-role ${this.currentUser.role}">${this.currentUser.role}</span></p>
                <p><strong>Member Since:</strong> ${new Date(this.currentUser.created_date).toLocaleDateString()}</p>
                <p><strong>Last Login:</strong> ${new Date(this.currentUser.last_login).toLocaleDateString()}</p>
            </div>
        `;
    }

    // Load admin section
    loadAdmin() {
        if (this.currentUser.role !== 'admin') return;
        
        this.loadUserManagement();
        this.loadEditRequests();
    }

    // Load user management
    loadUserManagement() {
        const container = document.getElementById('userManagement');
        container.innerHTML = this.users.map(user => `
            <div class="user-card">
                <h6>${user.username}</h6>
                <p>${user.email}</p>
                <span class="user-role ${user.role}">${user.role}</span>
                <p class="mt-2"><small>Joined: ${new Date(user.created_date).toLocaleDateString()}</small></p>
            </div>
        `).join('');
    }

    // Load edit requests
    loadEditRequests() {
        const container = document.getElementById('editRequests');
        const pendingRequests = this.editRequests.filter(req => req.status === 'pending');
        
        if (pendingRequests.length === 0) {
            container.innerHTML = '<div class="empty-state"><i class="fas fa-clipboard-check"></i><h5>No pending requests</h5><p>All edit requests have been processed</p></div>';
            return;
        }

        container.innerHTML = pendingRequests.map(request => {
            const task = this.tasks.find(t => t.id === request.task_id);
            const requester = this.users.find(u => u.id === request.requester_id);
            
            return `
                <div class="edit-request-card">
                    <h6>Edit Request for: ${task ? task.title : 'Unknown Task'}</h6>
                    <p><strong>Requested by:</strong> ${requester ? requester.username : 'Unknown'}</p>
                    <p><strong>Date:</strong> ${new Date(request.request_date).toLocaleDateString()}</p>
                    <div class="edit-request-reason">
                        <strong>Reason:</strong> ${request.reason}
                    </div>
                    <div class="action-buttons mt-2">
                        <button class="btn btn-sm btn-success" onclick="taskManager.approveEditRequest(${request.id})">Approve</button>
                        <button class="btn btn-sm btn-danger" onclick="taskManager.denyEditRequest(${request.id})">Deny</button>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Approve edit request
    approveEditRequest(requestId) {
        const request = this.editRequests.find(r => r.id === requestId);
        if (!request) return;

        request.status = 'approved';
        request.approvals.admin = this.currentUser.id;
        request.approvals.creator = this.currentUser.id; // Admin can approve on behalf of creator
        
        // Unlock the task for editing
        const task = this.tasks.find(t => t.id === request.task_id);
        if (task) {
            task.status = 'In Progress'; // Change status to allow editing
        }

        this.saveData();
        this.loadEditRequests();
        this.showAlert('Edit request approved', 'success');
    }

    // Deny edit request
    denyEditRequest(requestId) {
        const request = this.editRequests.find(r => r.id === requestId);
        if (!request) return;

        request.status = 'denied';
        this.saveData();
        this.loadEditRequests();
        this.showAlert('Edit request denied', 'info');
    }

    // Show alert message
    showAlert(message, type) {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        // Insert alert at the top of the current visible section
        const visibleSection = document.querySelector('.content-section:not([style*="display: none"])');
        if (visibleSection) {
            visibleSection.insertBefore(alertDiv, visibleSection.firstChild);
        } else {
            // If no visible section, show at top of body
            document.body.insertBefore(alertDiv, document.body.firstChild);
        }
        
        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 5000);
    }
}

// Initialize the application
const taskManager = new TaskManager();