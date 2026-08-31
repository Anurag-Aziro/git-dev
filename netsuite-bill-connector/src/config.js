require('dotenv').config();
const fs = require('fs');

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;  
}

function loadPrivateKey() {
  if (process.env.NETSUITE_PRIVATE_KEY) {
    return process.env.NETSUITE_PRIVATE_KEY.replace(/\\n/g, '\n');
  }
  return fs.readFileSync(required('NETSUITE_PRIVATE_KEY_PATH'), 'utf8');
}

const config = {
  netsuite: {
    accountId: required('NETSUITE_ACCOUNT_ID'),
    clientId: required('NETSUITE_CLIENT_ID'),
    certificateId: required('NETSUITE_CERTIFICATE_ID'),
    privateKey: loadPrivateKey(),
    scope: process.env.NETSUITE_OAUTH_SCOPE || 'restlets rest_webservices',
    restBaseUrl: required('NETSUITE_REST_BASE_URL').replace(/\/+$/, ''),
    paymentAccountId: required('NETSUITE_PAYMENT_ACCOUNT_ID'),
  },
  dryRun: (process.env.DRY_RUN || 'true').toLowerCase() !== 'false',
  maxBillsPerRun: parseInt(process.env.MAX_BILLS_PER_RUN || '50', 10),
  scheduleCron: process.env.SCHEDULE_CRON || null,
};

module.exports = config;
