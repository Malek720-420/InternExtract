    export const apiModel = {
        // IMPORTANT: Replace 'YOUR_API_KEY_HERE' with your actual API key.
        // This key is used for all API calls in this model.
        apiKey: 'AIzaSyC6tU_rS94I7ul-yz-470v9b3lEBLSQGSk',

        /**
         * Tests the connection to the Gemini API with a simple, non-destructive request.
         * @returns {Promise<boolean>} True if the connection is successful, false otherwise.
         */
        async testConnection() {
            // Simple prompt to test if the API is reachable and responding.
            const promptText = "Say hello!";
            
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${this.apiKey}`;

            const payload = {
                contents: [{ parts: [{ text: promptText }] }]
            };

            try {
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                // If the response is 'ok', the connection is successful.
                return response.ok;

            } catch (error) {
                console.error('API Test Connection Error:', error);
                return false;
            }
        },
        
        /**
         * Extracts structured data from a given text prompt using the Gemini API.
         * @param {string} promptText The text content to be analyzed.
         * @param {number} retries The number of remaining retries. Defaults to 3.
         * @returns {Promise<object|null>} A promise that resolves to the extracted JSON object, or null on error.
         */
        async extractData(promptText, retries = 3) {
            if (!this.apiKey || this.apiKey === 'YOUR_API_KEY_HERE') {
                console.error('API Key is missing. Please provide a valid key in apiModel.js.');
                return null;
            }

            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${this.apiKey}`;
            
            const structuredResponseSchema = {
                type: "OBJECT",
                properties: {
                    "jobTitle": { "type": "STRING" },
                    "company": { "type": "STRING" },
                    "location": { "type": "STRING" },
                    "jobType": { "type": "STRING" },
                    "responsibilities": { "type": "ARRAY", "items": { "type": "STRING" } },
                    "requirements": { "type": "ARRAY", "items": { "type": "STRING" } },
                    "benefits": { "type": "ARRAY", "items": { "type": "STRING" } },
                    "applicationDeadline": { "type": "STRING" }
                },
                "propertyOrdering": [
                    "jobTitle",
                    "company",
                    "location",
                    "jobType",
                    "responsibilities",
                    "requirements",
                    "benefits",
                    "applicationDeadline"
                ]
            };

            const payload = {
                contents: [{
                    parts: [{
                        text: `Extract the following information from the job offer text and return it as a JSON object: jobTitle, company, location, jobType, responsibilities (as an array of strings), requirements (as an array of strings), benefits (as an array of strings), and applicationDeadline. If a field is not found, use a short, descriptive string like "Not specified". Here is the job offer text: \n\n${promptText}`
                    }]
                }],
                generationConfig: {
                    responseMimeType: "application/json",
                    responseSchema: structuredResponseSchema,
                }
            };

            try {
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    if (retries > 0 && (response.status === 429 || response.status >= 500)) {
                        const delay = Math.pow(2, 3 - retries) * 1000;
                        console.warn(`API call failed with status ${response.status}. Retrying in ${delay}ms...`);
                        await new Promise(res => setTimeout(res, delay));
                        return this.extractData(promptText, retries - 1);
                    }
                    console.error(`Final API Error: ${response.status} ${response.statusText}`);
                    return null;
                }

                const result = await response.json();
                
                if (result.candidates && result.candidates.length > 0 &&
                    result.candidates[0].content && result.candidates[0].content.parts &&
                    result.candidates[0].content.parts.length > 0) {
                    
                    const jsonText = result.candidates[0].content.parts[0].text;
                    const parsedData = JSON.parse(jsonText);
                    return parsedData;

                } else {
                    console.error("API response structure unexpected:", result);
                    return null;
                }
            } catch (error) {
                console.error('Network or parsing error:', error);
                return null;
            }
        }
    };
