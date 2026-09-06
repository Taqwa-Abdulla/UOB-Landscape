// =============================================
// Creator Dashboard Script
// =============================================

// =============================================
// Functions calls and variables
// =============================================
let currentUserId = null;
let schedule = [];
let editingScheduleId = null;
const SCHEDULE_API_URL = '/api/users/schedule.php';

document.addEventListener('DOMContentLoaded', () => {
    initDashboard();
    setupLogoutButton();
    setupPasswordForm();
    loadRecipients();
    initNotifications();
    loadNotifications();
});

async function initDashboard() {
    await fetchDashboardData();
    await loadMessages();
    await loadSchedule();
    await loadAssigneeDropdown();
    await loadActivityLog();
    await loadRecentProjects();
}

// ==============================================================================
// Funtions to fetch creator dashboard, profile, stats, recent logs and projects
// ==============================================================================
async function fetchDashboardData() {
    try {
        const response = await fetch('/api/creator/creator.php');

        if (response.status === 401 || response.status === 403) {
            window.location.href = "../guest/home.html";
            return;
        }

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();

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

function updateUserProfile(user) {
    currentUserId = user.user_id || user.id || null;

    const nameEl = document.getElementById('user-name');
    const emailEl = document.getElementById('user-email');
    const initialsEl = document.getElementById('user-initials');

    if (nameEl) nameEl.textContent = user.name || 'Jane Doe';
    if (emailEl) emailEl.textContent = user.email || 'creator@company.com';
    if (initialsEl) initialsEl.textContent = user.initials || 'JD';
}

function updateStats(stats) {
    setElementText('stat-projects', stats.projects ?? 0);
    setElementText('stat-locations', stats.locations ?? 0);

    setElementText('stat-indoor-species', stats.indoor_species ?? 0);
    setElementText('stat-indoor-qty', stats.indoor_quantity ?? 0);

    setElementText('stat-outdoor-species', stats.outdoor_species ?? 0);
    setElementText('stat-outdoor-qty', stats.outdoor_quantity ?? 0);
}

async function loadActivityLog() {
    try {
        const response = await fetch('/api/creator/creator.php?action=activities');
        const data = await response.json();
        if (data && data.activities) {
            updateActivityLog(data.activities);
        }
    } catch (error) {
        const container = document.getElementById('activity-log-container');
        if (container && container.innerHTML.trim() === '') {
            container.innerHTML = '<p class="text-xs text-gray-500">No recent activity.</p>';
        }
    }
}

function updateActivityLog(activities) {
    const container = document.querySelector('.relative.pl-6.space-y-6');
    if (!container) return;

    container.innerHTML = '';

    if (!activities || activities.length === 0) {
        container.innerHTML = `
            <div class="relative group">
                <span class="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-blue-500 ring-4 ring-white group-hover:scale-110 transition-transform"></span>
                <p class="text-sm font-medium text-gray-800"><span class="font-semibold text-gray-900">System</span></p>
                <p class="text-xs text-gray-500 mt-0.5">No recent activity found.</p>
            </div>`;
        return;
    }

    const colors = ['bg-blue-500', 'bg-blue-500', 'bg-blue-500', 'bg-amber-500'];

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

async function loadRecentProjects() {
    try {
        const response = await fetch('/api/creator/creator.php?action=recent_projects');
        const data = await response.json();
        if (data && data.recent_projects) {
            updateRecentProjects(data.recent_projects);
        }
    } catch (error) {
        const container = document.getElementById('recent-projects-container');
        if (container && container.innerHTML.trim() === '') {
            container.innerHTML = '<tr><td colspan="3" class="px-6 py-4 text-center text-xs text-gray-500">No projects found.</td></tr>';
        }
    }
}

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
                    <a href="/site/creator/management/manage_projects.html?id=${escapeHtml(project.id || '')}" class="text-blue-600 hover:text-blue-900 font-medium text-xs">Edit</a>
                </td>
            </tr>
        `;
        container.insertAdjacentHTML('beforeend', html);
    });
}

// ==========================================
// Function for changing password
// ==========================================

function setupPasswordForm() {
    const passwordForm = document.getElementById("password-form");
    if (passwordForm) {
        passwordForm.addEventListener("submit", handlePasswordChange);
    }
}

async function handlePasswordChange(event) {
    event.preventDefault();

    const currentPasswordInput = document.getElementById("current-password");
    const newPasswordInput = document.getElementById("new-password");
    const confirmPasswordInput = document.getElementById("confirm-password");

    const currentPassword = currentPasswordInput.value;
    const newPassword = newPasswordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    if (newPassword !== confirmPassword) {
        showPasswordMessage("New password and confirmation password do not match.", "error");
        return;
    }

    if (!isValidPassword(newPassword)) {
        showPasswordMessage(
            "New password must be at least 8 characters long, with at least one uppercase letter and one special character.",
            "error"
        );
        return;
    }

    if (!currentUserId) {
        showPasswordMessage("Unable to identify current user. Please reload the page.", "error");
        return;
    }

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
// ===========================================================================
// Password validation functions
// ===========================================================================

function isValidPassword(password) {
    if (!password || typeof password !== "string") return false;
    const hasMinLength = password.length >= 8;
    const hasUppercase = /[A-Z]/.test(password);
    const hasSpecialChar = /[\W_]/.test(password);

    return hasMinLength && hasUppercase && hasSpecialChar;
}

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
        msgContainer.className = "p-3 text-sm rounded-lg bg-blue-50 text-blue-800 border border-blue-200 mb-4";
    } else {
        msgContainer.className = "p-3 text-sm rounded-lg bg-red-50 text-red-800 border border-red-200 mb-4";
    }

    msgContainer.textContent = message;
}

// ==========================================
// Notifications Functions
// ==========================================

async function loadNotifications() {
    try {
        const response = await fetch('/api/users/notifications.php');
        const result = await response.json();

        if (result.status === "success") {
            renderNotifications(result.data, result.unread_count);

            if (result.preferences) {
                applyPreferencesToUI(result.preferences);
            }
        }
    } catch (err) {
        console.error("Failed to load notifications:", err);
    }
}

function initNotificationPreferences() {
    const prefAll = document.getElementById('pref-all');
    const prefMute = document.getElementById('pref-mute');
    const specificCheckboxes = document.querySelectorAll('.specific-pref');

    if (!prefAll || !prefMute) return;

    prefAll.addEventListener('change', () => {
        if (prefAll.checked) {
            prefMute.checked = false;
            specificCheckboxes.forEach(cb => cb.checked = true);
        }
        updatePreferencesUIState();
        savePreferences();
    });

    prefMute.addEventListener('change', () => {
        if (prefMute.checked) {
            prefAll.checked = false;
            specificCheckboxes.forEach(cb => cb.checked = false);
        } else {
            prefAll.checked = true;
            specificCheckboxes.forEach(cb => cb.checked = true);
        }
        updatePreferencesUIState();
        savePreferences();
    });

    specificCheckboxes.forEach(cb => {
        cb.addEventListener('change', () => {
            prefAll.checked = false;
            prefMute.checked = false;
            updatePreferencesUIState();
            savePreferences();
        });
    });
}

function initNotifications() {
    const bellBtn = document.getElementById("header-bell-btn");
    const popup = document.getElementById("notification-popup");
    const settingsBtn = document.getElementById("notif-settings-btn");
    const settingsPanel = document.getElementById("notif-settings-panel");

    if (bellBtn && popup) {
        bellBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            popup.classList.toggle("hidden");
            if (settingsPanel) settingsPanel.classList.add("hidden");
        });
        document.addEventListener("click", (e) => {
            if (!popup.contains(e.target) && !bellBtn.contains(e.target)) {
                popup.classList.add("hidden");
                if (settingsPanel) settingsPanel.classList.add("hidden");
            }
        });
    }

    if (settingsBtn && settingsPanel) {
        settingsBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            settingsPanel.classList.toggle("hidden");
        });
    }

    initNotificationPreferences();
}

function renderNotifications(notifications, unreadCount) {
    const listContainer = document.getElementById("notificationList");
    const badge = document.getElementById("header-unread-badge") || document.getElementById("unreadBadge");

    if (!listContainer) {
        console.error("Notification list container element not found in DOM!");
        return;
    }

    if (badge) {
        badge.textContent = unreadCount;
        badge.className = unreadCount === 0
            ? "absolute top-1 right-1 bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full"
            : "absolute top-1 right-1 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full";
        badge.style.display = unreadCount > 0 ? 'inline-block' : 'none';
    }

    if (!notifications || notifications.length === 0) {
        listContainer.innerHTML = `<div class="p-4 text-sm text-gray-500 text-center">No notifications available.</div>`;
        return;
    }

    listContainer.innerHTML = "";

    notifications.forEach(notif => {
        const item = document.createElement("div");
        item.className = `p-3 text-xs cursor-pointer hover:bg-gray-50 transition border-b border-gray-100 ${notif.is_read ? 'text-gray-500 bg-white opacity-60' : 'font-semibold text-gray-900 bg-blue-50/40'}`;

        const formattedDate = new Date(notif.created_at).toLocaleString();

        item.innerHTML = `
            <div class="flex justify-between items-center mb-1">
                <span class="font-bold">${escapeHtml(notif.title)}</span>
                <span class="text-[10px] text-gray-400">${notif.created_at || formattedDate}</span>
            </div>
            <p class="truncate">${escapeHtml(notif.message)}</p>
        `;

        item.addEventListener("click", async () => {
            showNotifModal(notif.title, notif.message, notif.created_at || formattedDate);

            if (!notif.is_read) {
                await markNotificationAsRead(notif.notification_id);
                loadNotifications();
            }
        });

        listContainer.appendChild(item);
    });
}

function updatePreferencesUIState() {
    const prefAll = document.getElementById('pref-all');
    const prefMute = document.getElementById('pref-mute');
    const specificCheckboxes = document.querySelectorAll('.specific-pref');

    if (!prefAll || !prefMute) return;

    if (prefAll.checked) {
        specificCheckboxes.forEach(cb => {
            cb.checked = true;
            cb.disabled = true;
        });
    } else if (prefMute.checked) {
        specificCheckboxes.forEach(cb => {
            cb.checked = false;
            cb.disabled = true;
        });
    } else {
        specificCheckboxes.forEach(cb => {
            cb.disabled = false;
        });
    }
}

function applyPreferencesToUI(p) {
    const prefAll = document.getElementById('pref-all');
    const prefMute = document.getElementById('pref-mute');
    const specificCheckboxes = document.querySelectorAll('.specific-pref');

    if (!prefAll || !prefMute) return;

    prefAll.checked = p.receive_all;
    prefMute.checked = p.mute_all;

    specificCheckboxes.forEach(cb => {
        if (cb.value === 'system') cb.checked = p.notify_system;
        if (cb.value === 'updates') cb.checked = p.notify_updates;
    });

    updatePreferencesUIState();
}

function savePreferences() {
    const prefAll = document.getElementById('pref-all');
    const prefMute = document.getElementById('pref-mute');
    const systemCb = document.querySelector('.specific-pref[value="system"]');
    const updatesCb = document.querySelector('.specific-pref[value="updates"]');

    if (!prefAll || !prefMute) return;

    const payload = {
        action: 'save_preferences',
        receive_all: Boolean(prefAll.checked),
        mute_all: Boolean(prefMute.checked),
        notify_system: systemCb ? Boolean(systemCb.checked) : true,
        notify_updates: updatesCb ? Boolean(updatesCb.checked) : true
    };

    fetch('/api/users/notifications.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
        .then(res => res.json())
        .then(data => {
            if (data.status !== 'success') {
                console.error('Error saving preferences:', data.message);
            }
        })
        .catch(err => console.error('Network error saving preferences:', err));
}

function showNotifModal(title, message, dateStr) {
    const modalTitle = document.getElementById("modal-notif-title");
    const modalBody = document.getElementById("modal-notif-body");
    const modalDate = document.getElementById("modal-notif-date");
    const modalModal = document.getElementById("notif-detail-modal");
    const popup = document.getElementById("notification-popup");

    if (modalTitle) modalTitle.textContent = title;
    if (modalBody) modalBody.textContent = message;
    if (modalDate) modalDate.textContent = dateStr;
    if (modalModal) modalModal.classList.remove("hidden");
    if (popup) popup.classList.add("hidden");
}

function closeNotifModal() {
    const modalModal = document.getElementById("notif-detail-modal");
    if (modalModal) modalModal.classList.add("hidden");
}

async function markNotificationAsRead(id) {
    try {
        await fetch('/api/users/notifications.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'mark_read', notification_id: id })
        });
    } catch (err) {
        console.error("Error marking notification read:", err);
    }
}

async function clearAllNotifications() {
    if (!confirm("Are you sure you want to clear your notifications?")) return;
    try {
        const response = await fetch('/api/users/notifications.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'clear_all' })
        });
        const result = await response.json();
        if (result.status === "success") {
            loadNotifications();
        }
    } catch (err) {
        console.error("Error clearing notifications:", err);
    }
}
// ===========================================================================
// Helper function for notifications
// ===========================================================================
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
// ==========================================
// Messages Functions
// ==========================================

async function loadMessages() {
    const msgList = document.getElementById('messageList');
    if (!msgList) return;
    try {
        const res = await fetch('/api/users/message.php');
        const result = await res.json();
        const messages = result.data || [];

        if (!messages.length) {
            msgList.innerHTML = `<div class="p-4 text-sm text-gray-500 text-center">No messages available.</div>`;
            return;
        }
        msgList.innerHTML = messages.map(m => `
            <div class="p-3 bg-gray-50 rounded-lg border border-gray-100 flex items-center justify-between text-xs">
                <div>
                    <span class="font-semibold text-gray-800">${escapeHtml(m.sender_name)}:</span>
                    <p class="font-medium text-gray-700">${escapeHtml(m.subject)}</p>
                    <p class="text-gray-600 mt-0.5">${escapeHtml(m.body)}</p>
                </div>
                <button onclick="deleteMessage('${m.message_id}')" class="text-red-500 hover:text-red-700 font-bold px-2 py-1 text-sm">×</button>
            </div>
        `).join('');
    } catch {
        msgList.innerHTML = `<div class="p-4 text-sm text-gray-500 text-center">Failed to load messages.</div>`;
    }
}

async function handleMessageSubmit(event) {
    event.preventDefault();
    const recipient_id = document.getElementById('msg-recipient').value;
    const subject = document.getElementById('msg-subject') ? document.getElementById('msg-subject').value : 'Message';
    const body = document.getElementById('msg-body').value;

    await fetch('/api/users/message.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', recipient_id, subject, body })
    });
    document.getElementById('message-form').reset();
    loadMessages();
}

async function deleteMessage(id) {
    if (!confirm('Delete this message?')) return;
    const res = await fetch('/api/users/message.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', message_id: id })
    });
    const result = await res.json();
    if (!res.ok) alert(result.message || 'Permission denied.');
    loadMessages();
}

async function clearAllMessages() {
    if (!confirm('Clear all your messages?')) return;
    await fetch('/api/users/message.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clear_all' })
    });
    loadMessages();
}

// ==========================================
// Schedules functions
// ==========================================

async function loadSchedule() {
    try {
        const response = await fetch('/api/users/schedule.php');
        const result = await response.json();
        const container = document.getElementById('scheduleList');

        if (!result.success || !result.data || result.data.length === 0) {
            schedule = [];
            container.innerHTML = '<div class="p-4 text-sm text-gray-500 text-center col-span-2">No scheduled events found.</div>';
            return;
        }

        schedule = result.data;
        container.innerHTML = '';

        schedule.forEach(event => {
            let statusClass = 'bg-gray-100 text-gray-800';
            if (event.status === 'due_soon') statusClass = 'bg-yellow-100 text-yellow-800';
            else if (event.status === 'upcoming') statusClass = 'bg-blue-100 text-blue-800';
            else if (event.status === 'expired') statusClass = 'bg-red-100 text-red-800';
            else if (event.status === 'completed') statusClass = 'bg-green-100 text-green-800';

            const isOwner = (event.created_by == currentUserId);

            const card = document.createElement('div');
            card.className = "p-4 rounded-lg border border-gray-200 bg-white shadow-sm flex flex-col justify-between gap-2";
            card.innerHTML = `
                <div class="flex items-start justify-between">
                    <div>
                        <h4 class="font-bold text-xs text-gray-800">${escapeHtml(event.title)}</h4>
                        <span class="text-[10px] text-gray-500">From: ${event.start_time} <br>To: ${event.end_time}</span>
                    </div>
                    <span class="text-[10px] px-2 py-0.5 rounded-full font-semibold ${statusClass}">${ucFirst(event.status.replace('_', ' '))}</span>
                </div>
                ${event.description ? `<p class="text-xs text-gray-600">${escapeHtml(event.description)}</p>` : ''}
                <div class="flex items-center justify-between pt-2 border-t border-gray-100 text-[11px]">
                    <span class="text-gray-400">Type: ${ucFirst(event.event_type)}</span>
                    ${isOwner ? `
                        <div class="flex gap-2">
                            <button onclick='editEventById(${event.event_id})' class="text-blue-600 hover:underline cursor-pointer">Edit</button>
                            <button onclick="deleteEvent(${event.event_id})" class="text-red-500 hover:underline cursor-pointer">Delete</button>
                        </div>
                    ` : ''}
                </div>
            `;
            container.appendChild(card);
        });
    } catch (error) {
        console.error('Error loading schedule:', error);
    }
}

async function handleScheduleSubmit(event) {
    event.preventDefault();

    const eventId = document.getElementById('sched-id').value;
    const title = document.getElementById('sched-title').value;
    const description = document.getElementById('sched-desc').value;
    const startTime = document.getElementById('sched-start-date').value;
    const endTime = document.getElementById('sched-end-date').value;
    const eventType = document.getElementById('sched-priority').value;
    const isPersonal = document.getElementById('sched-is-personal').checked;
    const isCompleted = document.getElementById('sched-is-completed').checked;
    const assignedEmail = document.getElementById('sched-assigned-to').value.trim();

    if (startTime === endTime) {
        alert('Start time and end time cannot be identical.');
        return;
    }

    if (new Date(endTime) < new Date(startTime)) {
        alert('End date and time cannot be earlier than the start date and time.');
        return;
    }

    const payload = {
        action: eventId ? 'update' : 'create',
        event_id: eventId || null,
        title: title,
        description: description,
        start_time: startTime,
        end_time: endTime,
        event_type: eventType,
        is_personal: isPersonal,
        is_completed: isCompleted,
        assigned_to: assignedEmail || null
    };

    try {
        const response = await fetch('/api/users/schedule.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await response.json();

        if (result.success) {
            document.getElementById('schedule-form').reset();
            document.getElementById('sched-id').value = '';
            document.getElementById('sched-submit-btn').textContent = 'Save Event';
            loadSchedule();
        } else {
            alert(result.message || 'Operation failed.');
        }
    } catch (error) {
        console.error('Error submitting schedule:', error);
    }
}

function editEventById(eventId) {
    const e = schedule.find(s => s.event_id == eventId);
    if (!e || e.created_by != currentUserId) return;

    if (document.getElementById('sched-id')) document.getElementById('sched-id').value = e.event_id;
    document.getElementById('sched-title').value = e.title;
    document.getElementById('sched-start-date').value = e.start_time.replace(' ', 'T').slice(0, 16);
    document.getElementById('sched-end-date').value = e.end_time ? e.end_time.replace(' ', 'T').slice(0, 16) : '';
    document.getElementById('sched-priority').value = e.event_type;

    if (document.getElementById('sched-desc')) document.getElementById('sched-desc').value = e.description || '';

    const assignedToEl = document.getElementById('sched-assigned-to');
    if (assignedToEl) assignedToEl.value = e.assigned_email || '';

    const isPersonalEl = document.getElementById('sched-is-personal');
    if (isPersonalEl) isPersonalEl.checked = e.is_personal;

    const isCompletedEl = document.getElementById('sched-is-completed');
    if (isCompletedEl) isCompletedEl.checked = e.is_completed;

    const submitBtn = document.getElementById('sched-submit-btn');
    if (submitBtn) submitBtn.textContent = "Update Event";
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function deleteEvent(eventId) {
    if (!confirm('Are you sure you want to delete this event?')) return;

    try {
        const response = await fetch('/api/users/schedule.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'delete', event_id: eventId })
        });
        const result = await response.json();
        if (result.success) {
            loadSchedule();
        } else {
            alert(result.message || 'Failed to delete event.');
        }
    } catch (error) {
        console.error('Error deleting event:', error);
    }
}

async function clearMySchedule() {
    if (!confirm('Are you sure you want to clear your past schedule items?')) return;

    try {
        const response = await fetch('/api/users/schedule.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'clear_all' })
        });
        const result = await response.json();
        if (result.success) {
            loadSchedule();
        } else {
            alert(result.message || 'Failed to clear schedule.');
        }
    } catch (error) {
        console.error('Error clearing schedule:', error);
    }
}

function downloadSchedulePDF() {
    window.open('/api/users/schedule.php?action=download_pdf', '_blank');
}

function ucFirst(str) {
    return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}

async function loadAssigneeDropdown() {
    try {
        const response = await fetch('/api/users/schedule.php?action=get_users');
        const result = await response.json();
        const selectEl = document.getElementById('sched-assigned-to');

        if (!selectEl) return;

        selectEl.innerHTML = '<option value="">-- Select Assignee Email (Optional) --</option>';

        if (result.success && result.data) {
            result.data.forEach(user => {
                const opt = document.createElement('option');
                opt.value = user.email;
                opt.textContent = `${user.email} (${user.username})`;
                selectEl.appendChild(opt);
            });
        }
    } catch (error) {
        console.error('Error loading users for dropdown:', error);
    }
}
//===========================================
//  Function to load emails
//===========================================
async function loadRecipients() {
    try {
        const response = await fetch('/api/users/messages.php');
        const result = await response.json();
        const selectDropdown = document.getElementById('msg-recipient-email');

        if (result.status === 'success') {
            if (result.users.length === 0) {
                selectDropdown.innerHTML = `<option value="">No other users found</option>`;
                return;
            }

            selectDropdown.innerHTML = '<option value="">Select Recipient...</option>' +
                result.users.map(user => `
                    <option value="${user.email}">${user.username} (${user.email})</option>
                `).join('');
        } else {
            selectDropdown.innerHTML = `<option value="">Failed to load recipients</option>`;
        }
    } catch (error) {
        console.error('Error loading users:', error);
        document.getElementById('msg-recipient-email').innerHTML = `<option value="">Error loading recipients</option>`;
    }
}
// ===========================================================================
// Email Validation Function
// ===========================================================================
function validateEmailClient(email) {
    const patternStu = /^\d{9}@stu\.uob\.edu\.bh$/i;
    const patternStaff = /^[a-z](\.[a-z]+)+@uob\.edu\.bh$|^[a-z]{2,}[a-z0-9._%+-]*@uob\.edu\.bh$/i;
    return patternStu.test(email) || patternStaff.test(email);
}
// ===========================================================================
// Send/Submit message function
// ===========================================================================
async function handleMessageSubmit(event) {
    event.preventDefault();
    const recipientEmail = document.getElementById('msg-recipient-email').value.trim();
    const subject = document.getElementById('msg-subject').value.trim();
    const body = document.getElementById('msg-body').value.trim();

    if (!validateEmailClient(recipientEmail)) {
        alert("Please select a valid institutional email.");
        return;
    }

    try {
        const response = await fetch('/api/users/messages.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ recipient_email: recipientEmail, subject, body })
        });
        const result = await response.json();

        if (result.status === 'success' && result.mailto) {
            window.location.href = result.mailto;
            document.getElementById('message-form').reset();
            loadRecipients();
        } else {
            alert(result.message || 'Error preparing mailto link.');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

// ==========================================
// Helper and validation Functions
// ==========================================

function setElementText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

function getStatusBadge(status) {
    const s = (status || '').toLowerCase();
    if (s === 'in progress') return '<span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">In Progress</span>';
    if (s === 'completed') return '<span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">Completed</span>';
    if (s === 'planning') return '<span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">Planning</span>';

    return `<span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800 capitalize">${escapeHtml(s || 'Unknown')}</span>`;
}

function timeAgo(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
