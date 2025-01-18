document.getElementById("signUp-form").addEventListener("submit", (event) => {
  event.preventDefault();
  // Variables
  const name = document.getElementById("Uname");
  const email = document.getElementById("email-adress");
  const password = document.getElementById("password");
  const Cpassword = document.getElementById("C-password");

  // Regex Patterns
  const nameRegex = /^[a-zA-Z]+$/;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const minLengthRegex = /^.{8,}$/;
  const specialCharRegex = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/;
  const numberRegex = /\d/;

  // Error Messages
  const UnameError = document.getElementById("UnameError");
  const emailError = document.getElementById("emailError");
  const passwordError = document.getElementById("passwordError");
  const cPasswordError = document.getElementById("CpasswordError");


  let isValid = true;

  // Username Validation
  if(!nameRegex.test(name.value.trim())){
    UnameError.textContent = "Invalid username format";
  UnameError.style.color = "red"; 
  name.style.border = "1px solid red";
  isValid = false;
  }else{
    UnameError.textContent = "";
  name.style.border = "1px solid green";
  }


  // Email Validation
  

  if(!emailRegex.test(email.value.trim())){
    emailError.textContent = "Invalid email format";
  emailError.style.color = "red"; 
  email.style.border = "1px solid red";
  isValid = false;
  }else{
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

  // Confirm Password Validation
  
  const cPasswordValue = Cpassword.value.trim();

  if (cPasswordValue === "") {
    cPasswordError.textContent = "Confirm your password";
    cPasswordError.style.color = "red";
    Cpassword.style.border = "1px solid red";
    isValid = false;
  } else if (passwordValue !== cPasswordValue) {
    cPasswordError.textContent = "Passwords do not match";
    cPasswordError.style.color = "red";
    Cpassword.style.border = "1px solid red";
    isValid = false;
  } else {
    cPasswordError.textContent = "";
    Cpassword.style.border = "1px solid green";
  }

  if(isValid){
    const userdata= {
      name:name.value.trim(),
      email:email.value.trim(),
      password:password.value.trim(),
    };
    fetch("/user/register",{
      method:"POST",
      headers:{
        "Content-Type":"application/json",
      },
      body:JSON.stringify(userdata),
    })
    .then((response)=> response.json())
    .then((data)=>{
      console.log(`data:${data}`)
      if(data.success){

        window.location.href="/user/otp"

      }else{
        if (data.emailError) emailError.textContent = data.emailError;
        if (data.passwordError) passwordError.textContent = data.passwordError;
      }
    })
    .catch((err) => console.error("Error:", err));
  }
  
 
});



