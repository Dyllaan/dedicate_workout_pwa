const targetUrl = process.argv[2];

if (!targetUrl) {
  console.error("Usage: node tests/scripts/verify-nginx-security-headers.mjs <url>");
  process.exit(1);
}

const response = await fetch(targetUrl);

if (!response.ok) {
  throw new Error(`Expected an OK response from ${targetUrl}, received ${response.status}`);
}

const expectedHeaders = {
  "content-security-policy": "default-src 'self'",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": "camera=()",
  "x-content-type-options": "nosniff",
  "cross-origin-opener-policy": "same-origin",
  "cross-origin-resource-policy": "same-origin",
};

for (const [headerName, expectedValue] of Object.entries(expectedHeaders)) {
  const headerValue = response.headers.get(headerName);

  if (!headerValue) {
    throw new Error(`Missing required header: ${headerName}`);
  }

  if (!headerValue.includes(expectedValue)) {
    throw new Error(
      `Header ${headerName} did not include the expected value. Received: ${headerValue}`,
    );
  }
}

console.log(`Verified frontend security headers for ${targetUrl}`);
