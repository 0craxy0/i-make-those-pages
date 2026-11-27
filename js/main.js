const EMAIL = "lennyvincentsingh@gmail.com";
document.getElementById("yr").textContent = new Date().getFullYear();
document.getElementById("contactForm").addEventListener("submit", e => {
  e.preventDefault();
  const f = new FormData(e.target);
  const subject = `Startup page enquiry: ${f.get("startup") || f.get("name")}`;
  const body = `Name: ${f.get("name")}\nEmail: ${f.get("email")}\nStartup: ${f.get("startup")}\nNeed: ${f.get("need")}\n\n${f.get("message")}`;
  location.href = `mailto:${EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
});
