document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("port-form");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const formData = new FormData(form);
      const button = form.querySelector("button");
      const originalText = button.textContent;
      button.textContent = "Connecting...";
      button.disabled = true;

      // Clear all localStorage and sessionStorage data
      localStorage.clear();
      sessionStorage.clear();

      fetch(form.action, {
        method: form.method,
        body: formData,
      })
        .then((response) => {
          if (response.redirected) {
            window.location.href = response.url;
          } else {
            button.textContent = originalText;
            button.disabled = false;
            alert(
              "Failed to configure proxy. Please check the port and try again."
            );
          }
        })
        .catch((error) => {
          console.error("Error submitting form:", error);
          button.textContent = originalText;
          button.disabled = false;
          alert("An error occurred while configuring the proxy.");
        });
    });
  }
});
