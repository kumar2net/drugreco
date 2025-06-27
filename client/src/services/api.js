const API_URL = '/api';

class ApiService {
  // Search drugs with filters
  async searchDrugs({ query, category }) {
    const params = new URLSearchParams();
    if (query) params.append('query', query);
    if (category) params.append('category', category);
    const response = await fetch(`${API_URL}/search?${params.toString()}`);
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    return response.json();
  }

  // Get drug details with alternatives
  async getDrugDetails(drugName, category) {
    // This will now be handled by the main search, and details are passed as props.
    // This function can be simplified or removed if details are always in the search result.
    const response = await this.searchDrugs({ query: drugName, category });
    const drug = response[0];
    if (!drug) {
      throw new Error('Drug not found');
    }
    // Simulate fetching alternatives for now
    const altsResponse = await this.searchDrugs({ category: drug.category });
    drug.alternatives = altsResponse.filter(d => d.name !== drug.name).slice(0, 3);
    return drug;
  }

  // Get drug interactions
  async checkInteraction(drug1, drug2) {
    // This can be a new endpoint on the backend in the future.
    // For now, we'll keep the simulation.
    const severity = Math.random() > 0.5 ? 'Moderate' : 'Mild';
    return {
      severity,
      description: `A simulated ${severity.toLowerCase()} interaction was found between ${drug1} and ${drug2}.`
    };
  }

  // Get category statistics
  async getCategoryStats() {
    const response = await fetch(`${API_URL}/stats`);
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    return response.json();
  }

  // Get trending drugs
  async getTrendingDrugs() {
    const response = await fetch(`${API_URL}/trending`);
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    return response.json();
  }

  async getCategories() {
    const response = await fetch(`${API_URL}/categories`);
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    return response.json();
  }

  async getDrugsByNames(names) {
    const response = await fetch(`${API_URL}/drugs/by-names`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ names })
    });
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    return response.json();
  }
}

export const apiService = new ApiService(); 
 