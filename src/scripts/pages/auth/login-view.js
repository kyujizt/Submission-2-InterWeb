const LoginView = {
  setupLoginForm(callback) {
    const form = document.querySelector("#login-form");
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const email = document.querySelector("#email").value;
      const password = document.querySelector("#password").value;
      callback(email, password);
    });
  },

  showError(message) {
    document.querySelector(".error-message").textContent = message;
  },

  redirectToHome() {
    window.location.hash = "/home";
  },
};

export default LoginView;
