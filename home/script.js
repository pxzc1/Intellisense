const mobileMenuToggle = document.querySelector(".mobile-menu-toggle");
const mobileNav = document.querySelector(".mobile-nav");

mobileMenuToggle.addEventListener("click", () => {
  mobileMenuToggle.classList.toggle("active");
  mobileNav.classList.toggle("active");
});

document.querySelectorAll(".mobile-nav a").forEach((link) => {
  link.addEventListener("click", () => {
    mobileMenuToggle.classList.remove("active");
    mobileNav.classList.remove("active");
  });
});

document.addEventListener("click", (e) => {
  if (!mobileMenuToggle.contains(e.target) && !mobileNav.contains(e.target)) {
    mobileMenuToggle.classList.remove("active");
    mobileNav.classList.remove("active");
  }
});

document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener("click", function (e) {
    e.preventDefault();
    const targetId = this.getAttribute("href");
    if (targetId === "#") return;
    const target = document.querySelector(targetId);
    if (target) {
      target.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  });
});

window.addEventListener("scroll", () => {
  const header = document.querySelector("header");
  const scrolled = window.pageYOffset;
  if (scrolled > 50) {
    header.classList.add("scrolled");
  } else {
    header.classList.remove("scrolled");
  }
});

function updateActiveMenuItem() {
  const sections = document.querySelectorAll("section[id]");
  const navLinks = document.querySelectorAll(".nav-links a, .mobile-nav a");
  let currentSection = "";
  const scrollPos = window.pageYOffset + 100;
  sections.forEach((section) => {
    const sectionTop = section.offsetTop;
    const sectionHeight = section.offsetHeight;
    if (scrollPos >= sectionTop && scrollPos < sectionTop + sectionHeight) {
      currentSection = section.getAttribute("id");
    }
  });
  navLinks.forEach((link) => {
    link.classList.remove("active");
    if (link.getAttribute("href") === `#${currentSection}`) {
      link.classList.add("active");
    }
  });
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
  particle.style.width = Math.random() * 4 + 1 + "px";
  particle.style.height = particle.style.width;
  particle.style.background = ["#00ffff", "#ff0080", "#8000ff"][Math.floor(Math.random() * 3)];
  particle.style.borderRadius = "50%";
  particle.style.left = Math.random() * 100 + "%";
  particle.style.top = "100vh";
  particle.style.pointerEvents = "none";
  particle.style.zIndex = "-1";
  particle.style.boxShadow = `0 0 10px ${particle.style.background}`;
  document.body.appendChild(particle);
  const duration = Math.random() * 3000 + 2000;
  const drift = (Math.random() - 0.5) * 200;
  particle.animate(
    [
      { transform: "translateY(0px) translateX(0px)", opacity: 0 },
      { transform: `translateY(-100vh) translateX(${drift}px)`, opacity: 1 },
    ],
    { duration: duration, easing: "ease-out" }
  ).onfinish = () => particle.remove();
}
setInterval(createQuantumParticle, 1500);

const observerOptions = { threshold: 0.1, rootMargin: "0px 0px -50px 0px" };
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = "1";
      entry.target.style.transform = "translateY(0)";
    }
  });
}, observerOptions);
document.querySelectorAll(".timeline-content, .hexagon").forEach((el) => {
  el.style.opacity = "0";
  el.style.transform = "translateY(50px)";
  el.style.transition = "opacity 0.8s ease, transform 0.8s ease";
  observer.observe(el);
});

document.addEventListener('DOMContentLoaded', function() {
  const fileInput = document.getElementById('file-input');
  const imagePreview = document.getElementById('image-preview');
  const fileNameDisplay = document.getElementById('file-name-display');
  const submitBtn = document.getElementById('submit-btn');

  if (fileInput && imagePreview) {
    fileInput.addEventListener('change', function(event) {
      const file = event.target.files[0];
      if (file) {
        if (fileNameDisplay) {
          fileNameDisplay.textContent = `Selected: ${file.name}`;
          fileNameDisplay.style.opacity = '1';
        }
        const reader = new FileReader();
        reader.onload = (e) => {
          imagePreview.innerHTML = `<img src="${e.target.result}" alt="Preview" style="max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 10px;">`;
        };
        reader.readAsDataURL(file);
      } else {
        if (fileNameDisplay) {
          fileNameDisplay.textContent = 'No file selected.';
          fileNameDisplay.style.opacity = '0.7';
        }
        imagePreview.innerHTML = '<p style="color: #00ffff; opacity: 0.6;">Image preview will appear here</p>';
      }
    });
  }

  if (submitBtn) {
    submitBtn.addEventListener('click', async function(e) {
      e.preventDefault();
      if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
        alert('Please choose an image file');
        return;
      }
      const file = fileInput.files[0];
      const allowed = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowed.includes(file.type)) {
        alert(`Invalid file type: ${file.type}`);
        return;
      }
      try {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Processing...';
        const result = await flowerAPI.predictFlower(file);
        if (result.success) {
          alert(`Prediction: ${result.prediction}\nConfidence: ${result.confidence.toFixed(2)}%`);
          await displayFlowerInfo(result.prediction, result.confidence);
          submitBtn.textContent = 'Submission Completed';
          setTimeout(() => { submitBtn.textContent = 'Submit'; submitBtn.disabled = false; }, 2000);
        }
      } catch (error) {
        alert(`Error: ${error.message}`);
        submitBtn.textContent = 'Submit';
        submitBtn.disabled = false;
      }
    });
  }
});

async function displayFlowerInfo(flowerClass, confidence) {
  try {
    const response = await fetch('../informations.json');
    if (!response.ok) throw new Error(`Failed to load informations.json: ${response.status}`);
    const informations = await response.json();
    if (informations[flowerClass]) {
      const flowerData = informations[flowerClass];
      const flowerInfoSection = document.getElementById('flower-info');
      const flowerName = document.getElementById('flower-name');
      const flowerConfidence = document.getElementById('flower-confidence');
      const flowerInfoContent = document.getElementById('flower-info-content');
      flowerName.textContent = flowerClass.toUpperCase();
      flowerConfidence.textContent = `Confidence: ${confidence.toFixed(2)}%`;
      let infoHTML = '';
      for (const [key, value] of Object.entries(flowerData)) {
        infoHTML += `<div><strong>${key}</strong><p>${value}</p></div>`;
      }
      flowerInfoContent.innerHTML = infoHTML;
      flowerInfoSection.style.display = 'block';
      setTimeout(() => { flowerInfoSection.scrollIntoView({ behavior: 'smooth' }); }, 300);
    } else {
      alert(`Flower information not found for: ${flowerClass}`);
    }
  } catch (error) {
    alert(`Error fetching flower information: ${error.message}`);
  }
}