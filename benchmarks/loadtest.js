import http from 'k6/http';
import { check, sleep } from 'k6';
import { randomIntBetween, randomItem } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// The FinStack test API key (raw) which hashes correctly via our middleware
const API_KEY = 'tk_live_finstack_999';

// Zod-compliant configurations
const ACTIONS = [
  'LOGIN_SUCCESS', 'LOGIN_FAILED', 'DATA_EXPORTED', 
  'PAYMENT_PROCESSED', 'USER_CREATED', 'ROLE_UPDATED',
  'FILE_DOWNLOADED', 'SUBSCRIPTION_CANCELLED'
];
const RESOURCE_TYPES = ['USER', 'REPORT', 'PAYMENT', 'DOCUMENT', 'SUBSCRIPTION'];
const SERVICES = ['AUTH_SERVICE', 'BILLING_SERVICE', 'CORE_API', 'ADMIN_PANEL'];

// Map the scenario from environment variable to K6 executors
// Command example: k6 run -e SCENARIO=load benchmarks/loadtest.js
const testScenario = __ENV.SCENARIO || 'smoke';

let scenarios = {};

if (testScenario === 'smoke') {
  scenarios.smoke = {
    executor: 'constant-vus',
    vus: 1,
    duration: '30s',
  };
} else if (testScenario === 'load') {
  scenarios.load = {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '30s', target: 10 }, // Ramp up to 10 VUs
      { duration: '1m', target: 25 },  // Ramp to 25 VUs
      { duration: '1m', target: 50 },  // Ramp to 50 VUs
      { duration: '30s', target: 0 },  // Ramp down to 0
    ],
  };
} else if (testScenario === 'stress') {
  scenarios.stress = {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '1m', target: 50 },  
      { duration: '2m', target: 100 }, 
      { duration: '2m', target: 200 }, 
      { duration: '1m', target: 0 },   
    ],
  };
} else if (testScenario === 'spike') {
  scenarios.spike = {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '10s', target: 200 }, // Instant burst
      { duration: '1m', target: 200 },  // Hold burst
      { duration: '10s', target: 0 },   // Instant drop
    ],
  };
}

export const options = {
  scenarios: scenarios,
  thresholds: {
    // 95% of requests must complete within 500ms
    http_req_duration: ['p(95)<500'],
    // Less than 1% of requests can fail
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const url = 'http://localhost:3000/api/v1/events';
  
  const action = randomItem(ACTIONS);
  const isFailed = action === 'LOGIN_FAILED';

  // Construct a perfectly compliant Zod payload
  const payload = JSON.stringify({
    actor: `k6_user_${randomIntBetween(1, 1000)}@example.com`,
    action: action,
    resource_type: randomItem(RESOURCE_TYPES),
    resource_id: `res_${randomIntBetween(1000, 9999)}`,
    source_service: randomItem(SERVICES),
    metadata: {
      ip_address: `192.168.1.${randomIntBetween(1, 255)}`,
      browser: randomItem(['Chrome', 'Firefox', 'Safari', 'Edge']),
      status: isFailed ? 'error' : 'success'
    }
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
  };

  const res = http.post(url, payload, params);

  check(res, {
    'status is 202': (r) => r.status === 202,
  });

  // Small sleep prevents VUs from sending too fast (DDoSing local adapter)
  // 50 VUs with 0.1s sleep = roughly 500 Requests Per Second (RPS) max
  sleep(0.1); 
}
