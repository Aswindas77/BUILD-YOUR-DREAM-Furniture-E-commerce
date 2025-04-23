document.getElementById("admin-loginForm").addEventListener("submit", (event) => {

  event.preventDefault();

  const email = document.getElementById("email");
  const password = document.getElementById("password");


  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const minLengthRegex = /^.{8,}$/;
  const specialCharRegex = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/;
  const numberRegex = /\d/;

  
  const emailError = document.getElementById("emailError");
  const passwordError = document.getElementById("passwordError");

 
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


  if (isValid) {
    const loginData = {
      email: email.value.trim(),
      password: password.value.trim(),
    }; 

   
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
          
          window.location.href = "/admin/dashboard"; 
        } else {
          if (data.emailError) emailError.textContent = data.emailError;
          if (data.passwordError) passwordError.textContent = data.passwordError;
        }
      })
      .catch((err) => console.error("Error:", err));
 }
});