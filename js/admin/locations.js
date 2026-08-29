/**
 * Locations Management Script
 */
let locations = [];
const apiUrl = '/api/admin/manage_locations.php';
document.addEventListener('DOMContentLoaded', () => {
    initDashboard();
    initNotifications();
});

async function initDashboard() {
    await fetchDashboardData();
    await loadNotifications();
}

document.addEventListener('DOMContentLoaded', () => {
    const addLocationForm = document.getElementById('add-location-form');
    const locationsTableBody = document.querySelector('#locations-table tbody');
    const searchInput = document.getElementById('search-input');
    const sortSelect = document.getElementById('sort-select');
    const orderSelect = document.getElementById('order-select');
    const locationImageInput = document.getElementById('location-image');

    // Function to fetch locations from the PHP API
    window.fetchLocations = async function(search = '', sort = 'location_id', order = 'asc') {
        try {
            let url = `${apiUrl}?resource=locations&sort=${sort}&order=${order}`;
            if (search) {
                url += `&search=${encodeURIComponent(search)}`;
            }

            const response = await fetch(url);
            if (!response.ok) {
                throw new Error('Failed to fetch locations from server.');
            }

            locations = await response.json();
            renderTable(locations);
        } catch (error) {
            console.error('Error fetching locations:', error);
            if (locationsTableBody) {
                locationsTableBody.innerHTML = `<tr class="ml-tr"><td class="ml-td" colspan="8" style="text-align: center; color: red;">Error loading locations from database.</td></tr>`;
            }
        }
    };

   function renderTable(data) {
        if (!locationsTableBody) return;
        locationsTableBody.innerHTML = '';
        
        if (!data || data.length === 0) {
            locationsTableBody.innerHTML = `
                <tr class="hover:bg-slate-50/60 transition-colors">
                    <td class="px-6 py-5 font-medium text-slate-400 text-center" colspan="8">
                        No registered locations found.
                    </td>
                </tr>
            `;
            return;
        }

        data.forEach(loc => {
            const row = document.createElement('tr');
            // Added subtle hover effect and smooth color transitions for the whole row
            row.className = 'hover:bg-blue-50/40 transition-all duration-150';
            
            // Generate image thumbnail preview with a subtle hover zoom effect
            const imageHtml = loc.location_image 
                ? `<img src="${loc.location_image}" alt="Location Image" class="w-12 h-12 object-cover rounded-lg shadow-sm border border-slate-200 transform hover:scale-105 transition-transform duration-200 cursor-pointer">` 
                : '<span class="text-xs text-slate-400 italic">No Image</span>';

            row.innerHTML = `
                <td class="px-6 py-4 font-medium text-slate-700 text-center">${loc.location_id}</td>
                <td class="px-6 py-4 text-center">${imageHtml}</td>
                <td class="px-6 py-4 text-slate-600">${loc.location_number || 'N/A'}</td>
                <td class="px-6 py-4 text-slate-600 capitalize">${loc.category}</td>
                <td class="px-6 py-4 text-slate-800 font-medium">${loc.name_en}</td>
                <td class="px-6 py-4 text-slate-800 font-medium" dir="rtl">${loc.name_ar}</td>
                <td class="px-6 py-4 text-slate-500 font-mono text-xs">${loc.latitude}, ${loc.longitude}</td>
                <td class="px-6 py-4">
                    <div class="flex items-center gap-2">
                        <!-- Edit Button with hover shadow, translation lift, and active click feedback -->
                        <button type="button" class="px-3 py-1.5 text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all duration-150 shadow-sm" onclick="editLocation(${loc.location_id})">Edit</button>
                        
                        <!-- Delete Button with hover shadow, translation lift, and active click feedback -->
                        <button type="button" class="px-3 py-1.5 text-xs font-semibold  bg-red-50 hover:bg-red-100 text-red-700 hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all duration-150 shadow-sm" onclick="deleteLocation(${loc.location_id})">Delete</button>
                    </div>
                </td>
            `;
            locationsTableBody.appendChild(row);
        });
    }
    
    // Handle Add/Update Location Form Submission using FormData
    if (addLocationForm) {
        addLocationForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const idField = document.getElementById('location-id').value;
            const isUpdate = Boolean(idField);
            
            // Use FormData to support binary file uploads seamlessly
            const formData = new FormData();
            
            if (isUpdate) {
                formData.append('id', idField);
                formData.append('_method', 'PUT'); // Method spoofing for PHP backend router
            }
            
            formData.append('location_number', document.getElementById('location-number').value);
            formData.append('category', document.getElementById('location-category').value);
            formData.append('name_en', document.getElementById('name-en').value);
            formData.append('name_ar', document.getElementById('name-ar').value);
            formData.append('latitude', document.getElementById('latitude').value);
            formData.append('longitude', document.getElementById('longitude').value);
            formData.append('created_by', document.getElementById('created-by').value || 1);
            formData.append('updated_by', document.getElementById('updated-by').value || 1);

            // Append image file if selected
            if (locationImageInput && locationImageInput.files[0]) {
                formData.append('location_image', locationImageInput.files[0]);
            }

            try {
                // FIX: Explicitly include ?resource=locations in the fetch URL request
                let url = `${apiUrl}?resource=locations`;
                
                const response = await fetch(url, {
                    method: 'POST', // Sent via POST with method-spoofing so PHP parses $_FILES and $_POST properly
                    body: formData
                    // Note: Do NOT manually set 'Content-Type': 'application/json' when using FormData.
                });

                if (!response.ok) {
                    const errRes = await response.json();
                    throw new Error(errRes.error || 'Failed to save location.');
                }

                if (isUpdate) {
                    document.getElementById('location-id').value = '';
                    const submitBtn = document.getElementById('submit-location-btn');
                    if (submitBtn) submitBtn.textContent = 'Add Location';
                }

                addLocationForm.reset();
                fetchLocations();
            } catch (error) {
                alert('Error: ' + error.message);
            }
        });
    }

    // Handle Search Filter
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value;
            const sort = sortSelect ? sortSelect.value : 'location_id';
            const order = orderSelect ? orderSelect.value : 'asc';
            fetchLocations(query, sort, order);
        });
    }

    // Handle Sorting changes
    if (sortSelect && orderSelect) {
        const triggerSort = () => {
            const query = searchInput ? searchInput.value : '';
            fetchLocations(query, sortSelect.value, orderSelect.value);
        };
        sortSelect.addEventListener('change', triggerSort);
        orderSelect.addEventListener('change', triggerSort);
    }

    // Initial render
    fetchLocations();
});

// Global function to populate the form for editing
window.editLocation = function(id) {
    const location = locations.find(loc => loc.location_id == id);
    if (!location) return;

    document.getElementById('location-id').value = location.location_id;
    document.getElementById('location-number').value = location.location_number || '';
    document.getElementById('location-category').value = location.category;
    document.getElementById('name-en').value = location.name_en;
    document.getElementById('name-ar').value = location.name_ar;
    document.getElementById('latitude').value = location.latitude;
    document.getElementById('longitude').value = location.longitude;

    const submitBtn = document.getElementById('submit-location-btn');
    if (submitBtn) submitBtn.textContent = 'Update Location';
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

// Global function to delete a location via API
window.deleteLocation = async function(id) {
    if (!confirm('Are you sure you want to delete this location?')) return;

    try {
        const response = await fetch(`${apiUrl}?resource=locations&id=${id}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            const errRes = await response.json();
            throw new Error(errRes.error || 'Failed to delete location.');
        }

        fetchLocations();
    } catch (error) {
        alert('Error: ' + error.message);
    }
};
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