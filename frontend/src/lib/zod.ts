import { config as configureZod, z } from "zod";

configureZod({ jitless: true });

export * from "zod";
export { z };
