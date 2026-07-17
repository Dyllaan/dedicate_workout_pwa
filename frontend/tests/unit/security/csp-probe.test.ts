import { installCspProbe } from "@/lib/cspProbe";

describe("installCspProbe", () => {
  it("captures security policy violation details on window", () => {
    delete window.__CSP_PROBE_ATTACHED__;
    delete window.__CSP_PROBE_EVENTS__;

    const groupSpy = vi.spyOn(console, "groupCollapsed").mockImplementation(() => {});
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const endSpy = vi.spyOn(console, "groupEnd").mockImplementation(() => {});

    installCspProbe();

    const event = new Event("securitypolicyviolation") as SecurityPolicyViolationEvent;

    Object.defineProperties(event, {
      blockedURI: { value: "inline" },
      columnNumber: { value: 9 },
      disposition: { value: "enforce" },
      documentURI: { value: "http://localhost:5173/" },
      effectiveDirective: { value: "script-src" },
      lineNumber: { value: 157 },
      originalPolicy: { value: "script-src 'self'" },
      sample: { value: "Function('return this')" },
      sourceFile: { value: "moz-extension://example/util.js" },
      statusCode: { value: 200 },
      violatedDirective: { value: "script-src 'self'" },
    });

    document.dispatchEvent(event);

    expect(window.__CSP_PROBE_EVENTS__).toHaveLength(1);
    expect(window.__CSP_PROBE_EVENTS__?.[0]).toMatchObject({
      blockedURI: "inline",
      effectiveDirective: "script-src",
      lineNumber: 157,
      sourceFile: "moz-extension://example/util.js",
    });
    expect(groupSpy).toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalled();
    expect(endSpy).toHaveBeenCalled();
  });
});
