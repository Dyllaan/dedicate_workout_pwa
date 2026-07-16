import { setupServer } from "msw/node";
import { createMockHandlers } from "./handlers";

export const server = setupServer(...createMockHandlers());
