const API = {
  YOUTUBE_API: {
    BASE_URL: process.env.REACT_APP_API_SERVER_URL || 'http://localhost:8000',
    ENDPOINTS: {
      SEARCH: '/youtube/search',
      ANALYZE: '/youtube/analyze',
      JOB_STATUS: (jobId) => `/youtube/jobs/${jobId}/status`,
      JOB_RESULT: (jobId) => `/youtube/jobs/${jobId}/result`
    }
  }
};

const apiClient = {
  async getToken() {
    return localStorage.getItem('id_token');
  },

  async post(endpoint, data, config = {}) {
    const token = await this.getToken();
    const headers = {
      Authorization: token ? `Bearer ${token}` : '',
      ...config.headers,
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(data),
    });

    return response.json();
  },

  async get(endpoint, config = {}) {
    const token = await this.getToken();
    const headers = {
      Authorization: token ? `Bearer ${token}` : '',
      ...config.headers,
    };

    const response = await fetch(endpoint, {
      method: 'GET',
      headers,
    });

    return response.json();
  }
};

export { API, apiClient as apiService };
