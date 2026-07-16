type BrowserLogLevel = "warn" | "error";

type BrowserLogEvent = {
  level: BrowserLogLevel;
  message: string;
  timestamp: string;
  url: string;
  userAgent: string;
  stack?: string;
  source?: string;
  line?: number;
  column?: number;
  reason?: string;
};

type BrowserLogBatch = {
  events: BrowserLogEvent[];
};

type BrowserLogTransport = (endpoint: string, payload: BrowserLogBatch) => Promise<void>;

type BrowserLoggerOptions = {
  endpoint: string;
  transport?: BrowserLogTransport;
  flushIntervalMs?: number;
  maxBatchSize?: number;
  maxQueueSize?: number;
};

type BrowserLogger = {
  recordConsole(level: BrowserLogLevel, args: unknown[]): void;
  flush(): Promise<void>;
  dispose(): void;
};

const DEFAULT_FLUSH_INTERVAL_MS = 2_000;
const DEFAULT_MAX_BATCH_SIZE = 10;
const DEFAULT_MAX_QUEUE_SIZE = 50;
const MAX_MESSAGE_LENGTH = 500;
const MAX_STACK_LENGTH = 4_000;
const MAX_URL_LENGTH = 2_048;
const MAX_USER_AGENT_LENGTH = 512;

function toText(value: unknown) {
  if (value instanceof Error) {
    return value.message || value.name || "Error";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
    return String(value);
  }

  if (value == null) {
    return "";
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function normalizeText(value: string, maxLength: number) {
  const collapsed = value.replace(/\s+/g, " ").trim();
  return collapsed.length > maxLength ? collapsed.slice(0, maxLength) : collapsed;
}

function normalizeMultilineText(value: string, maxLength: number) {
  const trimmed = value.replace(/\r\n/g, "\n").trim();
  return trimmed.length > maxLength ? trimmed.slice(0, maxLength) : trimmed;
}

function buildMessage(args: unknown[]) {
  return normalizeText(
    args.map((arg) => toText(arg)).filter((value) => value.length > 0).join(" "),
    MAX_MESSAGE_LENGTH,
  );
}

function extractStack(args: unknown[]) {
  const error = args.find((value): value is Error => value instanceof Error);
  return error?.stack ? normalizeMultilineText(error.stack, MAX_STACK_LENGTH) : undefined;
}

function createEvent(level: BrowserLogLevel, args: unknown[], extras: Partial<BrowserLogEvent> = {}): BrowserLogEvent | null {
  const message = buildMessage(args);
  if (!message) {
    return null;
  }

  return {
    level,
    message,
    timestamp: new Date().toISOString(),
    url: normalizeText(window.location.href, MAX_URL_LENGTH),
    userAgent: normalizeText(window.navigator.userAgent, MAX_USER_AGENT_LENGTH),
    stack: extractStack(args),
    ...extras,
  };
}

function defaultTransport(endpoint: string, payload: BrowserLogBatch) {
  return fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    keepalive: true,
    body: JSON.stringify(payload),
  }).then((response) => {
    if (!response.ok) {
      throw new Error(`Browser log transport failed with ${response.status}`);
    }
  });
}

export function createBrowserLogger(options: BrowserLoggerOptions): BrowserLogger {
  const {
    endpoint,
    transport = defaultTransport,
    flushIntervalMs = DEFAULT_FLUSH_INTERVAL_MS,
    maxBatchSize = DEFAULT_MAX_BATCH_SIZE,
    maxQueueSize = DEFAULT_MAX_QUEUE_SIZE,
  } = options;

  const queue: BrowserLogEvent[] = [];
  let flushTimer: number | undefined;
  let flushing = Promise.resolve();

  function clearTimer() {
    if (flushTimer !== undefined) {
      window.clearTimeout(flushTimer);
      flushTimer = undefined;
    }
  }

  function scheduleFlush() {
    if (flushTimer !== undefined || queue.length === 0) {
      return;
    }

    flushTimer = window.setTimeout(() => {
      flushTimer = undefined;
      void flush();
    }, flushIntervalMs);
  }

  function enqueue(event: BrowserLogEvent) {
    if (queue.length >= maxQueueSize) {
      queue.shift();
    }

    queue.push(event);

    if (queue.length >= maxBatchSize) {
      void flush();
      return;
    }

    scheduleFlush();
  }

  async function flush() {
    clearTimer();

    if (queue.length === 0) {
      return;
    }

    const batch = queue.splice(0, queue.length);
    flushing = flushing
      .then(() => transport(endpoint, { events: batch }))
      .catch(() => undefined);

    await flushing;
  }

  return {
    recordConsole(level, args) {
      const event = createEvent(level, args);
      if (!event) {
        return;
      }

      enqueue(event);
    },
    flush,
    dispose() {
      clearTimer();
      queue.length = 0;
    },
  };
}

export function installBrowserLogger(options: BrowserLoggerOptions) {
  const logger = createBrowserLogger(options);
  const originalWarn = console.warn.bind(console);
  const originalError = console.error.bind(console);

  const warn = (...args: unknown[]) => {
    logger.recordConsole("warn", args);
    originalWarn(...args);
  };

  const error = (...args: unknown[]) => {
    logger.recordConsole("error", args);
    originalError(...args);
  };

  const handleError = (event: ErrorEvent) => {
    const message = event.message || "Unhandled error";
    logger.recordConsole("error", [
      event.error instanceof Error ? event.error : message,
    ]);
  };

  const handleRejection = (event: PromiseRejectionEvent) => {
    logger.recordConsole("error", [
      event.reason instanceof Error ? event.reason : toText(event.reason) || "Unhandled rejection",
    ]);
  };

  console.warn = warn;
  console.error = error;
  window.addEventListener("error", handleError);
  window.addEventListener("unhandledrejection", handleRejection);

  return {
    ...logger,
    dispose() {
      logger.dispose();
      console.warn = originalWarn;
      console.error = originalError;
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
    },
  };
}
