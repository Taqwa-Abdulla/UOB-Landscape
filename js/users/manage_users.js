/**
 * User Management Frontend Script (main.js)
 */

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
const emailInput = document.getElementById("user-email");
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
        <button onclick="openEditModal('${user.user_id}')" class="text-indigo-600 hover:text-indigo-900 font-medium text-xs">Edit</button>
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