// --- Element Selections ---.
const loginForm = document.getElementById("login-form");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const messageContainer = document.getElementById("message-container");
// --- Functions ---
/**
 * TODO: Implement the displayMessage function.
 * This function takes two arguments:
 * 1. message (string): The message to display.
 * 2. type (string): "success" or "error".
 *
 * It should:
 * 1. Set the text content of `messageContainer` to the `message`.
 * 2. Set the class name of `messageContainer` to `type`
 * (this will allow for CSS styling of 'success' and 'error' states).
 */
function displayMessage(message, type) {
  if (messageContainer) {
    messageContainer.textContent = message;
    messageContainer.className = type;
  }
}

/**
 * TODO: Implement the isValidEmail function.
 * This function takes one argument:
 * 1. email (string): The email string to validate.
 *
 * It should:
 * 1. Use a regular expression to check if the email format is valid.
 * 2. Return `true` if the email is valid ("akmohhamed@uob.edu.bh.com" if name is ali kahlid mohammed for example and for other 000000000@stu.uob.edu.bh where zeros can be any numbers but must be 9 digits).
 * 3. Return `false` if the email is invalid (e.g., "test@", "test.com", "test@.com").
 *
 * A simple regex for this purpose is: /\S+@\S+\.\S+/
 */
function isValidEmail(email) {
  const regex = /\S+@\S+\.\S+/;
  return regex.test(email);
}

/**
 * TODO: Implement the isValidPassword function.
 * This function takes one argument:
 * 1. password (string): The password string to validate.
 *
 * It should:
 * 1. Check if the password length is 8 characters or more, contains a capital letter, and a special character.
 * 2. Return `true` if the password is valid.
 * 3. Return `false` if the password is not valid.
 */
function isValidPassword(password) {
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasSpecialChar = /[\W_]/.test(password);

  return hasMinLength && hasUppercase && hasSpecialChar;
}

/**
 * TODO: Implement the handleLogin function.
 * This function will be the event handler for the form's "submit" event.
 * It should:
 * 1. Prevent the form's default submission behavior.
 * 2. Get the `value` from `emailInput` and `passwordInput`, trimming any whitespace.
 * 3. Validate the email using `isValidEmail()`.
 * - If invalid, call `displayMessage("Invalid email format.", "error")` and stop.
 * 4. Validate the password using `isValidPassword()`.
 * - If invalid, call `displayMessage("Password must be at least 8 characters, with 1 uppercase letter and 1 special character.", "error")` and stop.
 * 5. If both email and password are valid:
 * - Send a POST request using Fetch API to the PHP backend.
 * - Call `displayMessage()` depending on the API response.
 */
async function handleLogin(event) {
  event.preventDefault();

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!isValidEmail(email)) {
    displayMessage("Invalid email format.", "error");
    return;
  }

  if (!isValidPassword(password)) {
    displayMessage("Password must be at least 8 characters long, contain at least one uppercase letter, and one special character.", "error");
    return;
  }

  try {
    const response = await fetch("../../api/aut/login.php", {
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
    } else {
      displayMessage(result.message || "Invalid credentials.", "error");
    }
  } catch (error) {
    displayMessage("Unable to connect to the server. Please try again later.", "error");
  }
}

/**
 * TODO: Implement the setupLoginForm function.
 * This function will be called once to set up the form.
 * It should:
 * 1. Check if `loginForm` exists.
 * 2. If it exists, add a "submit" event listener to it.
 * 3. The event listener should call the `handleLogin` function.
 */
function setupLoginForm() {
  if (loginForm) {
    loginForm.addEventListener("submit", handleLogin);
  }
}

// --- Initial Page Load ---
// Call the main setup function to attach the event listener.
setupLoginForm();

//logout
async function handleLogout() {
  try {
    const response = await fetch("logout.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      }
    });

    const result = await response.json();

    if (result.success) {
      // Redirect to login page after successful logout
      window.location.href = "home.html";
    }
  } catch (error) {
    console.error("Error logging out:", error);
  }
}