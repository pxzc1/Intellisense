const mobileMenuToggle = document.querySelector(".mobile-menu-toggle");
const mobileNav = document.querySelector(".mobile-nav");

mobileMenuToggle.addEventListener("click", () => {
  mobileMenuToggle.classList.toggle("active");
  mobileNav.classList.toggle("active");
});

document.querySelectorAll(".mobile-nav a").forEach(link => {
  link.addEventListener("click", () => {
    mobileMenuToggle.classList.remove("active");
    mobileNav.classList.remove("active");
  });
});

document.addEventListener("click", e => {
  if (!mobileMenuToggle.contains(e.target) && !mobileNav.contains(e.target)) {
    mobileMenuToggle.classList.remove("active");
    mobileNav.classList.remove("active");
  }
});

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener("click", function(e) {
    e.preventDefault();
    const targetId = this.getAttribute("href");
    if (targetId === "#") return;
    const target = document.querySelector(targetId);
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
  });
});

window.addEventListener("scroll", () => {
  const header = document.querySelector("header");
  header.classList.toggle("scrolled", window.pageYOffset > 50);
});

function updateActiveMenuItem() {
  const sections = document.querySelectorAll("section[id]");
  const navLinks = document.querySelectorAll(".nav-links a, .mobile-nav a");
  let currentSection = "";
  const scrollPos = window.pageYOffset + 100;
  sections.forEach(section => {
    if (scrollPos >= section.offsetTop && scrollPos < section.offsetTop + section.offsetHeight) {
      currentSection = section.getAttribute("id");
    }
  });
  navLinks.forEach(link => link.classList.toggle("active", link.getAttribute("href") === `#${currentSection}`));
}

window.addEventListener("scroll", updateActiveMenuItem);
window.addEventListener("load", updateActiveMenuItem);

window.addEventListener("scroll", () => {
  const shapes = document.querySelectorAll(".shape");
  const scrolled = window.pageYOffset;
  shapes.forEach((shape, index) => {
    const speed = (index + 1) * 0.3;
    shape.style.transform = `translateY(${scrolled * speed}px) rotate(${scrolled * 0.1}deg)`;
  });
});

const neuralLines = document.querySelectorAll(".neural-line");
setInterval(() => {
  neuralLines.forEach((line, index) => {
    setTimeout(() => {
      line.style.opacity = "1";
      line.style.transform = "scaleX(1.2)";
      setTimeout(() => {
        line.style.opacity = "0.2";
        line.style.transform = "scaleX(0.5)";
      }, 200);
    }, index * 300);
  });
}, 2000);

function createQuantumParticle() {
  const particle = document.createElement("div");
  particle.style.position = "fixed";
  particle.style.width = `${Math.random() * 4 + 1}px`;
  particle.style.height = particle.style.width;
  particle.style.background = ["#00ffff", "#ff0080", "#8000ff"][Math.floor(Math.random() * 3)];
  particle.style.borderRadius = "50%";
  particle.style.left = `${Math.random() * 100}%`;
  particle.style.top = "100vh";
  particle.style.pointerEvents = "none";
  particle.style.zIndex = "-1";
  particle.style.boxShadow = `0 0 10px ${particle.style.background}`;
  document.body.appendChild(particle);
  const duration = Math.random() * 3000 + 2000;
  const drift = (Math.random() - 0.5) * 200;
  particle.animate(
    [{ transform: "translateY(0px) translateX(0px)", opacity: 0 }, { transform: `translateY(-100vh) translateX(${drift}px)`, opacity: 1 }],
    { duration, easing: "ease-out" }
  ).onfinish = () => particle.remove();
}
setInterval(createQuantumParticle, 1500);

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = "1";
      entry.target.style.transform = "translateY(0)";
    }
  });
}, { threshold: 0.1, rootMargin: "0px 0px -50px 0px" });

document.querySelectorAll(".timeline-content, .hexagon").forEach(el => {
  el.style.opacity = "0";
  el.style.transform = "translateY(50px)";
  el.style.transition = "opacity 0.8s ease, transform 0.8s ease";
  observer.observe(el);
});

document.addEventListener("DOMContentLoaded", () => {
  const fileInput = document.getElementById("file-input");
  const imagePreview = document.getElementById("image-preview");
  const fileNameDisplay = document.getElementById("file-name-display");
  const submitBtn = document.getElementById("submit-btn");

  if (fileInput && imagePreview) {
    fileInput.addEventListener("change", e => {
      const file = e.target.files[0];
      if (file) {
        if (fileNameDisplay) fileNameDisplay.textContent = `Selected: ${file.name}`, fileNameDisplay.style.opacity = "1";
        const reader = new FileReader();
        reader.onload = ev => imagePreview.innerHTML = `<img src="${ev.target.result}" alt="Preview" style="max-width:100%; max-height:100%; object-fit:contain; border-radius:10px;">`;
        reader.readAsDataURL(file);
      } else {
        if (fileNameDisplay) fileNameDisplay.textContent = "No file selected.", fileNameDisplay.style.opacity = "0.7";
        imagePreview.innerHTML = '<p style="color: #00ffff; opacity: 0.6;">Image preview will appear here</p>';
      }
    });
  }

  if (submitBtn) {
    submitBtn.addEventListener("click", async e => {
      e.preventDefault();
      if (!fileInput?.files?.length) return alert("Please choose an image file");
      const file = fileInput.files[0];
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return alert(`Invalid file type: ${file.type}`);
      try {
        submitBtn.disabled = true;
        submitBtn.textContent = "Processing...";
        const result = await flowerAPI.predictFlower(file);
        if (result.success) {
          alert(`Prediction: ${result.prediction}\nConfidence: ${result.confidence.toFixed(2)}%`);
          await displayFlowerInfo(result.prediction, result.confidence);
          submitBtn.textContent = "Submission Completed";
          setTimeout(() => { submitBtn.textContent = "Submit"; submitBtn.disabled = false; }, 2000);
        }
      } catch (err) {
        alert(`Error: ${err.message}`);
        submitBtn.textContent = "Submit";
        submitBtn.disabled = false;
      }
    });
  }
});

async function displayFlowerInfo(flowerClass, confidence) {
  try {
    const res = await fetch("../informations.json");
    if (!res.ok) throw new Error(`Failed to load informations.json: ${res.status}`);
    const infos = await res.json();
    if (infos[flowerClass]) {
      const data = infos[flowerClass];
      const section = document.getElementById("flower-info");
      document.getElementById("flower-name").textContent = flowerClass.toUpperCase();
      document.getElementById("flower-confidence").textContent = `Confidence: ${confidence.toFixed(2)}%`;
      let html = "";
      for (const [k, v] of Object.entries(data)) html += `<div><strong>${k}</strong><p>${v}</p></div>`;
      document.getElementById("flower-info-content").innerHTML = html;
      section.style.display = "block";
      setTimeout(() => section.scrollIntoView({ behavior: "smooth" }), 300);
    } else alert(`Flower information not found for: ${flowerClass}`);
  } catch (err) {
    alert(`Error fetching flower information: ${err.message}`);
  }
}
