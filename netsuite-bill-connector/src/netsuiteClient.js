const axios = require('axios');
const jwt = require('jsonwebtoken');
const config = require('./config');
const logger = require('./logger');

const TOKEN_URL = `${config.netsuite.restBaseUrl}/services/rest/auth/oauth2/v1/token`;

// NetSuite caps the JWT assertion (and the access token it grants) at 3600 seconds.
const ASSERTION_LIFETIME_SECONDS = 3600;

let cachedToken = null; // { accessToken, expiresAt }

function buildAssertion() {
  return jwt.sign(
    { scope: config.netsuite.scope, aud: TOKEN_URL },
    config.netsuite.privateKey,
    {
      algorithm: 'RS256',
      issuer: config.netsuite.clientId,
      keyid: config.netsuite.certificateId,
      expiresIn: ASSERTION_LIFETIME_SECONDS,
    }
  );
}

async function getAccessToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.accessToken;
  }

  const response = await axios.post(
    TOKEN_URL,
    new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: buildAssertion(),
    }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );

  cachedToken = {
    accessToken: response.data.access_token,
    expiresAt: Date.now() + response.data.expires_in * 1000,
  };
  return cachedToken.accessToken;
}

async function request(method, path, { data, params, headers } = {}) {
  const url = `${config.netsuite.restBaseUrl}${path}`;
  const accessToken = await getAccessToken();

  try {
    const response = await axios({
      method,
      url,
      params,
      data,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Prefer: 'transient',
        ...headers,
      },
    });
    return response.data;
  } catch (err) {
    const status = err.response?.status;
    const body = err.response?.data;
    logger.error(`NetSuite request failed: ${method} ${path} -> ${status}`, JSON.stringify(body));
    throw err;
  }
}

async function suiteQL(query, { limit = 1000, offset = 0 } = {}) {
  return request('POST', '/services/rest/query/v1/suiteql', {
    data: { q: query },
    params: { limit, offset },
    headers: { Prefer: 'transient' },
  });
}

async function getRecord(recordType, internalId) {
  return request('GET', `/services/rest/record/v1/${recordType}/${internalId}`);
}

async function createRecord(recordType, payload) {
  return request('POST', `/services/rest/record/v1/${recordType}`, { data: payload });
}

module.exports = { suiteQL, getRecord, createRecord };
