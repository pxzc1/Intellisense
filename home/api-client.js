class FlowerPredictionAPI {
    constructor() {
        this.baseUrl = window.location.hostname.includes("localhost") 
            ? "http://localhost:3000/api" 
            : "/api";
    }
    async predictFlower(file) {
        const formData = new FormData();
        formData.append("flower_image", file);
        const res = await fetch(`${this.baseUrl}/predict`, {
            method: "POST",
            body: formData
        });
        if (!res.ok) throw new Error("Server error " + res.status);
        return await res.json();
    }
}

const flowerAPI = new FlowerPredictionAPI();