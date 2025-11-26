class FlowerPredictionAPI {
  constructor() {
    this.baseUrl = 'https://railway-production-4b08.up.railway.app/api';
  }

  async predictFlower(file) {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${this.baseUrl}/predict`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Server error: ${response.status} - ${text}`);
      }

      const data = await response.json();

      if (!data.prediction || data.confidence === undefined) {
        throw new Error('Invalid response format from server');
      }

      return {
        success: true,
        prediction: data.prediction.toLowerCase(),
        confidence: Number(data.confidence)
      };
    } catch (error) {
      console.error('Error in predictFlower:', error);
      return {
        success: false,
        prediction: null,
        confidence: 0,
        error: error.message
      };
    }
  }
}

export const flowerAPI = new FlowerPredictionAPI();
if (typeof window !== "undefined") {
  window.flowerAPI = flowerAPI;
}
