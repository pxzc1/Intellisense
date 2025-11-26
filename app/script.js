const menuToggle = document.querySelector('.menu-toggle');
const navLinks = document.querySelector('.nav-links');
menuToggle.addEventListener('click', () => navLinks.classList.toggle('active'));

document.querySelectorAll('.scroll-btn').forEach(btn => {
    btn.addEventListener('click', e => {
        e.preventDefault();
        const target = document.querySelector(btn.getAttribute('href'));
        target.scrollIntoView({ behavior: 'smooth' });
    });
});

const imageInput = document.getElementById('flower-image');
const previewImage = document.getElementById('preview');
const submitBtn = document.getElementById('submit-btn');
const resultSection = document.getElementById('flower-result');
const flowerName = document.getElementById('flower-name');
const flowerConfidence = document.getElementById('flower-confidence');
const flowerCharacteristics = document.getElementById('flower-characteristics');

imageInput.addEventListener('change', () => {
    const file = imageInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => previewImage.src = e.target.result;
    reader.readAsDataURL(file);
});

submitBtn.addEventListener('click', async () => {
    const file = imageInput.files[0];
    if (!file) return alert('Please select an image!');

    const formData = new FormData();
    formData.append('image', file);

    try {
        const response = await fetch('/predict', { method: 'POST', body: formData });
        const data = await response.json();
        flowerName.textContent = data.name;
        flowerConfidence.textContent = `${(data.confidence * 100).toFixed(2)}%`;
        flowerCharacteristics.textContent = data.characteristics || 'N/A';
        resultSection.style.display = 'block';
        resultSection.scrollIntoView({ behavior: 'smooth' });
    } catch (err) {
        console.error(err);
        alert('Prediction failed. Try again.');
    }
});

document.querySelectorAll('.hexagon').forEach(hex => {
    hex.addEventListener('mouseenter', () => hex.classList.add('active'));
    hex.addEventListener('mouseleave', () => hex.classList.remove('active'));
});

const shapes = document.querySelectorAll('.floating-shape');
function animateShapes() {
    shapes.forEach((shape, i) => {
        const t = Date.now() / 2000 + i;
        shape.style.transform = `translate(${Math.sin(t) * 30}px, ${Math.cos(t) * 20}px) rotate(${t * 50}deg)`;
    });
    requestAnimationFrame(animateShapes);
}
animateShapes();

const neuralCanvas = document.getElementById('neural-background');
const ctx = neuralCanvas.getContext('2d');

function resizeCanvas() { 
    neuralCanvas.width = window.innerWidth; 
    neuralCanvas.height = window.innerHeight; 
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

const nodes = Array.from({ length: 50 }, () => ({
    x: Math.random() * neuralCanvas.width,
    y: Math.random() * neuralCanvas.height,
    vx: (Math.random() - 0.5) * 0.5,
    vy: (Math.random() - 0.5) * 0.5
}));

function drawNeuralBackground() {
    ctx.clearRect(0, 0, neuralCanvas.width, neuralCanvas.height);
    nodes.forEach((node, i) => {
        node.x += node.vx; node.y += node.vy;
        if (node.x < 0 || node.x > neuralCanvas.width) node.vx *= -1;
        if (node.y < 0 || node.y > neuralCanvas.height) node.vy *= -1;

        ctx.beginPath();
        ctx.arc(node.x, node.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();

        for (let j = i + 1; j < nodes.length; j++) {
            const dx = node.x - nodes[j].x;
            const dy = node.y - nodes[j].y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 100) {
                ctx.beginPath();
                ctx.moveTo(node.x, node.y);
                ctx.lineTo(nodes[j].x, nodes[j].y);
                ctx.strokeStyle = `rgba(255,255,255,${1 - dist / 100})`;
                ctx.lineWidth = 1;
                ctx.stroke();
            }
        }
    });
    requestAnimationFrame(drawNeuralBackground);
}
drawNeuralBackground();

const gradientText = document.querySelectorAll('.gradient-text');
let hue = 0;
function animateGradientText() {
    hue += 0.5;
    gradientText.forEach(el => {
        el.style.background = `linear-gradient(90deg, hsl(${hue}, 80%, 60%), hsl(${(hue+60)%360}, 80%, 60%))`;
        el.style.backgroundClip = 'text';
        el.style.webkitBackgroundClip = 'text';
        el.style.color = 'transparent';
    });
    requestAnimationFrame(animateGradientText);
}
animateGradientText();

const fadeSections = document.querySelectorAll('.fade-section');
const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
        if (entry.isIntersecting) entry.target.classList.add('visible');
    });
}, { threshold: 0.1 });

fadeSections.forEach(section => observer.observe(section));