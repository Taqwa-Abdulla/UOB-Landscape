/**
 * User Management Frontend Script (main.js)
 */
document.addEventListener('DOMContentLoaded', () => {
    initDashboard();
    initNotifications();
});

async function initDashboard() {
    await fetchDashboardData();
    await loadNotifications();
}
const API_URL = "/api/admin/users_management.php"; // Adjust endpoint path if necessary

// DOM Elements
const searchInput = document.getElementById("search-input");
const unifiedFilter = document.getElementById("unified-filter");
const collegeOptgroup = document.getElementById("college-optgroup");
const majorOptgroup = document.getElementById("major-optgroup");
const usersTableBody = document.getElementById("users-table-body");

const modalTitle = document.getElementById("modal-title");
const formMode = document.getElementById("form-mode");
const userIdInput = document.getElementById("user-id");
const usernameInput = document.getElementById("user-username");
const emailInput = document.getElementById("add-user-email");
const passwordInput = document.getElementById("user-password");
const passwordContainer = document.getElementById("password-field-container");
const collegeInput = document.getElementById("user-college");
const dynamicFieldInput = document.getElementById("user-dynamic-field");
const dynamicFieldLabel = document.getElementById("dynamic-field-label");
const roleInput = document.getElementById("user-role");
const isContributorInput = document.getElementById("user-is-contributor");

// State data
let users = [];

// Initialize application on load
document.addEventListener("DOMContentLoaded", () => {
  loadFilterDropdowns();
  fetchUsers();

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      applyFiltersAndSearch();
    });
  }

  if (unifiedFilter) {
    unifiedFilter.addEventListener("change", () => {
      applyFiltersAndSearch();
    });
  }

  // Listen for changes on email to toggle between Major and Department automatically
  if (emailInput) {
    emailInput.addEventListener("input", () => {
      updateDynamicFieldLabel();
    });
  }
});

/**
 * Checks email domain and updates the label from Major to Department if it's a staff email
 */
function updateDynamicFieldLabel() {
  const email = emailInput.value.trim().toLowerCase();
  // If it ends with @uob.edu.bh but NOT @stu.uob.edu.bh, it's staff
  if (email.endsWith("@uob.edu.bh") && !email.endsWith("@stu.uob.edu.bh")) {
    if (dynamicFieldLabel) dynamicFieldLabel.textContent = "Department";
    if (dynamicFieldInput) dynamicFieldInput.placeholder = "e.g., Department of Computer Science";
  } else {
    if (dynamicFieldLabel) dynamicFieldLabel.textContent = "Major";
    if (dynamicFieldInput) dynamicFieldInput.placeholder = "e.g., Computer Science";
  }
}

/**
 * Fetch dynamic colleges and majors from backend API to populate the filter dropdown
 */
async function loadFilterDropdowns() {
  try {
    const response = await fetch(`${API_URL}?action=get_filter_options`);
    const result = await response.json();

    if (response.ok && result.success) {
      if (collegeOptgroup && result.colleges) {
        collegeOptgroup.innerHTML = "";
        result.colleges.forEach(college => {
          if (college) {
            const opt = document.createElement("option");
            opt.value = `college:${college}`;
            opt.textContent = college;
            collegeOptgroup.appendChild(opt);
          }
        });
      }

      if (majorOptgroup && result.majors) {
        majorOptgroup.innerHTML = "";
        result.majors.forEach(major => {
          if (major) {
            const opt = document.createElement("option");
            opt.value = `major:${major}`;
            opt.textContent = major;
            majorOptgroup.appendChild(opt);
          }
        });
      }
    }
  } catch (error) {
    console.error("Failed to load dynamic filter options:", error);
  }
}

/**
 * Initial fetch to load all users without constraints
 */
async function fetchUsers() {
  try {
    const response = await fetch(API_URL);
    const result = await response.json();

    if (response.ok && result.success) {
      users = result.data;
      renderTable(users);
    } else {
      console.error("Failed to fetch users:", result.message);
    }
  } catch (error) {
    console.error("Network or parsing error fetching users:", error);
  }
}

/**
 * Apply real-time query searching and unified dropdown filter selection
 */
async function applyFiltersAndSearch() {
  const query = searchInput ? searchInput.value.trim() : "";
  const filterValue = unifiedFilter ? unifiedFilter.value : "";

  let url = `${API_URL}?`;
  const params = [];

  if (query) {
    params.push(`search=${encodeURIComponent(query)}`);
  }

  if (filterValue) {
    const [filterKey, filterVal] = filterValue.split(":");
    if (filterKey && filterVal !== undefined) {
      params.push(`${filterKey}=${encodeURIComponent(filterVal)}`);
    }
  }

  if (params.length > 0) {
    url += params.join("&");
  } else {
    url = API_URL;
  }

  try {
    const response = await fetch(url);
    const result = await response.json();

    if (response.ok && result.success) {
      users = result.data;
      renderTable(users);
    }
  } catch (error) {
    console.error("Error applying filters:", error);
  }
}

/**
 * Render user records into the HTML table structure
 */
function renderTable(data) {
  if (!usersTableBody) return;

  usersTableBody.innerHTML = "";

  if (!data || data.length === 0) {
    usersTableBody.innerHTML = `
      <tr>
        <td colspan="7" class="px-6 py-4 text-center text-gray-500 text-sm">No users found matching your criteria.</td>
      </tr>
    `;
    return;
  }

  data.forEach(user => {
    const tr = document.createElement("tr");
    tr.className = "hover:bg-gray-50 transition";

    // Determine whether to display Department or Major based on email domain
    const emailStr = (user.email || "").toLowerCase();
    const isStaff = emailStr.endsWith("@uob.edu.bh") && !emailStr.endsWith("@stu.uob.edu.bh");
    const subLabelTitle = isStaff ? "Dept" : "Major";
    const subLabelValue = user.major || 'N/A'; // Stored under major in DB for both

    tr.innerHTML = `
      <td class="px-6 py-4 font-medium text-gray-900">${user.user_id}</td>
      <td class="px-6 py-4 text-gray-700">${user.username}</td>
      <td class="px-6 py-4 text-gray-500">${user.email}</td>
      <td class="px-6 py-4 text-gray-500">
        <span class="block text-xs font-semibold text-gray-700">${user.college || 'N/A'}</span>
        <span class="block text-xs text-gray-400">${subLabelTitle}: ${subLabelValue}</span>
      </td>
      <td class="px-6 py-4">
        <span class="px-2.5 py-1 text-xs font-medium rounded-full ${user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}">
          ${user.role}
        </span>
      </td>
      <td class="px-6 py-4">
        <span class="px-2.5 py-1 text-xs font-medium rounded-full ${user.is_contributor ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}">
          ${user.is_contributor ? 'Yes' : 'No'}
        </span>
      </td>
      <td class="px-6 py-4 text-right space-x-2">
        <button onclick="openEditModal('${user.user_id}')" class="text-blue-600 hover:text-blue-900 font-medium text-xs">Edit</button>
        <button onclick="deleteUserRecord('${user.user_id}')" class="text-red-600 hover:text-red-900 font-medium text-xs">Delete</button>
      </td>
    `;

    usersTableBody.appendChild(tr);
  });
}

/**
 * Reset form for creating a user
 */
function resetFormToCreate() {
  if (modalTitle) modalTitle.textContent = "New User Information";
  if (formMode) formMode.value = "create";
  if (userIdInput) {
    userIdInput.value = "";
    userIdInput.disabled = false;
  }
  if (usernameInput) usernameInput.value = "";
  if (emailInput) emailInput.value = "";
  if (passwordContainer) passwordContainer.style.display = "flex";
  if (passwordInput) {
    passwordInput.value = "Pass@word1234";
    passwordInput.required = true;
  }
  if (collegeInput) collegeInput.value = "";
  if (dynamicFieldInput) dynamicFieldInput.value = "";
  if (roleInput) roleInput.value = "creator";
  if (isContributorInput) isContributorInput.checked = false;
  updateDynamicFieldLabel();
}

/**
 * Load user data into the form container for editing
 */
async function openEditModal(userId) {
  try {
    const response = await fetch(`${API_URL}?user_id=${userId}`);
    const result = await response.json();

    if (response.ok && result.success) {
      const user = result.data;
      if (modalTitle) modalTitle.textContent = "Edit User Information";
      if (formMode) formMode.value = "edit";
      if (userIdInput) {
        userIdInput.value = user.user_id;
        userIdInput.disabled = true;
      }
      if (usernameInput) usernameInput.value = user.username;
      if (emailInput) emailInput.value = user.email;
      if (passwordInput) {
        passwordInput.value = "";
        passwordInput.required = false;
      }
      if (passwordContainer) passwordContainer.style.display = "none";
      if (collegeInput) collegeInput.value = user.college || "";

      // Trigger domain check to set label appropriately, then load value into the field
      updateDynamicFieldLabel();
      if (dynamicFieldInput) {
        dynamicFieldInput.value = user.major || "";
      }

      if (roleInput) roleInput.value = user.role || "creator";
      if (isContributorInput) isContributorInput.checked = Boolean(user.is_contributor);

      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      alert("Could not load user data for editing.");
    }
  } catch (error) {
    console.error("Error opening edit form:", error);
  }
}

/**
 * Form Submit Router for Create / Edit Operations
 */
async function handleFormSubmit(event) {
  event.preventDefault();

  const mode = formMode ? formMode.value : "create";
  const email = emailInput ? emailInput.value.trim().toLowerCase() : "";
  
  // Always map the dynamic field's input value directly into `major` to match database schema
  const payload = {
    user_id: userIdInput ? userIdInput.value.trim() : "",
    username: usernameInput ? usernameInput.value.trim() : "",
    email: email,
    college: collegeInput ? collegeInput.value.trim() || null : null,
    major: dynamicFieldInput ? dynamicFieldInput.value.trim() || null : null, // Stored uniformly in 'major'
    role: roleInput ? roleInput.value : "creator",
    is_contributor: isContributorInput && isContributorInput.checked ? 1 : 0
  };

  let method = "POST";
  if (mode === "create") {
    payload.password = passwordInput ? passwordInput.value : "";
  } else {
    method = "PUT";
  }

  try {
    const response = await fetch(API_URL, {
      method: method,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (response.ok && result.success) {
      resetFormToCreate();
      fetchUsers();
      loadFilterDropdowns();
    } else {
      alert("Operation failed: " + (result.message || "Unknown error"));
    }
  } catch (error) {
    console.error("Network error submitting form:", error);
    alert("An unexpected error occurred while saving.");
  }
}

/**
 * Delete User Record
 */
async function deleteUserRecord(userId) {
  if (!confirm("Are you sure you want to delete this user?")) return;

  try {
    const response = await fetch(`${API_URL}?user_id=${userId}`, {
      method: "DELETE"
    });
    const result = await response.json();

    if (response.ok && result.success) {
      fetchUsers();
      loadFilterDropdowns();
    } else {
      alert("Failed to delete user: " + result.message);
    }
  } catch (error) {
    console.error("Error deleting user:", error);
  }
}
// ==========================================
// NOTIFICATIONS & PREFERENCES LOGIC
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

/**
 * Fetch all admin dashboard stats & profile info from backend
 */
async function fetchDashboardData() {
    try {
        const response = await fetch('/api/admin/admin.php');

        if (response.status === 401 || response.status === 403) {
            window.location.href = "/site/guest/home.html";
            return;
        }

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();

        if (data.success) {
            if (data.user) updateUserProfile(data.user);
        } else {
            console.error("Access error:", data.error);
            window.location.href = "/site/guest/home.html";
        }
    } catch (error) {
        console.error("Failed to load dashboard data:", error);
    }
}
/**
 * Update Dynamic Sidebar / Header User Profile & store currentUserId
 */
function updateUserProfile(user) {
    currentUserId = user.user_id || user.id || null;

    const nameEl = document.getElementById('user-name');
    const emailEl = document.getElementById('profile-user-email');
    const initialsEl = document.getElementById('user-initials');

    if (nameEl) nameEl.textContent = user.name || 'Admin User';
    if (emailEl) emailEl.textContent = user.email || 'admin@company.com';
    if (initialsEl) initialsEl.textContent = user.initials || 'AD';
}
// ==========================================
// UTILITY HELPERS
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