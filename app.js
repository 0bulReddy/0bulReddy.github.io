// Civil Engineering Task Management Dashboard (client-side, in-memory)
// Strictly no localStorage / cookies used – data lives in memory for demo purposes only.

class TaskManager {
    constructor() {
        this.currentUser = null;
        this.users = [];
        this.tasks = [];
        this.charts = {};
        this.calendar = null;
        this.bcryptReady = false;
        this.taskModal = undefined;
        this.createUserModal = undefined;
        this.init();
    }

    /* -------------------------------------------------- INIT */
    async init() {
        await this.waitForBcrypt();
        this.loadSampleData();
        this.cacheElements();
        this.setupEventListeners();
        this.taskModal = new bootstrap.Modal(document.getElementById('taskModal'));
        this.createUserModal = new bootstrap.Modal(document.getElementById('createUserModal'));
        this.showLoginPage(); // default page
    }

    async waitForBcrypt() {
        return new Promise((resolve) => {
            if (typeof bcrypt !== 'undefined') {
                this.bcryptReady = true;
                resolve();
            } else {
                const interval = setInterval(() => {
                    if (typeof bcrypt !== 'undefined') {
                        this.bcryptReady = true;
                        clearInterval(interval);
                        resolve();
                    }
                }, 100);
                setTimeout(() => {
                    clearInterval(interval);
                    resolve();
                }, 3000);
            }
        });
    }

    /* -------------------------------------------------- SAMPLE DATA (in-memory only) */
    loadSampleData() {
        const sampleUsers = [
            { id: 1, username: 'admin', password: 'admin123', email: 'admin@civilengineering.com', role: 'admin', created_date: '2025-01-01', last_login: '2025-07-03' },
            { id: 2, username: 'john_engineer', password: 'password123', email: 'john@civilengineering.com', role: 'user', created_date: '2025-01-15', last_login: '2025-07-02' },
            { id: 3, username: 'sarah_supervisor', password: 'securepass', email: 'sarah@civilengineering.com', role: 'user', created_date: '2025-02-01', last_login: '2025-07-01' }
        ].map(u => ({ ...u, password_hash: this.hashPassword(u.password) }));

        const sampleTasks = [
            { id: 1, user_id: 2, assigned_to: 2, title: 'Foundation Inspection', description: 'Inspect foundation work for Building A compliance with structural requirements', start_date: '2025-07-01', end_date: '2025-07-05', priority: 'High', status: 'In Progress', created_date: '2025-06-28', updated_date: '2025-07-02' },
            { id: 2, user_id: 2, assigned_to: 3, title: 'Steel Frame Quality Check', description: 'Quality assurance for steel frame installation phase 2', start_date: '2025-07-08', end_date: '2025-07-12', priority: 'Medium', status: 'Not Started', created_date: '2025-06-30', updated_date: '2025-06-30' },
            { id: 3, user_id: 3, assigned_to: 3, title: 'Concrete Pour Supervision', description: 'Supervise concrete pouring for Level 3 slab', start_date: '2025-06-25', end_date: '2025-06-30', priority: 'High', status: 'Completed', created_date: '2025-06-20', updated_date: '2025-06-30' },
            { id: 4, user_id: 3, assigned_to: 2, title: 'Site Safety Audit', description: 'Weekly safety audit and compliance check', start_date: '2025-07-15', end_date: '2025-07-15', priority: 'High', status: 'Not Started', created_date: '2025-07-01', updated_date: '2025-07-01' }
        ];
        this.users = sampleUsers;
        this.tasks = sampleTasks;
    }

    /* -------------------------------------------------- UTIL */
    hashPassword(password) {
        return this.bcryptReady ? bcrypt.hashSync(password, 10) : btoa(password);
    }

    comparePassword(password, hash) {
        return this.bcryptReady ? bcrypt.compareSync(password, hash) : btoa(password) === hash;
    }

    getNextId(arr) {
        return arr.length ? Math.max(...arr.map(i => i.id)) + 1 : 1;
    }

    priorityColor(priority) {
        switch (priority) {
            case 'High': return '#DB4545';
            case 'Medium': return '#D2BA4C';
            case 'Low': return '#5D878F';
            default: return '#5D878F';
        }
    }

    /* -------------------------------------------------- CACHE DOM */
    cacheElements() {
        this.dom = {
            loginPage: document.getElementById('loginPage'),
            registerPage: document.getElementById('registerPage'),
            dashboard: document.getElementById('dashboard'),
            sectionTitle: document.getElementById('sectionTitle'),
            tasksList: document.getElementById('tasksList'),
            allTasksList: document.getElementById('allTasksList'),
            usersTable: document.getElementById('usersTable'),
            calendarEl: document.getElementById('calendar')
        };
    }

    /* -------------------------------------------------- EVENT LISTENERS */
    setupEventListeners() {
        // Auth
        document.getElementById('loginForm').addEventListener('submit', e => this.handleLogin(e));
        document.getElementById('registerForm').addEventListener('submit', e => this.handleRegister(e));
        document.getElementById('showRegister').addEventListener('click', e => { e.preventDefault(); this.showRegisterPage(); });
        document.getElementById('showLogin').addEventListener('click', e => { e.preventDefault(); this.showLoginPage(); });
        document.getElementById('logoutBtn').addEventListener('click', () => this.handleLogout());

        // Nav items
        document.querySelectorAll('.nav-item').forEach(item => item.addEventListener('click', e => this.handleNavigation(e)));

        // Tasks
        document.getElementById('addTaskBtn').addEventListener('click', () => this.showTaskModal());
        document.getElementById('saveTaskBtn').addEventListener('click', () => this.saveTask());
        document.getElementById('taskForm').addEventListener('submit', e => e.preventDefault());
        document.getElementById('statusFilter').addEventListener('change', () => this.filterTasks());
        document.getElementById('priorityFilter').addEventListener('change', () => this.filterTasks());
        document.getElementById('searchTasks').addEventListener('input', () => this.filterTasks());

        // Profile
        document.getElementById('profileForm').addEventListener('submit', e => this.updateProfile(e));
        document.getElementById('changePasswordForm').addEventListener('submit', e => this.changePassword(e));

        // Admin create user
        document.getElementById('createUserBtn').addEventListener('click', () => {
            document.getElementById('createUserForm').reset();
            this.createUserModal.show();
        });
        document.getElementById('saveNewUserBtn').addEventListener('click', () => this.saveNewUser());
        document.getElementById('createUserForm').addEventListener('submit', e => e.preventDefault());
    }

    /* -------------------------------------------------- AUTH */
    handleLogin(e) {
        e.preventDefault();
        const username = document.getElementById('loginUsername').value.trim();
        const password = document.getElementById('loginPassword').value;
        const user = this.users.find(u => u.username === username);
        if (!user || !this.comparePassword(password, user.password_hash)) {
            this.showAlert('Invalid username or password', 'danger');
            return;
        }
        user.last_login = new Date().toISOString().split('T')[0];
        this.currentUser = user;
        this.showDashboard();
        this.showAlert('Login successful', 'success');
    }

    handleRegister(e) {
        e.preventDefault();
        const username = document.getElementById('registerUsername').value.trim();
        const email = document.getElementById('registerEmail').value.trim();
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        if (!username || !email || !password || !confirmPassword) { this.showAlert('Please fill in all fields', 'danger'); return; }
        if (password !== confirmPassword) { this.showAlert('Passwords do not match', 'danger'); return; }
        if (this.users.some(u => u.username === username)) { this.showAlert('Username already exists', 'danger'); return; }
        if (this.users.some(u => u.email === email)) { this.showAlert('Email already registered', 'danger'); return; }
        const newUser = { id: this.getNextId(this.users), username, email, role: 'user', created_date: new Date().toISOString().split('T')[0], last_login: new Date().toISOString().split('T')[0], password_hash: this.hashPassword(password) };
        this.users.push(newUser);
        this.showAlert('Registration successful! Please login.', 'success');
        this.showLoginPage();
    }

    handleLogout() {
        this.currentUser = null;
        this.showLoginPage();
        this.showAlert('Logged out successfully', 'info');
    }

    /* -------------------------------------------------- PAGE DISPLAY */
    showLoginPage() {
        this.dom.loginPage.classList.remove('d-none');
        this.dom.registerPage.classList.add('d-none');
        this.dom.dashboard.classList.add('d-none');
        document.getElementById('loginForm').reset();
    }

    showRegisterPage() {
        this.dom.loginPage.classList.add('d-none');
        this.dom.registerPage.classList.remove('d-none');
        this.dom.dashboard.classList.add('d-none');
        document.getElementById('registerForm').reset();
    }

    showDashboard() {
        this.dom.loginPage.classList.add('d-none');
        this.dom.registerPage.classList.add('d-none');
        this.dom.dashboard.classList.remove('d-none');
        // Set sidebar admin visibility
        document.querySelectorAll('.admin-only').forEach(el => el.classList.toggle('d-none', this.currentUser.role !== 'admin'));
        // Welcome info
        document.getElementById('userWelcome').textContent = `Welcome, ${this.currentUser.username}!`;
        const roleBadge = document.getElementById('userRole');
        roleBadge.textContent = this.currentUser.role.charAt(0).toUpperCase() + this.currentUser.role.slice(1);
        roleBadge.className = `badge ${this.currentUser.role === 'admin' ? 'bg-warning' : 'bg-primary'}`;
        // Reset nav active to overview
        document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
        document.querySelector('.nav-item[data-section="overview"]').classList.add('active');
        // Hide all content sections then show overview
        document.querySelectorAll('.content-section').forEach(sec => sec.classList.add('d-none'));
        document.getElementById('overviewSection').classList.remove('d-none');
        this.dom.sectionTitle.textContent = 'Dashboard Overview';
        this.showOverview();
    }

    /* -------------------------------------------------- NAVIGATION */
    handleNavigation(e) {
        e.preventDefault();
        const target = e.currentTarget;
        const section = target.dataset.section;
        // Update active nav
        document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
        target.classList.add('active');
        // Hide all content sections
        document.querySelectorAll('.content-section').forEach(sec => sec.classList.add('d-none'));
        // Show selected section
        document.getElementById(`${section}Section`).classList.remove('d-none');
        // Update title
        const titles = { overview: 'Dashboard Overview', tasks: 'My Tasks', schedule: 'Project Schedule', profile: 'Profile Management', admin: 'Admin Panel' };
        this.dom.sectionTitle.textContent = titles[section] || 'Dashboard';
        // Load section specific data
        if (section === 'overview') this.showOverview();
        if (section === 'tasks') this.showTasks();
        if (section === 'profile') this.showProfile();
        if (section === 'admin') this.showAdmin();
        if (section === 'schedule') this.renderCalendar();
    }

    /* -------------------------------------------------- OVERVIEW */
    showOverview() {
        const tasks = this.visibleTasks();
        const stats = {
            total: tasks.length,
            pending: tasks.filter(t => t.status === 'Not Started').length,
            inProgress: tasks.filter(t => t.status === 'In Progress').length,
            completed: tasks.filter(t => t.status === 'Completed').length
        };
        document.getElementById('totalTasks').textContent = stats.total;
        document.getElementById('pendingTasks').textContent = stats.pending;
        document.getElementById('inProgressTasks').textContent = stats.inProgress;
        document.getElementById('completedTasks').textContent = stats.completed;
        this.renderCharts(tasks);
    }

    renderCharts(tasks) {
        this.renderStatusChart(tasks);
        this.renderPriorityChart(tasks);
    }

    renderStatusChart(tasks) {
        const ctx = document.getElementById('taskStatusChart').getContext('2d');
        if (this.charts.status) this.charts.status.destroy();
        const data = { 'Not Started': 0, 'In Progress': 0, 'Completed': 0 };
        tasks.forEach(t => { data[t.status] = (data[t.status] || 0) + 1; });
        this.charts.status = new Chart(ctx, {
            type: 'doughnut',
            data: { labels: Object.keys(data), datasets: [{ data: Object.values(data), backgroundColor: ['#FFC185', '#1FB8CD', '#B4413C'], borderWidth: 2, borderColor: '#fff' }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
        });
    }

    renderPriorityChart(tasks) {
        const ctx = document.getElementById('taskPriorityChart').getContext('2d');
        if (this.charts.priority) this.charts.priority.destroy();
        const data = { High: 0, Medium: 0, Low: 0 };
        tasks.forEach(t => { data[t.priority] = (data[t.priority] || 0) + 1; });
        this.charts.priority = new Chart(ctx, {
            type: 'bar',
            data: { labels: Object.keys(data), datasets: [{ label: 'Tasks', data: Object.values(data), backgroundColor: ['#DB4545', '#D2BA4C', '#5D878F'] }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } } }
        });
    }

    /* -------------------------------------------------- TASKS */
    visibleTasks() {
        if (!this.currentUser) return [];
        if (this.currentUser.role === 'admin') return this.tasks;
        return this.tasks.filter(t => t.user_id === this.currentUser.id || t.assigned_to === this.currentUser.id);
    }

    showTasks() {
        this.renderTasks(this.visibleTasks());
    }

    renderTasks(tasksArray) {
        if (!tasksArray.length) {
            this.dom.tasksList.innerHTML = `<div class="text-center py-5"><i class="fas fa-tasks fa-3x text-muted mb-3"></i><h4 class="text-muted">No tasks to display</h4></div>`;
            return;
        }
        this.dom.tasksList.innerHTML = tasksArray.map(t => this.taskCardHTML(t)).join('');
    }

    taskCardHTML(task) {
        const creator = this.users.find(u => u.id === task.user_id);
        const assignee = this.users.find(u => u.id === task.assigned_to);
        const canModify = this.currentUser.role === 'admin' || task.user_id === this.currentUser.id;
        return `
            <div class="task-card fade-in">
                <div class="task-card-header"><h5 class="task-title">${task.title}</h5><div class="d-flex gap-2"><span class="priority-badge priority-${task.priority.toLowerCase()}">${task.priority}</span><span class="status-badge status-${task.status.toLowerCase().replace(/\s/g,'-')}">${task.status}</span></div></div>
                <div class="task-card-body">
                    <p class="task-description">${task.description}</p>
                    <div class="task-meta">
                        <div class="task-meta-item"><i class="fas fa-calendar-alt"></i><span>${task.start_date} - ${task.end_date}</span></div>
                        <div class="task-meta-item"><i class="fas fa-user"></i><span>Creator: ${creator ? creator.username : 'Unknown'}</span></div>
                        <div class="task-meta-item"><i class="fas fa-user-check"></i><span>Assignee: ${assignee ? assignee.username : 'Unassigned'}</span></div>
                        <div class="task-meta-item"><i class="fas fa-clock"></i><span>Updated: ${task.updated_date}</span></div>
                    </div>
                </div>
                ${canModify ? `<div class="task-actions"><button class="btn btn-sm btn-primary" onclick="taskManager.editTask(${task.id})"><i class="fas fa-edit"></i> Edit</button><button class="btn btn-sm btn-danger" onclick="taskManager.deleteTask(${task.id})"><i class="fas fa-trash"></i> Delete</button></div>` : ''}
            </div>`;
    }

    filterTasks() {
        const status = document.getElementById('statusFilter').value;
        const priority = document.getElementById('priorityFilter').value;
        const query = document.getElementById('searchTasks').value.toLowerCase();
        let tasks = this.visibleTasks();
        if (status) tasks = tasks.filter(t => t.status === status);
        if (priority) tasks = tasks.filter(t => t.priority === priority);
        if (query) tasks = tasks.filter(t => t.title.toLowerCase().includes(query) || t.description.toLowerCase().includes(query));
        this.renderTasks(tasks);
    }

    populateAssigneeOptions(selectedId = null) {
        const select = document.getElementById('taskAssignee');
        select.innerHTML = this.users.map(u => `<option value="${u.id}" ${selectedId === u.id ? 'selected' : ''}>${u.username}</option>`).join('');
    }

    showTaskModal(task = null, prefillDate = null) {
        document.getElementById('taskForm').reset();
        if (task) {
            document.getElementById('taskModalTitle').textContent = 'Edit Task';
            document.getElementById('taskId').value = task.id;
            document.getElementById('taskTitle').value = task.title;
            document.getElementById('taskDescription').value = task.description;
            document.getElementById('taskStartDate').value = task.start_date;
            document.getElementById('taskEndDate').value = task.end_date;
            document.getElementById('taskPriority').value = task.priority;
            document.getElementById('taskStatus').value = task.status;
            this.populateAssigneeOptions(task.assigned_to);
        } else {
            document.getElementById('taskModalTitle').textContent = 'Add Task';
            document.getElementById('taskId').value = '';
            if (prefillDate) {
                document.getElementById('taskStartDate').value = prefillDate;
                document.getElementById('taskEndDate').value = prefillDate;
            }
            this.populateAssigneeOptions(this.currentUser.id);
        }
        this.taskModal.show();
    }

    saveTask() {
        const id = document.getElementById('taskId').value;
        const data = {
            title: document.getElementById('taskTitle').value.trim(),
            description: document.getElementById('taskDescription').value.trim(),
            start_date: document.getElementById('taskStartDate').value,
            end_date: document.getElementById('taskEndDate').value,
            priority: document.getElementById('taskPriority').value,
            status: document.getElementById('taskStatus').value,
            assigned_to: parseInt(document.getElementById('taskAssignee').value),
            updated_date: new Date().toISOString().split('T')[0]
        };
        if (!data.title || !data.description || !data.start_date || !data.end_date) {
            this.showAlert('Please complete all fields', 'danger');
            return;
        }
        if (id) {
            const idx = this.tasks.findIndex(t => t.id === parseInt(id));
            if (idx !== -1) {
                this.tasks[idx] = { ...this.tasks[idx], ...data };
                this.showAlert('Task updated', 'success');
            }
        } else {
            const newTask = { id: this.getNextId(this.tasks), user_id: this.currentUser.id, created_date: new Date().toISOString().split('T')[0], ...data };
            this.tasks.push(newTask);
            this.showAlert('Task created', 'success');
        }
        this.taskModal.hide();
        this.showTasks();
        this.showOverview();
        this.refreshCalendarEvents();
    }

    editTask(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) this.showTaskModal(task);
    }

    deleteTask(taskId) {
        if (!confirm('Are you sure you want to delete this task?')) return;
        this.tasks = this.tasks.filter(t => t.id !== taskId);
        this.showAlert('Task deleted', 'success');
        this.showTasks();
        this.showOverview();
        this.refreshCalendarEvents();
    }

    /* -------------------------------------------------- PROFILE */
    showProfile() {
        document.getElementById('profileUsername').value = this.currentUser.username;
        document.getElementById('profileEmail').value = this.currentUser.email;
        document.getElementById('profileRole').value = this.currentUser.role;
    }

    updateProfile(e) {
        e.preventDefault();
        const email = document.getElementById('profileEmail').value.trim();
        this.currentUser.email = email;
        const idx = this.users.findIndex(u => u.id === this.currentUser.id);
        if (idx !== -1) this.users[idx] = this.currentUser;
        this.showAlert('Profile updated', 'success');
    }

    changePassword(e) {
        e.preventDefault();
        const current = document.getElementById('currentPassword').value;
        const newPass = document.getElementById('newPassword').value;
        const confirm = document.getElementById('confirmNewPassword').value;
        if (!this.comparePassword(current, this.currentUser.password_hash)) { this.showAlert('Current password incorrect', 'danger'); return; }
        if (newPass !== confirm) { this.showAlert('New passwords do not match', 'danger'); return; }
        this.currentUser.password_hash = this.hashPassword(newPass);
        this.showAlert('Password changed', 'success');
        document.getElementById('changePasswordForm').reset();
    }

    /* -------------------------------------------------- ADMIN */
    showAdmin() {
        if (this.currentUser.role !== 'admin') { this.showAlert('Access denied', 'danger'); return; }
        this.renderUsersTable();
        this.renderAllTasks();
    }

    renderUsersTable() {
        this.dom.usersTable.innerHTML = this.users.map(u => {
            const taskCount = this.tasks.filter(t => t.user_id === u.id).length;
            const isSelf = u.id === this.currentUser.id;
            return `<tr><td>${u.username}</td><td>${u.email}</td><td><span class="badge ${u.role === 'admin' ? 'bg-warning' : 'bg-primary'}">${u.role}</span></td><td>${taskCount}</td><td>${u.last_login}</td><td>${isSelf ? '<span class="text-muted">Current</span>' : `<button class="btn btn-sm btn-warning" onclick="taskManager.toggleUserRole(${u.id})">${u.role === 'admin' ? 'Demote' : 'Promote'}</button> <button class="btn btn-sm btn-danger" onclick="taskManager.deleteUser(${u.id})">Delete</button>`}</td></tr>`;
        }).join('');
    }

    renderAllTasks() {
        this.dom.allTasksList.innerHTML = this.tasks.map(t => this.taskCardHTML(t)).join('');
    }

    toggleUserRole(userId) {
        const user = this.users.find(u => u.id === userId);
        if (user) {
            user.role = user.role === 'admin' ? 'user' : 'admin';
            this.showAlert(`User role updated to ${user.role}`, 'success');
            this.renderUsersTable();
        }
    }

    deleteUser(userId) {
        if (!confirm('Delete user and their tasks?')) return;
        this.users = this.users.filter(u => u.id !== userId);
        this.tasks = this.tasks.filter(t => t.user_id !== userId && t.assigned_to !== userId);
        this.showAlert('User deleted', 'success');
        this.renderUsersTable();
        this.renderAllTasks();
        this.refreshCalendarEvents();
    }

    saveNewUser() {
        const username = document.getElementById('newUsername').value.trim();
        const email = document.getElementById('newEmail').value.trim();
        const password = document.getElementById('newPassword').value;
        const role = document.getElementById('newRole').value;
        if (!username || !email || !password) { this.showAlert('Fill all fields', 'danger'); return; }
        if (this.users.some(u => u.username === username)) { this.showAlert('Username exists', 'danger'); return; }
        if (this.users.some(u => u.email === email)) { this.showAlert('Email exists', 'danger'); return; }
        const newUser = { id: this.getNextId(this.users), username, email, role, created_date: new Date().toISOString().split('T')[0], last_login: '-', password_hash: this.hashPassword(password) };
        this.users.push(newUser);
        this.showAlert('User created', 'success');
        this.createUserModal.hide();
        this.renderUsersTable();
        this.populateAssigneeOptions(); // update possible assignees
    }

    /* -------------------------------------------------- SCHEDULE / CALENDAR */
    renderCalendar() {
        if (!this.calendar) {
            this.calendar = new FullCalendar.Calendar(this.dom.calendarEl, {
                initialView: 'dayGridMonth',
                height: 'auto',
                selectable: true,
                dateClick: info => this.handleDateClick(info),
                eventColor: '#2196F3'
            });
            this.calendar.render();
        }
        this.refreshCalendarEvents();
    }

    refreshCalendarEvents() {
        if (!this.calendar) return;
        this.calendar.removeAllEvents();
        const events = this.visibleTasks().map(t => ({
            id: t.id,
            title: t.title,
            start: t.start_date,
            // FullCalendar treats end as exclusive for all-day events; add 1 day for multi-day events
            end: this.addDays(t.end_date, 1),
            backgroundColor: this.priorityColor(t.priority),
            borderColor: this.priorityColor(t.priority)
        }));
        events.forEach(ev => this.calendar.addEvent(ev));
    }

    addDays(dateStr, days) {
        const date = new Date(dateStr);
        date.setDate(date.getDate() + days);
        return date.toISOString().split('T')[0];
    }

    handleDateClick(info) {
        // Quick assignment modal
        this.showTaskModal(null, info.dateStr);
    }

    /* -------------------------------------------------- ALERTS */
    showAlert(message, type = 'info') {
        const container = document.getElementById('alertContainer');
        const id = 'alert-' + Date.now();
        const div = document.createElement('div');
        div.id = id;
        div.className = `alert alert-${type} alert-dismissible fade show`;
        div.innerHTML = `${message}<button type="button" class="btn-close" data-bs-dismiss="alert"></button>`;
        container.appendChild(div);
        setTimeout(() => { const el = document.getElementById(id); if (el) el.remove(); }, 5000);
    }
}

// Instantiate and expose globally
const taskManager = new TaskManager();
window.taskManager = taskManager;