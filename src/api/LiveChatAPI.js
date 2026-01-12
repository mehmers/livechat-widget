/**
 * LiveChat API Client
 */
export class LiveChatAPI {
  constructor(config) {
    this.baseUrl = config.apiUrl;
    this.token = config.token;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'X-LiveChat-Token': this.token,
      ...options.headers,
    };

    // Don't set Content-Type for FormData
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'API request failed');
    }

    return data;
  }

  // Get widget configuration
  async getConfig() {
    return this.request('/livechat/config');
  }

  // Initialize session with user info
  async initSession(userData) {
    return this.request('/livechat/init', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  // Send text message
  async sendMessage(externalUserId, message, object = null) {
    const body = {
      external_user_id: externalUserId,
      message,
    };

    if (object) {
      body.object = object;
    }

    return this.request('/livechat/message', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  // Send file message
  async sendFile(externalUserId, file, message = '') {
    const formData = new FormData();
    formData.append('external_user_id', externalUserId);
    formData.append('file', file);
    if (message) {
      formData.append('message', message);
    }

    return this.request('/livechat/message', {
      method: 'POST',
      body: formData,
    });
  }

  // Get chat history
  async getHistory(externalUserId) {
    return this.request(`/livechat/history/${externalUserId}`);
  }
}

export default LiveChatAPI;
