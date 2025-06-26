// API 설정
const API_CONFIG = {
  // YouTube Reporter API (포트 8001)
  REPORTER_API: {
    BASE_URL: process.env.REACT_APP_REPORTER_API_URL || 'http://localhost:8000',
    ENDPOINTS: {
      YOUTUBE_ANALYSIS: '/youtube/analysis',
      YOUTUBE_SEARCH: '/youtube/search',
      DOCUMENT_ANALYSIS: '/analysis/document',
      ANALYSIS_STATUS: '/analysis',
      AUDIO_GENERATE: '/audio/generate',
      AUDIO_STREAM: '/audio/stream',
      REPORTS: '/reports',
      S3_LIST: '/s3/list',
      AUTH: '/auth',
      USER_ANALYSIS: '/user-analysis'
    }
  },
  
  // Bedrock Chatbot API (포트 8000)
  BEDROCK_API: {
    BASE_URL: process.env.REACT_APP_BEDROCK_API_URL || 'http://localhost:8000',
    ENDPOINTS: {
      CHAT: '/api/chat',
      PROCESS_YOUTUBE: '/api/process-youtube',
      CHAT_HISTORY: '/api/chat-history',
      CLEAR_HISTORY: '/api/chat-history'
    }
  }
};

// API 호출 헬퍼 함수들
export const apiHelpers = {
  // YouTube Reporter API 호출 
  reporterApi: {
     // --- 토큰 포함 버전 --- 로컬에서 할 때는 프론트에 토큰을 헤더에 받아와서 저장을 해줘야됨. 
     // 조윤지 코드 추가를 해줌. 분석이 잘 되는 걸 확인함
      async getToken() {
        return localStorage.getItem('access_token');
      },
  
      async post(endpoint, data, config = {}) {
        const url = `${API_CONFIG.REPORTER_API.BASE_URL}${endpoint}`;
        const token = await this.getToken();
        return await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
            ...config.headers
          },
          body: JSON.stringify(data),
          ...config
        });
      },
  
      async get(endpoint, config = {}) {
        const url = `${API_CONFIG.REPORTER_API.BASE_URL}${endpoint}`;
        const token = await this.getToken();
        return await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
            ...config.headers
          },
          ...config
        });
      },
  
      async uploadFile(endpoint, formData, config = {}) {
        const url = `${API_CONFIG.REPORTER_API.BASE_URL}${endpoint}`;
        const token = await this.getToken();
        return await fetch(url, {
          method: 'POST',
          headers: {
            ...(token && { 'Authorization': `Bearer ${token}` }),
            ...config.headers
          },
          body: formData,
          ...config
        });
      },
    /*async post(endpoint, data, config = {}) {
      const url = `${API_CONFIG.REPORTER_API.BASE_URL}${endpoint}`;
      return await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...config.headers
        },
        body: JSON.stringify(data),
        ...config
      });
    },

    
    async get(endpoint, config = {}) {
      const url = `${API_CONFIG.REPORTER_API.BASE_URL}${endpoint}`;
      return await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...config.headers
        },
        ...config
      });
    },
    
    async uploadFile(endpoint, formData, config = {}) {
      const url = `${API_CONFIG.REPORTER_API.BASE_URL}${endpoint}`;
      return await fetch(url, {
        method: 'POST',
        headers: {
          ...config.headers
        },
        body: formData,
        ...config
      });
    }*/
  
  },
  
  // Bedrock Chatbot API 호출
  bedrockApi: {
    async post(endpoint, data, config = {}) {
      const url = `${API_CONFIG.BEDROCK_API.BASE_URL}${endpoint}`;
      return await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...config.headers
        },
        body: JSON.stringify(data),
        ...config
      });
    },
    
    async get(endpoint, config = {}) {
      const url = `${API_CONFIG.BEDROCK_API.BASE_URL}${endpoint}`;
      return await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...config.headers
        },
        ...config
      });
    },
    
    async delete(endpoint, config = {}) {
      const url = `${API_CONFIG.BEDROCK_API.BASE_URL}${endpoint}`;
      return await fetch(url, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...config.headers
        },
        ...config
      });
    }
  }
};

// 통합 API 서비스
export const apiService = {
  // YouTube 분석 (Reporter API 사용)
  async analyzeYouTube(youtubeUrl) {
    const response = await apiHelpers.reporterApi.post(
      API_CONFIG.REPORTER_API.ENDPOINTS.YOUTUBE_ANALYSIS,
      { youtube_url: youtubeUrl }
    );
    return await response.json();
  },
  
  // YouTube 검색 (Reporter API 사용)
  async searchYouTube(query, maxResults = 10) {
    const response = await apiHelpers.reporterApi.post(
      API_CONFIG.REPORTER_API.ENDPOINTS.YOUTUBE_SEARCH,
      { query, max_results: maxResults }
    );
    return await response.json();
  },
  
  // 문서 분석 (Reporter API 사용)
  async analyzeDocument(file) {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiHelpers.reporterApi.uploadFile(
      API_CONFIG.REPORTER_API.ENDPOINTS.DOCUMENT_ANALYSIS,
      formData
    );
    return await response.json();
  },
  
  // Bedrock 챗봇 질문 (Bedrock API 사용)
  async askBedrockChatbot(question) {
    const response = await apiHelpers.bedrockApi.post(
      API_CONFIG.BEDROCK_API.ENDPOINTS.CHAT,
      { question }
    );
    return await response.json();
  },
  
  // YouTube 처리 (Bedrock API 사용)
  async processYouTubeForChatbot(youtubeUrl) {
    const response = await apiHelpers.bedrockApi.post(
      API_CONFIG.BEDROCK_API.ENDPOINTS.PROCESS_YOUTUBE,
      { youtube_url: youtubeUrl }
    );
    return await response.json();
  },
  
  // 채팅 히스토리 조회 (Bedrock API 사용)
  async getChatHistory() {
    const response = await apiHelpers.bedrockApi.get(
      API_CONFIG.BEDROCK_API.ENDPOINTS.CHAT_HISTORY
    );
    return await response.json();
  },
  
  // 채팅 히스토리 삭제 (Bedrock API 사용)
  async clearChatHistory() {
    const response = await apiHelpers.bedrockApi.delete(
      API_CONFIG.BEDROCK_API.ENDPOINTS.CLEAR_HISTORY
    );
    return await response.json();
  }
};

export default API_CONFIG; 