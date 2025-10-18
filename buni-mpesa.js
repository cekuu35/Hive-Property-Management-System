/**
 * Buni/KCB M-Pesa API Integration
 * This service handles M-Pesa payments using the Buni/KCB API
 */

class BuniMpesaAPI {
  constructor(apiKey, environment = 'sandbox') {
    this.apiKey = apiKey;
    this.accessToken = null;
    this.tokenExpiry = 0;
    this.baseURL = environment === 'sandbox' 
      ? 'https://sandbox.buni.kcbgroup.com'
      : 'https://api.buni.kcbgroup.com';
  }

  /**
   * Get access token using the API key
   */
  async getAccessToken() {
    // Check if we have a valid cached token
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      console.log('🔑 Getting Buni/KCB access token...');
      
      // Try different authentication methods
      const authMethods = [
        {
          name: 'Bearer Token',
          headers: { 'Authorization': `Bearer ${this.apiKey}` }
        },
        {
          name: 'API Key Header',
          headers: { 'X-API-Key': this.apiKey }
        },
        {
          name: 'Custom Header',
          headers: { 'X-Auth-Token': this.apiKey }
        }
      ];

      for (const method of authMethods) {
        try {
          const response = await fetch(`${this.baseURL}/oauth2/v1/generate?grant_type=client_credentials`, {
            method: 'GET',
            headers: {
              ...method.headers,
              'Content-Type': 'application/json'
            }
          });

          if (response.ok) {
            const data = await response.json();
            this.accessToken = data.access_token;
            this.tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // 1 minute buffer
            
            console.log(`✅ Access token obtained using ${method.name}`);
            return this.accessToken;
          }
        } catch (error) {
          console.log(`❌ ${method.name} failed:`, error.message);
        }
      }

      throw new Error('All authentication methods failed');

    } catch (error) {
      console.error('❌ Error getting Buni/KCB access token:', error);
      throw error;
    }
  }

  /**
   * Generate password for STK Push
   */
  generatePassword(shortcode, passkey, timestamp) {
    const passwordString = `${shortcode}${passkey}${timestamp}`;
    return Buffer.from(passwordString).toString('base64');
  }

  /**
   * Initiate STK Push payment
   */
  async initiateSTKPush(request) {
    try {
      const accessToken = await this.getAccessToken();
      const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3);
      const passkey = process.env.DARAJA_PASSKEY || 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919';
      
      const password = this.generatePassword(request.BusinessShortCode, passkey, timestamp);

      const stkPushRequest = {
        ...request,
        Password: password,
        Timestamp: timestamp,
      };

      console.log('🚀 Initiating Buni/KCB STK Push:', {
        BusinessShortCode: stkPushRequest.BusinessShortCode,
        Amount: stkPushRequest.Amount,
        PartyA: stkPushRequest.PartyA,
        AccountReference: stkPushRequest.AccountReference,
      });

      // Try different STK Push endpoints
      const endpoints = [
        `${this.baseURL}/mm/api/request/v1/processrequest`,
        `${this.baseURL}/mpesa/stkpush/v1/processrequest`,
        `${this.baseURL}/api/request/v1/processrequest`
      ];

      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(stkPushRequest),
          });

          if (response.ok) {
            const data = await response.json();
            console.log('✅ Buni/KCB STK Push initiated:', data);
            return data;
          } else {
            const errorText = await response.text();
            console.log(`❌ Endpoint ${endpoint} failed:`, response.status, errorText);
          }
        } catch (error) {
          console.log(`❌ Endpoint ${endpoint} error:`, error.message);
        }
      }

      throw new Error('All STK Push endpoints failed');

    } catch (error) {
      console.error('❌ Error initiating Buni/KCB STK Push:', error);
      throw error;
    }
  }

  /**
   * Decode JWT token to get information
   */
  decodeToken() {
    try {
      const base64Url = this.apiKey.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  }

  /**
   * Test API key validity
   */
  async testAPIKey() {
    try {
      const tokenData = this.decodeToken();
      if (tokenData) {
        console.log('📋 Buni/KCB Token Information:');
        console.log('- Subject:', tokenData.sub);
        console.log('- Application:', tokenData.application?.name);
        console.log('- Tier:', tokenData.application?.tier);
        console.log('- Key Type:', tokenData.keytype);
        console.log('- Issued At:', new Date(tokenData.iat * 1000).toISOString());
        console.log('- Subscribed APIs:', tokenData.subscribedAPIs?.map(api => api.name));
      }

      await this.getAccessToken();
      return true;
    } catch (error) {
      console.error('❌ API key test failed:', error);
      return false;
    }
  }
}

export { BuniMpesaAPI };
