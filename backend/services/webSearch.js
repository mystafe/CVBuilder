const axios = require('axios');
const { logStep } = require('../utils/logger');

// A simple web search utility using a free API (e.g., SERP API or similar)
// Note: This is a basic implementation. For production, consider more robust error handling and API key management.

class WebSearch {
    constructor() {
        // In a real app, API key should come from environment variables
        this.apiKey = process.env.SERP_API_KEY || 'your_fallback_api_key';
        this.baseUrl = 'https://serpapi.com/search.json';
    }

    /**
     * Performs a web search using the specified query.
     * @param {string} query - The search query.
     * @returns {Promise<Array>} - A promise that resolves to an array of search results.
     */
    async search(query) {
        if (!this.apiKey || this.apiKey === 'your_fallback_api_key') {
            logStep('WebSearch: SERP_API_KEY is not configured. Skipping search.');
            return [];
        }

        logStep(`WebSearch: Performing search for "${query}"`);

        try {
            const params = {
                q: query,
                api_key: this.apiKey,
                engine: 'google',
                gl: 'us',
                hl: 'en'
            };

            const response = await axios.get(this.baseUrl, { params });

            if (response.data && response.data.organic_results) {
                logStep(`WebSearch: Found ${response.data.organic_results.length} organic results.`);
                // Return a simplified version of the results
                return response.data.organic_results.map(result => ({
                    title: result.title,
                    link: result.link,
                    snippet: result.snippet
                })).slice(0, 3); // Return top 3 results
            } else {
                logStep('WebSearch: No organic results found in API response.');
                return [];
            }
        } catch (error) {
            logStep(`WebSearch Error: Failed to perform search. ${error.message}`);
            // In case of error, return an empty array to not block the main flow
            return [];
        }
    }
}

module.exports = new WebSearch();
