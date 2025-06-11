document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("port-form");
  const tokenInput = document.getElementById("zrok_token");
  const portInput = document.getElementById("zrok_port");
  const tokenInputs = document.querySelector(".token-inputs");
  const radioButtons = document.querySelectorAll('input[name="zrok_option"]');

  // Initially hide the token inputs
  tokenInputs.style.display = "none";

  radioButtons.forEach((radio) => {
    radio.addEventListener("change", () => {
      const isCustom = radio.value === "custom";
      tokenInput.disabled = !isCustom;
      portInput.disabled = !isCustom;
      tokenInputs.style.display = isCustom ? "block" : "none";

      if (isCustom) {
        tokenInput.focus();
      }
    });
  });

  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const formData = new FormData(form);
      const button = form.querySelector("button");
      const originalText = button.textContent;
      button.textContent = "Connecting...";
      button.disabled = true;

      fetch(form.action, {
        method: form.method,
        body: formData,
      })
        .then((response) => {
          if (response.ok) {
            clearAllData()
              .then(() => {
                window.location.href = "/inspector/dashboard";
              })
              .catch((error) => {
                console.error("Failed to clear data:", error);
                showError("Failed to clear data: " + error.message);
              });
          } else {
            return response.text().then((text) => {
              throw new Error(text);
            });
          }
        })
        .catch((error) => {
          showError("Failed to connect: " + error.message);
          alert("Error: " + error.message);
          button.textContent = originalText;
          button.disabled = false;
        });
    });
  }
});
