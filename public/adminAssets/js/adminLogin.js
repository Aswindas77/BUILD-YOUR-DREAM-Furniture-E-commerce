document.getElementById("admin-loginForm").addEventListener("submit", (event) => {
  // Prevent default form submission
  event.preventDefault();

  // Get input values
  const email = document.getElementById("email");
  const password = document.getElementById("password");

  // Regex Patterns
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const minLengthRegex = /^.{8,}$/;
  const specialCharRegex = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/;
  const numberRegex = /\d/;

  // Error Messages
  const emailError = document.getElementById("emailError");
  const passwordError = document.getElementById("passwordError");

  // Email Validation 
  let isValid = true;

  if (!emailRegex.test(email.value.trim())) {
    emailError.textContent = "Invalid email format";
    emailError.style.color = "red"; 
    email.style.border = "1px solid red";
    isValid = false;
  } else {
    emailError.textContent = "";
    email.style.border = "1px solid green";
  }

  // Password Validation
  const passwordValue = password.value.trim();
  if (!minLengthRegex.test(passwordValue)) {
    passwordError.textContent = "Password must be at least 8 characters";
    passwordError.style.color = "red";
    password.style.border = "1px solid red";
    isValid = false;
  } else if (!specialCharRegex.test(passwordValue)) {
    passwordError.textContent = "Password must contain a special character";
    passwordError.style.color = "red";
    password.style.border = "1px solid red";
    isValid = false;
  } else if (!numberRegex.test(passwordValue)) {
    passwordError.textContent = "Password must contain a number";
    passwordError.style.color = "red";
    password.style.border = "1px solid red";
    isValid = false;
  } else {
    passwordError.textContent = "";
    password.style.border = "1px solid green";
  }

  // If all validations pass, send data to backend
  if (isValid) {
    const loginData = {
      email: email.value.trim(),
      password: password.value.trim(),
    }; 

    // Send data to the backend using fetch
    fetch("/admin/login", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
      },
      body: JSON.stringify(loginData),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          
          window.location.href = "/admin/dashboard"; // Redirect on success
        } else {
          if (data.emailError) emailError.textContent = data.emailError;
          if (data.passwordError) passwordError.textContent = data.passwordError;
        }
      })
      .catch((err) => console.error("Error:", err));
 }
});