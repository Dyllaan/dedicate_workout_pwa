const targetUrl = process.argv[2];

if (!targetUrl) {
  console.error("Usage: node tests/scripts/verify-spa-fallback.mjs <base-url>");
  process.exit(1);
}

const normalizedBaseUrl = targetUrl.endsWith("/") ? targetUrl.slice(0, -1) : targetUrl;
const routesToCheck = [
  "/dashboard",
  "/workout/example-workout",
];

for (const route of routesToCheck) {
  const response = await fetch(`${normalizedBaseUrl}${route}`, {
    redirect: "manual",
  });

  if (!response.ok) {
    throw new Error(`Expected ${route} to return the SPA shell, received ${response.status}`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html")) {
    throw new Error(`Expected ${route} to return HTML, received content-type ${contentType}`);
  }

  const body = await response.text();
  if (!body.includes('<div id="root"></div>')) {
    throw new Error(`Expected ${route} to include the SPA root element.`);
  }
}

console.log(`Verified SPA fallback routes for ${normalizedBaseUrl}`);
