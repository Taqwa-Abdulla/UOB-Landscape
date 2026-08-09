// --- Element Selections ---
const loginForm = document.getElementById("login-form");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const messageContainer = document.getElementById("message-container");

// --- Display Message Helper ---
function displayMessage(message, type) {
  if (messageContainer) {
    messageContainer.textContent = message;
    messageContainer.className = type;
  }
}

/**
 * Validates email to match either:
 * 1. 9 digits followed by @stu.uob.edu.bh (e.g., 202801234@stu.uob.edu.bh)
 * 2. Staff / Faculty format ending with @uob.edu.bh (e.g., aikhalifa@uob.edu.bh)
 */
function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  
  const patternStu = /^\d{9}@stu\.uob\.edu\.bh$/i;
  const patternStaff = /^[a-z](\.[a-z]+)+@uob\.edu\.bh$|^[a-z]{2,}[a-z0-9._%+-]*@uob\.edu\.bh$/i;

  return patternStu.test(email) || patternStaff.test(email);
}

/**
 * Validates password: at least 8 characters, at least one uppercase letter, at least one special character.
 */
function isValidPassword(password) {
  if (!password || typeof password !== 'string') return false;
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasSpecialChar = /[\W_]/.test(password);

  return hasMinLength && hasUppercase && hasSpecialChar;
}

// --- Login Handler ---
async function handleLogin(event) {
  event.preventDefault();

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!isValidEmail(email)) {
    displayMessage("Invalid Credentials", "error");
    return;
  }

  if (!isValidPassword(password)) {
    displayMessage("Credentials", "error");
    return;
  }

  try {
    const response = await fetch("/api/auth/auth.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, password })
    });

    const result = await response.json();

    if (result.success) {
      displayMessage(result.message || "Login successful!", "success");
      emailInput.value = "";
      passwordInput.value = "";
      
      // Redirect dashboard based on user role returned from backend
      setTimeout(() => {
        if (result.user && result.user.role === 'admin') {
          window.location.href = "/site/admin/admin.html";
        } else if (result.user && result.user.role === 'creator') {
          window.location.href = "/site/creator/creator.html";
        } else {
          window.location.href = "/site/guest/home.html";
        }
      }, 1000);

    } else {
      displayMessage(result.message || "Invalid credentials.", "error");
    }
  } catch (error) {
    displayMessage("Unable to connect to the server. Please try again later.", "error");
  }
}

function setupLoginForm() {
  if (loginForm) {
    loginForm.addEventListener("submit", handleLogin);
  }
}

// --- Logout Handler ---
async function handleLogout() {
  try {
    const response = await fetch("/api/auth/logout.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      }
    });

    const result = await response.json();

    // Clear client session/local storage
    localStorage.clear();
    sessionStorage.clear();

    if (result && result.success) {
      window.location.href = "/site/guest/home.html";
    } else {
      window.location.href = "/site/guest/home.html";
    }
  } catch (error) {
    console.error("Error logging out:", error);
    window.location.href = "/site/guest/home.html";
  }
}

// --- Setup Logout Button (Global Event Listener) ---
function setupLogoutButton() {
  document.addEventListener("click", (event) => {
    // Intercepts clicks on any element with id="logout-btn" OR class="logout-btn" across the whole website
    const logoutTarget = event.target.closest("#logout-btn, .logout-btn");
    
    if (logoutTarget) {
      event.preventDefault();
      handleLogout();
    }
  });
}

// --- Initial Page Load ---
document.addEventListener("DOMContentLoaded", () => {
  setupLoginForm();
  setupLogoutButton();
});