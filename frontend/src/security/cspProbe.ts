type CspProbeEventRecord = {
  blockedURI: string;
  columnNumber: number;
  disposition: string;
  documentURI: string;
  effectiveDirective: string;
  lineNumber: number;
  originalPolicy: string;
  sample: string;
  scriptSample: Array<{
    src: string;
    type: string;
  }>;
  sourceFile: string;
  statusCode: number;
  timestamp: string;
  violatedDirective: string;
};

declare global {
  interface Window {
    __CSP_PROBE_ATTACHED__?: boolean;
    __CSP_PROBE_EVENTS__?: CspProbeEventRecord[];
  }
}

function collectScriptSample() {
  return Array.from(document.scripts)
    .slice(0, 12)
    .map((script) => ({
      src: script.src || "[inline]",
      type: script.type || "classic",
    }));
}

function buildRecord(event: SecurityPolicyViolationEvent): CspProbeEventRecord {
  return {
    blockedURI: event.blockedURI,
    columnNumber: event.columnNumber,
    disposition: event.disposition,
    documentURI: event.documentURI,
    effectiveDirective: event.effectiveDirective,
    lineNumber: event.lineNumber,
    originalPolicy: event.originalPolicy,
    sample: event.sample,
    scriptSample: collectScriptSample(),
    sourceFile: event.sourceFile,
    statusCode: event.statusCode,
    timestamp: new Date().toISOString(),
    violatedDirective: event.violatedDirective,
  };
}

function logRecord(record: CspProbeEventRecord) {
  const extensionScripts = record.scriptSample.filter((script) =>
    /^(moz-extension|chrome-extension):/i.test(script.src),
  );

  console.groupCollapsed(
    `[CSP probe] ${record.effectiveDirective || record.violatedDirective} blocked`,
  );
  console.log("Blocked URI:", record.blockedURI || "[inline]");
  console.log("Source file:", record.sourceFile || "[unknown]");
  console.log("Line/column:", `${record.lineNumber}:${record.columnNumber}`);
  console.log("Sample:", record.sample || "[none]");
  console.log("Disposition:", record.disposition);
  console.log("Document:", record.documentURI);
  console.log("Scripts on page:", record.scriptSample);
  if (extensionScripts.length > 0) {
    console.log("Extension scripts detected:", extensionScripts);
  }
  console.groupEnd();
}

export function installCspProbe() {
  if (typeof window === "undefined" || window.__CSP_PROBE_ATTACHED__) {
    return;
  }

  window.__CSP_PROBE_ATTACHED__ = true;
  window.__CSP_PROBE_EVENTS__ = window.__CSP_PROBE_EVENTS__ ?? [];

  document.addEventListener("securitypolicyviolation", (event) => {
    const record = buildRecord(event);
    window.__CSP_PROBE_EVENTS__?.push(record);
    logRecord(record);
  });
}
