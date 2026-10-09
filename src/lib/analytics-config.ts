/** True when the build has a valid Google Analytics ID. Safe to import from server components. */
export const ANALYTICS_ENABLED = /^G-[A-Z0-9]+$/i.test(process.env.NEXT_PUBLIC_GA_ID?.trim() ?? "");
