document.addEventListener('DOMContentLoaded', () => {
    const menuToggle = document.querySelector('.mobile-menu-toggle');
    const navMenu = document.querySelector('.nav-links');
    const navLinks = document.querySelectorAll('nav a');
    const sections = document.querySelectorAll('section');
    const header = document.querySelector('header');
    const themeToggle = document.getElementById('themeToggle');
    const animatedElements = document.querySelectorAll('.animate');
    const bgElements = document.querySelectorAll('.parallax');

    if (menuToggle && navMenu) {
        menuToggle.addEventListener('click', () => {
            navMenu.classList.toggle('active');
            menuToggle.classList.toggle('active');
        });
    }

    window.addEventListener('scroll', () => {
        const scrollY = window.scrollY;
        sections.forEach(section => {
            const top = section.offsetTop - 50;
            const height = section.offsetHeight;
            const id = section.getAttribute('id');
            if (scrollY >= top && scrollY < top + height) {
                navLinks.forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === `#${id}`) link.classList.add('active');
                });
            }
        });

        if (header) {
            if (scrollY > 100) header.classList.add('scrolled');
            else header.classList.remove('scrolled');
        }

        bgElements.forEach(el => {
            const speed = parseFloat(el.getAttribute('data-speed')) || 0.5;
            el.style.transform = `translateY(${scrollY * speed}px)`;
        });
    });

    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) entry.target.classList.add('visible');
            else entry.target.classList.remove('visible');
        });
    }, { threshold: 0.1 });

    animatedElements.forEach(el => observer.observe(el));

    const cursor = document.createElement('div');
    cursor.id = 'customCursor';
    document.body.appendChild(cursor);

    document.addEventListener('mousemove', e => {
        cursor.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
    });

    if (themeToggle) themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-theme');
    });

    const fileInput = document.getElementById('file-input');
    const fileNameDisplay = document.getElementById('file-name-display');
    const imagePreview = document.getElementById('image-preview');
    const submitBtn = document.getElementById('submit-btn');

    fileInput.addEventListener('change', () => {
        const file = fileInput.files[0];
        if (file) {
            fileNameDisplay.textContent = file.name;
            const reader = new FileReader();
            reader.onload = e => {
                imagePreview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
            };
            reader.readAsDataURL(file);
            submitBtn.disabled = false;
        } else {
            fileNameDisplay.textContent = 'No file selected.';
            imagePreview.innerHTML = `<p style="color: #00ffff; opacity: 0.6;">Image preview will appear here</p>`;
            submitBtn.disabled = true;
        }
    });

    submitBtn.addEventListener('click', async () => {
        const file = fileInput.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('image', file);

        try {
            const response = await fetch('/predict', {
                method: 'POST',
                body: formData
            });
            const result = await response.json();

            const flowerSection = document.getElementById('flower-info');
            const flowerName = document.getElementById('flower-name');
            const flowerConfidence = document.getElementById('flower-confidence');
            const flowerInfoContent = document.getElementById('flower-info-content');

            flowerName.textContent = result.class;
            flowerConfidence.textContent = `Confidence: ${result.confidence}%`;

            const infoResponse = await fetch('informations.json');
            const infos = await infoResponse.json();
            const flowerData = infos[result.class] || [];

            flowerInfoContent.innerHTML = '';
            flowerData.forEach(char => {
                const div = document.createElement('div');
                div.innerHTML = `<strong>${char.title}</strong><p>${char.detail}</p>`;
                flowerInfoContent.appendChild(div);
            });

            flowerSection.style.display = 'block';
        } catch (err) {
            console.error('Error sending image:', err);
        }
    });
});
