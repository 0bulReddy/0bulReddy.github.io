# Civil Engineering Task Management Dashboard - Setup & Deployment Guide

## Overview
This is a comprehensive multi-user task management application designed specifically for civil engineering projects. It features secure user authentication, role-based access control, and complete task management capabilities - all deployable on GitHub Pages as a static site.

## Key Features

### 🔐 Authentication System
- **Secure Login/Registration**: Password hashing with bcryptjs
- **Role-Based Access**: Admin and regular user roles
- **Session Management**: Persistent sessions with localStorage
- **Security Features**: Input validation, XSS protection, session timeout

### 👥 Multi-User Support
- **User Management**: Admin can manage all users and their roles
- **Personal Dashboards**: Each user has their own task dashboard
- **Shared Resources**: Admins can view and manage all tasks across users

### 📊 Admin Dashboard Features
- **User Overview**: View all registered users and their details
- **Global Task Management**: See and manage tasks from all users
- **Role Management**: Promote users to admin or demote to regular users
- **User Activity**: Monitor last login dates and user activity
- **Data Export**: Download user and task data as CSV files

### ✅ Task Management Features
- **CRUD Operations**: Create, read, update, delete tasks
- **Status Tracking**: Not Started, In Progress, Completed
- **Priority Levels**: High, Medium, Low with visual indicators
- **Date Management**: Start dates, end dates, duration calculation
- **Filtering**: Filter by status, priority, and date ranges
- **Visual Dashboard**: Charts showing task distribution and progress

## Demo Credentials

### Admin User
- **Username**: `admin`
- **Password**: `admin123`
- **Capabilities**: Full access to all features including user management

### Regular Users
1. **Username**: `john_engineer` | **Password**: `password123`
2. **Username**: `sarah_supervisor` | **Password**: `securepass`

## GitHub Pages Deployment Guide

### Step 1: Repository Setup
1. Create a new GitHub repository for your project
2. Clone the repository to your local machine:
   ```bash
   git clone https://github.com/yourusername/your-repo-name.git
   cd your-repo-name
   ```

### Step 2: File Structure Setup
Create the following file structure in your repository:
```
your-repo-name/
├── index.html          # Main application file
├── style.css           # Application styles
├── app.js             # Application logic
└── README.md          # Documentation (optional)
```

### Step 3: Copy Application Files
Copy the generated application files (`index.html`, `style.css`, `app.js`) to your repository root directory.

### Step 4: Commit and Push
```bash
git add .
git commit -m "Add civil engineering task management dashboard"
git push origin main
```

### Step 5: Enable GitHub Pages
1. Go to your repository on GitHub
2. Click on **Settings** tab
3. Scroll down to **Pages** section
4. Under **Source**, select "Deploy from a branch"
5. Choose **main** branch and **/ (root)** directory
6. Click **Save**
7. Your application will be available at: `https://yourusername.github.io/your-repo-name/`

## Local Development Setup

### Prerequisites
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Basic text editor or IDE
- Local web server (optional but recommended)

### Running Locally
1. Download the application files
2. Open `index.html` in a web browser directly, or
3. Use a local development server:

#### Option 1: Python Server
```bash
# Python 3
python -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000
```

#### Option 2: Node.js Server
```bash
# Install globally
npm install -g http-server

# Run server
http-server -p 8000
```

#### Option 3: VS Code Live Server
- Install "Live Server" extension in VS Code
- Right-click on `index.html` and select "Open with Live Server"

## Application Architecture

### Data Storage
- **Users**: Stored in localStorage as `ce_users`
- **Tasks**: Stored in localStorage as `ce_tasks`
- **Sessions**: Managed in localStorage as `ce_current_user`

### Security Implementation
- **Password Hashing**: Using bcryptjs with salt rounds of 10
- **Session Management**: Automatic logout after inactivity
- **Input Validation**: Client-side validation for all forms
- **XSS Protection**: Sanitized data display

### Technology Stack
- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **UI Framework**: Bootstrap 5.3.0
- **Icons**: Font Awesome 6.0
- **Charts**: Chart.js 4.4.0
- **Security**: bcryptjs 2.4.3

## User Guide

### For Regular Users
1. **Login**: Use your credentials to access the dashboard
2. **Dashboard**: View your task summary and statistics
3. **My Tasks**: Create, edit, and manage your personal tasks
4. **Profile**: Update your account information
5. **Logout**: Securely end your session

### For Admin Users
1. **Admin Dashboard**: Access comprehensive user and task analytics
2. **User Management**: 
   - View all registered users
   - Promote/demote user roles
   - Delete user accounts
3. **Global Tasks**: View and manage tasks from all users
4. **Data Export**: Download user and task data
5. **System Overview**: Monitor application usage and activity

## Advanced Configuration

### Customizing User Roles
Add new roles by modifying the `role` validation in `app.js`:
```javascript
const validRoles = ['admin', 'user', 'supervisor', 'manager'];
```

### Modifying Task Priorities
Update priority levels in the task creation form:
```javascript
const priorities = ['Low', 'Medium', 'High', 'Critical'];
```

### Adding New Task Statuses
Extend task statuses in the application logic:
```javascript
const statuses = ['Not Started', 'In Progress', 'On Hold', 'Completed', 'Cancelled'];
```

## Security Considerations

### Client-Side Security
- Passwords are hashed using bcrypt with salt
- Session tokens are managed securely
- Input validation prevents basic XSS attacks
- No sensitive data is stored in plain text

### Limitations
- This is a client-side application suitable for demo and small team use
- For production environments, consider server-side authentication
- Data is stored locally and not shared between devices
- No real-time collaboration features

## Troubleshooting

### Common Issues

#### 1. Application Won't Load
- Ensure all files are in the same directory
- Check browser console for JavaScript errors
- Verify CDN links are accessible

#### 2. Login Not Working
- Clear browser localStorage: `localStorage.clear()`
- Try the demo credentials provided above
- Check network connectivity for bcryptjs CDN

#### 3. Tasks Not Saving
- Verify localStorage is enabled in your browser
- Check if you have sufficient storage quota
- Try refreshing the page and logging in again

#### 4. GitHub Pages Not Updating
- Wait 5-10 minutes for deployment
- Check GitHub Actions tab for build status
- Ensure `index.html` is in the repository root

### Browser Compatibility
- Chrome 60+
- Firefox 60+
- Safari 12+
- Edge 79+

## Data Management

### Backup Data
Export your data before making changes:
```javascript
// In browser console
console.log('Users:', JSON.parse(localStorage.getItem('ce_users')));
console.log('Tasks:', JSON.parse(localStorage.getItem('ce_tasks')));
```

### Reset Application
To start fresh:
```javascript
// In browser console
localStorage.removeItem('ce_users');
localStorage.removeItem('ce_tasks');
localStorage.removeItem('ce_current_user');
location.reload();
```

## Contributing

### Code Structure
- `index.html`: Main application structure and UI components
- `style.css`: Professional styling with civil engineering theme
- `app.js`: Application logic, authentication, and data management

### Adding Features
1. Follow the existing code patterns
2. Maintain security practices for authentication
3. Update localStorage schema carefully
4. Test thoroughly before deployment

## License and Usage

This application is designed for educational and small business use. For production environments with sensitive data, consider implementing server-side authentication and database storage.

## Support

For issues and questions:
1. Check the troubleshooting section above
2. Review browser console for error messages
3. Verify all CDN dependencies are loading correctly
4. Test with the provided demo credentials

---

**Happy Project Managing!** 🏗️👷‍♂️📊