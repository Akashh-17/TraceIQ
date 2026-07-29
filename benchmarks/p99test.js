/**
 * P99 Latency & Max Throughput Benchmark
 * 
 * WHAT THIS MEASURES:
 * This script is specifically designed to measure the true throughput ceiling 
 * and P99 latency of the event ingestion endpoint (POST /api/v1/events) under 
 * sustained, high concurrency. 
 * 
 * WHY IT'S DIFFERENT FROM THE LOAD TEST:
 * 1. NO SLEEP: VUs do not throttle themselves. They fire requests continuously 
 *    as fast as the server can accept them, revealing the raw throughput limit.
 * 2. HIGHER CONCURRENCY: Ramps up to 200 VUs instead of 50.
 * 3. STRICTER THRESHOLDS: Explicitly measures and asserts against P99, P95, and P90 latencies.
 * 4. SECURE AUTH: Requires the API key to be passed securely via an environment variable.
 */

import http from 'k6/http';
import { check } from 'k6';
import { randomIntBetween, randomItem } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// The API key must be passed via environment variable (e.g., -e API_KEY=xxx)
const API_KEY = __ENV.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable is required.");
}

// Zod-compliant configurations
const ACTIONS = [
  'LOGIN_SUCCESS', 'LOGIN_FAILED', 'DATA_EXPORTED', 
  'PAYMENT_PROCESSED', 'USER_CREATED', 'ROLE_UPDATED',
  'FILE_DOWNLOADED', 'SUBSCRIPTION_CANCELLED'
];
const RESOURCE_TYPES = ['USER', 'REPORT', 'PAYMENT', 'DOCUMENT', 'SUBSCRIPTION'];
const SERVICES = ['AUTH_SERVICE', 'BILLING_SERVICE', 'CORE_API', 'ADMIN_PANEL'];

export const options = {
  scenarios: {
    p99_stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 50 },  // Ramp to 50 VUs
        { duration: '1m', target: 100 },  // Ramp to 100 VUs
        { duration: '1m', target: 200 },  // Ramp to 200 VUs
        { duration: '30s', target: 0 },   // Ramp down to 0
      ],
    }
  },
  thresholds: {
    // Latency requirements under high load
    http_req_duration: [
      'p(99)<500', // 99% of requests must complete within 500ms
      'p(95)<200', // 95% of requests must complete within 200ms
      'p(90)<100'  // 90% of requests must complete within 100ms
    ],
    // Less than 1% of requests can fail
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const url = 'http://localhost:3000/api/v1/events';
  
  const action = randomItem(ACTIONS);
  const isFailed = action === 'LOGIN_FAILED';

  // Construct a perfectly compliant Zod payload, randomizing actor and resourceId
  const payload = JSON.stringify({
    actor: `k6_user_${__VU}_${__ITER}_${randomIntBetween(1, 100000)}@example.com`,
    action: action,
    resource_type: randomItem(RESOURCE_TYPES),
    resource_id: `res_${__VU}_${__ITER}_${randomIntBetween(10000, 99999)}`,
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

  // NO SLEEP - Measure raw throughput ceiling
}
