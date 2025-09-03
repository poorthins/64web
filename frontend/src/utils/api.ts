const API_BASE_URL = 'http://localhost:5000/api';

export const apiClient = {
  async get(endpoint: string) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`);
    return response.json();
  },

  async post(endpoint: string, data: any) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return response.json();
  }
};

export const carbonAPI = {
  healthCheck: () => apiClient.get('/health'),
  calculateCarbon: (data: any) => apiClient.post('/carbon/calculate', data),
};