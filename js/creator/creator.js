// Global variable to hold the logged-in user's ID for password updates
let currentUserId = null;

document.addEventListener("DOMContentLoaded", () => {
    fetchDashboardData();
    setupPasswordForm();
});

/**
 * Fetch all creator dashboard stats & profile info from backend
 */
async function fetchDashboardData() {
    try {
        const response = await fetch('/api/creator/creator.php');

        // Guard Check: Redirect unauthorized/non-creator users to guest homepage
        if (response.status === 401 || response.status === 403) {
            window.location.href = "../guest/home.html";
            return;
        }

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();

        // Populate UI if response is successful
        if (data.success) {
            if (data.user) updateUserProfile(data.user);
            if (data.stats) updateStats(data.stats);
            if (data.activities) updateActivityLog(data.activities);
            if (data.recent_projects) updateRecentProjects(data.recent_projects);
        } else {
            console.error("Access error:", data.error);
            window.location.href = "../guest/home.html";
        }
    } catch (error) {
        console.error("Failed to load dashboard data:", error);
    }
}

/**
 * Update Dynamic Sidebar / Header User Profile & store currentUserId
 */
function updateUserProfile(user) {
    // Store user ID for password changes
    currentUserId = user.user_id || user.id || null;

    const nameEl = document.getElementById('user-name');
    const emailEl = document.getElementById('user-email');
    const initialsEl = document.getElementById('user-initials');

    if (nameEl) nameEl.textContent = user.name || 'Jane Doe';
    if (emailEl) emailEl.textContent = user.email || 'admin@company.com';
    if (initialsEl) initialsEl.textContent = user.initials || 'JD';
}

/**
 * Update Metric Summary Cards
 */
function updateStats(stats) {
    setElementText('stat-projects', stats.projects ?? 0);
    setElementText('stat-locations', stats.locations ?? 0);

    setElementText('stat-indoor-species', stats.indoor_species ?? 0);
    setElementText('stat-indoor-qty', stats.indoor_quantity ?? 0);

    setElementText('stat-outdoor-species', stats.outdoor_species ?? 0);
    setElementText('stat-outdoor-qty', stats.outdoor_quantity ?? 0);
}

/**
 * Render User Activity Log Timeline
 */
function updateActivityLog(activities) {
    const container = document.querySelector('.relative.pl-6.space-y-6');
    if (!container) return;

    container.innerHTML = '';
    
    if (!activities || activities.length === 0) {
        container.innerHTML = `
            <div class="relative group">
                <span class="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-white group-hover:scale-110 transition-transform"></span>
                <p class="text-sm font-medium text-gray-800"><span class="font-semibold text-gray-900">System</span></p>
                <p class="text-xs text-gray-500 mt-0.5">No recent activity found.</p>
            </div>`;
        return;
    }

    const colors = ['bg-emerald-500', 'bg-indigo-500', 'bg-blue-500', 'bg-amber-500'];

    activities.forEach((activity, index) => {
        const colorClass = colors[index % colors.length];
        const timeStr = timeAgo(activity.created_at);
        
        const html = `
            <div class="relative group">
                <span class="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full ${colorClass} ring-4 ring-white group-hover:scale-110 transition-transform"></span>
                <p class="text-sm font-medium text-gray-800"><span class="font-semibold text-gray-900">${escapeHtml(activity.username || 'System')}</span></p>
                <p class="text-xs text-gray-500 mt-0.5">${escapeHtml(activity.action_type || 'Performed action')} on ${escapeHtml(activity.table_name || 'record')}</p>
                <span class="text-[10px] font-semibold text-gray-400 mt-1 block">${timeStr}</span>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', html);
    });
}

/**
 * Render Recent Projects Table (Limited to latest 3)
 */
function updateRecentProjects(projects) {
    const container = document.querySelector('tbody.divide-y');
    if (!container) return;

    container.innerHTML = '';

    if (!projects || projects.length === 0) {
        container.innerHTML = `<tr><td colspan="4" class="px-6 py-4 text-center text-sm text-gray-500">No active projects found.</td></tr>`;
        return;
    }

    projects.forEach(project => {
        const html = `
            <tr class="hover:bg-gray-50 transition-colors">
                <td class="px-6 py-4 font-semibold text-gray-900">${escapeHtml(project.project_name || 'Untitled Project')}</td>
                <td class="px-6 py-4">${escapeHtml(project.location || 'Unknown Location')}</td>
                <td class="px-6 py-4">${getStatusBadge(project.status)}</td>
                <td class="px-6 py-4 text-right">
                    <a href="../projects/edit-project.php?id=${escapeHtml(project.id || '')}" class="text-indigo-600 hover:text-indigo-900 font-medium text-xs">Edit</a>
                </td>
            </tr>
        `;
        container.insertAdjacentHTML('beforeend', html);
    });
}

// ==========================================
// CHANGE PASSWORD HANDLING
// ==========================================

/**
 * Setup Event Listener for Password Form
 */
function setupPasswordForm() {
    const passwordForm = document.getElementById("password-form");
    if (passwordForm) {
        passwordForm.addEventListener("submit", handlePasswordChange);
    }
}

/**
 * Handle Change Password Submit
 */
async function handlePasswordChange(event) {
    event.preventDefault();

    const currentPasswordInput = document.getElementById("current-password");
    const newPasswordInput = document.getElementById("new-password");
    const confirmPasswordInput = document.getElementById("confirm-password");

    const currentPassword = currentPasswordInput.value;
    const newPassword = newPasswordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    // 1. Validation: Match check
    if (newPassword !== confirmPassword) {
        showPasswordMessage("New password and confirmation password do not match.", "error");
        return;
    }

    // 2. Validation: Strength check
    if (!isValidPassword(newPassword)) {
        showPasswordMessage(
            "New password must be at least 8 characters long, with at least one uppercase letter and one special character.",
            "error"
        );
        return;
    }

    // 3. Ensure user_id is loaded
    if (!currentUserId) {
        showPasswordMessage("Unable to identify current user. Please reload the page.", "error");
        return;
    }

    // 4. Send request to PHP API
    try {
        const response = await fetch('../../api/creator/dashboard.php', {
            method: "POST",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                action: "change_password",
                user_id: currentUserId,
                current_password: currentPassword,
                new_password: newPassword
            })
        });

        const result = await response.json();

        if (response.ok && result.success) {
            showPasswordMessage(result.message || "Password updated successfully!", "success");
            document.getElementById("password-form").reset();
        } else {
            showPasswordMessage(result.error || result.message || "Failed to update password.", "error");
        }
    } catch (error) {
        console.error("Error changing password:", error);
        showPasswordMessage("Unable to process request. Please try again later.", "error");
    }
}

/**
 * Validates password strength (min 8 chars, 1 uppercase, 1 special char)
 */
function isValidPassword(password) {
    if (!password || typeof password !== "string") return false;
    const hasMinLength = password.length >= 8;
    const hasUppercase = /[A-Z]/.test(password);
    const hasSpecialChar = /[\W_]/.test(password);

    return hasMinLength && hasUppercase && hasSpecialChar;
}

/**
 * Displays a styled alert message inside the password form
 */
function showPasswordMessage(message, type) {
    const form = document.getElementById("password-form");
    let msgContainer = document.getElementById("password-message-container");

    if (!msgContainer) {
        msgContainer = document.createElement("div");
        msgContainer.id = "password-message-container";
        const fieldset = form.querySelector("fieldset");
        if (fieldset) {
            fieldset.insertBefore(msgContainer, fieldset.children[1]);
        } else {
            form.prepend(msgContainer);
        }
    }

    if (type === "success") {
        msgContainer.className = "p-3 text-sm rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 mb-4";
    } else {
        msgContainer.className = "p-3 text-sm rounded-lg bg-red-50 text-red-800 border border-red-200 mb-4";
    }

    msgContainer.textContent = message;
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

function setElementText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

function getStatusBadge(status) {
    const stat = (status || 'unknown').toLowerCase();
    if (stat === 'in progress') {
        return `<span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">In Progress</span>`;
    } else if (stat === 'completed') {
        return `<span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">Completed</span>`;
    } else if (stat === 'planning') {
        return `<span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">Planning</span>`;
    } else {
        return `<span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">${escapeHtml(status)}</span>`;
    }
}

function timeAgo(dateString) {
    if (!dateString) return 'Unknown time';
    
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";
    
    return "Just now";
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}