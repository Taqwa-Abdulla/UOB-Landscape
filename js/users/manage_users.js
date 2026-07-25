// --- Global Data Store ---
// This array will be populated with data fetched from 'users.json'.
let users = [];

// --- Element Selections ---
// We can safely select elements here because 'defer' guarantees
// the HTML document is parsed before this script runs.

// TODO: Select the user table body (tbody).
const userTableBody = document.querySelector("#users-table tbody");

// TODO: Select the "Add USer" form.
// (You'll need to add id="add-user-form" to this form in your HTML).
const addUserForm = document.querySelector("#add-user-form");

// TODO: Select the "Change Password" form.
// (You'll need to add id="password-form" to this form in your HTML).
const changePasswordForm = document.querySelector("#password-form");

// TODO: Select the search input field.
// (You'll need to add id="search-input" to this input in your HTML).
const searchInput = document.querySelector("#search-input");

// TODO: Select all table header (th) elements in thead.
const tableHeaders = document.querySelectorAll("#users-table thead th");

// Element selections for the loading overlay framework toggle
const loaderOverlay = document.getElementById("plant-loader-overlay");
const mainPortalContent = document.getElementById("main-portal-content");

// --- Functions ---

/**
 * TODO: Implement the createUserRow function.
 * This function should take a user object {name, email, role} and return a <tr> element.
 * The <tr> should contain:
 * 1. A <td> for the user's name.
 * 2. A <td> for the user's ID. (Updated: Removed ID cell to match request)
 * 3. A <td> for the user's email.
 * 4. A <td> containing two buttons:
 * - An "Edit" button with class "edit-btn" and a data-id attribute set to the user's email.
 * - A "Delete" button with class "delete-btn" and a data-id attribute set to the user's email.
 */
function createUserRow(user) {
  // Create the row element
  const tr = document.createElement("tr");

  // Create columns based on instructions (Using email as the identifier data-id)
  tr.innerHTML = `
    <td>${user.username || user.name}</td>
    <td>${user.email}</td>
    <td>${user.role}</td>
    <td>
      <div role="group">
        <button class="edit-btn" size="small" data-id="${user.email}">Edit</button>
        <button class="delete-btn" size="small" data-id="${user.email}">Delete</button>
      </div>
    </td>
  `;
  return tr;
}

/**
 * TODO: Implement the renderTable function.
 * This function takes an array of user objects.
 * It should:
 * 1. Clear the current content of the `userTableBody`.
 * 2. Loop through the provided array of users.
 * 3. For each user, call `createUserRow` and append the returned <tr> to `userTableBody`.
 */
function renderTable(userArray) {
  // 1. Clear current content
  userTableBody.innerHTML = "";

  // 2. Loop through array and 3. append row elements
  userArray.forEach(user => {
    const row = createUserRow(user);
    userTableBody.appendChild(row);
  });
}

/**
 * TODO: Implement the handleChangePassword function.
 * This function will be called when the "Update Password" button is clicked.
 * It should:
 * 1. Prevent the form's default submission behavior.
 * 2. Get the values from "current-password", "new-password", and "confirm-password" inputs.
 * 3. Perform validation:
 * - If "new-password" and "confirm-password" do not match, show an alert: "Passwords do not match."
 * - If "new-password" is less than 8 characters, show an alert: "Password must be at least 8 characters."
 * 4. If validation passes, show an alert: "Password updated successfully!"
 * 5. Clear all three password input fields.
 */
function handleChangePassword(event) {
  // 1. Prevent form's default submission behavior
  event.preventDefault();

  // 2. Get the values from inputs
  const currentPasswordInput = document.getElementById("current-password");
  const newPasswordInput = document.getElementById("new-password");
  const confirmPasswordInput = document.getElementById("confirm-password");

  const currentPassword = currentPasswordInput.value;
  const newPassword = newPasswordInput.value;
  const confirmPassword = confirmPasswordInput.value;

  // 3. Perform validation
  if (newPassword !== confirmPassword) {
    alert("Passwords do not match.");
    return;
  }

  if (newPassword.length < 8) {
    alert("Password must be at least 8 characters.");
    return;
  }

  // 4. Validation passed
  alert("Password updated successfully!");

  // 5. Clear all fields
  currentPasswordInput.value = "";
  newPasswordInput.value = "";
  confirmPasswordInput.value = "";
}

/**
 * TODO: Implement the handleAddUser function.
 * This function will be called when the "Add User" button is clicked.
 * It should:
 * 1. Prevent the form's default submission behavior.
 * 2. Get the values from "user-name", "user-role", and "user-email".
 * 3. Perform validation:
 * - If any of the three fields are empty, show an alert: "Please fill out all required fields."
 * - (Optional) Check if a user with the same ID already exists in the 'users' array.
 * 4. If validation passes:
 * - Create a new user object: { name, id, email }.
 * - Add the new user object to the global 'users' array.
 * - Call `renderTable(users)` to update the view.
 * 5. Clear the "user-name", "user-role", "user-email", and "default-password" input fields.
 */
function handleAddUser(event)
{
  // 1. Prevent standard form submission behavior
  event.preventDefault();

  // 2. Extract configuration field values
  const nameInput = document.getElementById("user-name");
  const roleInput = document.getElementById("user-role");
  const emailInput = document.getElementById("user-email");
  const defaultPasswordInput = document.getElementById("default-password");

  const name = nameInput.value.trim();
  const role = roleInput.value.trim();
  const email = emailInput.value.trim();

  // 3. Perform required structural validation
  if (!name || !role || !email) {
    alert("Please fill out all required fields.");
    return;
  }

  // Optional matching duplicate validation check
  const duplicateExists = users.some(user => user.email.toLowerCase() === email.toLowerCase());
  if (duplicateExists) {
    alert("A user with this email address already exists.");
    return;
  }

  // 4. Handle successful state data synchronization
  const newUser = {
    username: name,
    email: email,
    role: role,
    is_contributor: false,
    updated_by: null
  };

  users.push(newUser);
  renderTable(users);

  // 5. Clear input elements
  nameInput.value = "";
  roleInput.value = "";
  emailInput.value = "";
  if (defaultPasswordInput) defaultPasswordInput.value = "password123";
}

/**
 * TODO: Implement the handleTableClick function.
 * This function will be an event listener on the `userTableBody` (event delegation).
 * It should:
 * 1. Check if the clicked element (`event.target`) has the class "delete-btn".
 * 2. If it is a "delete-btn":
 * - Get the `data-id` attribute from the button.
 * - Update the global 'users' array by filtering out the user with the matching ID.
 * - Call `renderTable(users)` to update the view.
 * 3. (Optional) Check for "edit-btn" and implement edit logic.
 */
function handleTableClick(event) {
  // 1. Check if clicked target is the delete target
  if (event.target.classList.contains("delete-btn")) {
    // 2. Extract contextual attributes 
    const targetEmail = event.target.getAttribute("data-id");
    
    if (confirm("Are you sure you want to delete this user account?")) {
      users = users.filter(user => user.email !== targetEmail);
      renderTable(users);
    }
  }

  // 3. Optional tracking evaluation block for edit configurations
  if (event.target.classList.contains("edit-btn")) {
    const targetEmail = event.target.getAttribute("data-id");
    const userToEdit = users.find(user => user.email === targetEmail);
    if (userToEdit) {
      // Pre-fill form inputs with existing user details so the admin can edit them via form fields
      const nameInput = document.getElementById("user-name");
      const roleInput = document.getElementById("user-role");
      const emailInput = document.getElementById("user-email");

      if (nameInput) nameInput.value = userToEdit.username || userToEdit.name || "";
      if (roleInput) roleInput.value = userToEdit.role || "";
      if (emailInput) emailInput.value = userToEdit.email || "";

      // Temporarily store the email being edited to handle updates on form submission if desired
      addUserForm.dataset.editingEmail = targetEmail;
      
      // Optionally change button text or scroll to form if necessary
      const submitBtn = addUserForm.querySelector("button[type='submit']") || addUserForm.querySelector("input[type='submit']");
      if (submitBtn) submitBtn.textContent = "Update User";
      
      addUserForm.scrollIntoView({ behavior: 'smooth' });
    }
  }
}

/**
 * TODO: Implement the handleSearch function.
 * This function will be called on the "input" event of the `searchInput`.
 * It should:
 * 1. Get the search term from `searchInput.value` and convert it to lowercase.
 * 2. If the search term is empty, call `renderTable(users)` to show all users.
 * 3. If the search term is not empty:
 * - Filter the global 'users' array to find users whose name (lowercase)
 * includes the search term.
 * - Call `renderTable` with the *filtered array*.
 */
function handleSearch(event)
{
  // 1. Get the query transformed uniform lowercase
  const query = event.target.value.toLowerCase().trim();

  // 2. Empty fallback evaluation logic check
  if (query === "") {
    renderTable(users);
  } else {
    // 3. Track filtering properties across users array criteria
    const filteredUsers = users.filter(user => {
      const usernameVal = user.username || user.name || "";
      return usernameVal.toLowerCase().includes(query) || 
             user.email.toLowerCase().includes(query);
    });
    renderTable(filteredUsers);
  }
}

/**
 * TODO: Implement the handleSort function.
 * This function will be called when any `th` in the `thead` is clicked.
 * It should:
 * 1. Identify which column was clicked (e.g., `event.currentTarget.cellIndex`).
 * 2. Determine the property to sort by ('name', 'id', 'email') based on the index. (Updated: indexes now point to name, email, role)
 * 3. Determine the sort direction. Use a data-attribute (e.g., `data-sort-dir="asc"`) on the `th`
 * to track the current direction. Toggle between "asc" and "desc".
 * 4. Sort the global 'users' array *in place* using `array.sort()`.
 * - For 'name' and 'email', use `localeCompare` for string comparison.
 * - For 'id', compare the values as numbers.
 * 5. Respect the sort direction (ascending or descending).
 * 6. After sorting, call `renderTable(users)` to update the view.
 */
function handleSort(event) {
  const clickedHeader = event.currentTarget;
  
  // 1. Identify structural sorting target context indices
  const columnIndex = clickedHeader.cellIndex;

  // 2. Determine the target property lookup map dictionary matches
  const propertiesMap = ['username', 'email', 'role'];
  const targetProperty = propertiesMap[columnIndex];

  if (!targetProperty) return; // Action skipped for non-mappable headers (e.g. actions)

  // 3. Toggle state attribute calculations
  let currentDirection = clickedHeader.getAttribute("data-sort-dir") || "desc";
  const newDirection = currentDirection === "asc" ? "desc" : "asc";
  
  // Reset existing header flags across sibling targets for clean state management
  tableHeaders.forEach(th => th.removeAttribute("data-sort-dir"));
  clickedHeader.setAttribute("data-sort-dir", newDirection);

  // 4. Implement actual dynamic dataset property configuration sort processes
  users.sort((userA, userB) => {
    let valA = userA[targetProperty] || userA['name'] || '';
    let valB = userB[targetProperty] || userB['name'] || '';

    // Standard string dynamic locale mapping comparison parameters string methods
    let comparison = valA.localeCompare(valB);

    // 5. Directional tracking reversal parameters matrix calculation inversion process
    return newDirection === "asc" ? comparison : -comparison;
  });

  // 6. Refresh interface outputs
  renderTable(users);
}

/**
 * TODO: Implement the loadUsersAndInitialize function.
 * This function needs to be 'async'.
 * It should:
 * 1. Use the `fetch()` API to get data from 'users.json'.
 * 2. Check if the response is 'ok'. If not, log an error.
 * 3. Parse the JSON response (e.g., `await response.json()`).
 * 4. Assign the resulting array to the global 'users' variable.
 * 5. Call `renderTable(users)` to populate the table for the first time.
 * 6. After data is loaded, set up all the event listeners:
 * - "submit" on `changePasswordForm` -> `handleChangePassword`
 * - "submit" on `addUserForm` -> `handleAddUser`
 * - "click" on `userTableBody` -> `handleTableClick`
 * - "input" on `searchInput` -> `handleSearch`
 * - "click" on each header in `tableHeaders` -> `handleSort`
 */
async function loadUsersAndInitialize() {
  try {
    // 1. Fetch JSON data from source definition path configuration target
    const response = await fetch('../../json/users/users.json');

    // 2. Fallback response validation integrity analysis pipeline tracking checks
    if (!response.ok) {
      console.error(`Failed loading users dataset file path configuration structure context: ${response.statusText}`);
      return;
    }

    // 3. Process dynamic dataset parsing operations configuration mappings
    // 4. Assign dynamic array parameters results directly into state data systems
    users = await response.json();

    // 5. Generate early UI interface configuration renderings patterns matches tracking data
    if (userTableBody) {
      renderTable(users);
    }

    // Modify handleAddUser to support editing via form fields if editingEmail dataset is present
    if (addUserForm) {
      // Override or enhance submission handler to manage updates dynamically via form fields
      addUserForm.addEventListener("submit", function(event) {
        event.preventDefault();

        const nameInput = document.getElementById("user-name");
        const roleInput = document.getElementById("user-role");
        const emailInput = document.getElementById("user-email");
        const defaultPasswordInput = document.getElementById("default-password");

        const name = nameInput.value.trim();
        const role = roleInput.value.trim();
        const email = emailInput.value.trim();

        if (!name || !role || !email) {
          alert("Please fill out all required fields.");
          return;
        }

        const editingEmail = addUserForm.dataset.editingEmail;

        if (editingEmail) {
          // Update existing user mode via form fields
          const userIndex = users.findIndex(u => u.email === editingEmail);
          if (userIndex !== -1) {
            // Check if email changed and if conflict exists
            if (editingEmail !== email && users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
              alert("A user with this email address already exists.");
              return;
            }

            users[userIndex].username = name;
            users[userIndex].email = email;
            users[userIndex].role = role;
          }

          // Clear editing mode state
          delete addUserForm.dataset.editingEmail;
          const submitBtn = addUserForm.querySelector("button[type='submit']") || addUserForm.querySelector("input[type='submit']");
          if (submitBtn) submitBtn.textContent = "Add User";

          renderTable(users);

          nameInput.value = "";
          roleInput.value = "";
          emailInput.value = "";
          if (defaultPasswordInput) defaultPasswordInput.value = "password123";
        } else {
          // Fall back to standard add user flow
          handleAddUser(event);
        }
      });
    }

    // 6. Attach full unified configuration interaction tracking systems handlers listeners
    if (changePasswordForm) {
      changePasswordForm.addEventListener("submit", handleChangePassword);
    }

    if (userTableBody) {
      userTableBody.addEventListener("click", handleTableClick);
    }

    if (searchInput) {
      searchInput.addEventListener("input", handleSearch);
    }

    if (tableHeaders) {
      tableHeaders.forEach(header => {
        // Exclude action elements header to lock data integrity tracking parameters mapping errors
        if (header.textContent.trim().toLowerCase() !== "actions") {
          header.style.cursor = "pointer"; // Aesthetic usability indication
          header.addEventListener("click", handleSort);
        }
      });
    }

    // Processing loaded status changes: Hide loader anim loop, view admin data systems
    if (loaderOverlay && mainPortalContent) {
      loaderOverlay.style.display = "none";
      mainPortalContent.style.display = "block";
    }

  } catch (error) {
    console.error("Critical Runtime Error Initializing Application Pipeline Handler Stack Configuration Context Process:", error);
    // Even if errors throw, break lock systems so screen UI does not get locked into freeze states loop
    if (loaderOverlay) loaderOverlay.style.display = "none";
  }
}

// --- Initial Page Load ---
// Call the main async function to start the application.
loadUsersAndInitialize();