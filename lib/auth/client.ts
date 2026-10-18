"use client";
import { createAuthClient } from "better-auth/react";
import { magicLinkClient } from "better-auth/client/plugins";

// Cliente de Better Auth para los formularios. Misma origin que la app.
export const authClient = createAuthClient({ plugins: [magicLinkClient()] });
