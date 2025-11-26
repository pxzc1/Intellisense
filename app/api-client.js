const BACKEND_URL = "https://backend-compute.up.railway.app";

/**
 * Send an image file to the backend for prediction.
 * @param {File} file - The image file selected by the user.
 * @returns {Promise<Object>} - JSON response from backend { name, confidence, characteristics }.
 */

export async function sendImage(file) {
    if (!file) throw new Error("No file provided");

    const formData = new FormData();
    formData.append("file", file);

    try {
        const response = await fetch(`${BACKEND_URL}/predict`, {
            method: "POST",
            body: formData,
        });

        if (!response.ok) {
            throw new Error(`Server error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error sending image:", error);
        throw error;
    }
}
