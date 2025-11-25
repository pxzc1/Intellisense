class FlowerPredictionAPI {
  constructor() {
    this.baseUrl = this.getBaseUrl();
    this.timeout = 30000;
  }

  getBaseUrl() {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:3000/api';
    }
    return '/api';
  }

  async predictFlower(file) {
    if (!file) {
      throw new Error('No file provided');
    }

    if (!file.type.startsWith('image/')) {
      throw new Error('Invalid file type. Please upload an image.');
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new Error('File size exceeds 5MB limit');
    }

    const formData = new FormData();
    formData.append('flower_image', file);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      console.log('Sending request to:', `${this.baseUrl}/predict`);

      const response = await fetch(`${this.baseUrl}/predict`, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
        headers: {
          'Accept': 'application/json'
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorMessage = `Server error: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          console.error('Could not parse error response');
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Prediction failed');
      }

      return {
        success: true,
        prediction: data.prediction,
        confidence: data.confidence
      };

    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timeout. Server may be unresponsive.');
      }
      throw error;
    }
  }
}

const flowerAPI = new FlowerPredictionAPI();