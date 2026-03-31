#!/usr/bin/env node

import { parseArgs } from "node:util";
import { checkIp } from "../src/check-ip.js";
import { wrap } from "../src/wrap.js";

const usage = `
ipgatekeeper - Guard CLI commands behind IP geolocation checks

Usage:
  ipgatekeeper --country <code> -- <command> [args...]

Options:
  --country, -c   Required. Allowed country code (e.g. JP, US)
  --interval, -i  Check interval in seconds (default: 30)
  --api           IP API URL (default: https://api.country.is/)
  --help, -h      Show this help

Examples:
  ipgatekeeper --country JP -- codex
  ipgatekeeper -c US -i 10 -- npm start
`.trim();

const { values, positionals } = parseArgs({
  options: {
    country: { type: "string", short: "c" },
    interval: { type: "string", short: "i", default: "30" },
    api: { type: "string", default: "https://api.country.is/" },
    help: { type: "boolean", short: "h", default: false },
  },
  allowPositionals: true,
  strict: true,
});

if (values.help || positionals.length === 0) {
  console.log(usage);
  process.exit(values.help ? 0 : 1);
}

const country = values.country?.toUpperCase();
if (!country) {
  console.error("Error: --country is required");
  process.exit(1);
}

const intervalSec = Number(values.interval);
if (Number.isNaN(intervalSec) || intervalSec < 1) {
  console.error("Error: --interval must be a positive number");
  process.exit(1);
}

const apiUrl = values.api;
const [cmd, ...args] = positionals;

// Pre-check
const preCheck = await checkIp(apiUrl, country);
if (!preCheck.ok) {
  console.error(preCheck.message);
  process.exit(1);
}
console.log(preCheck.message);

// Wrap child process with runtime checks
const exitCode = await wrap(cmd, args, { country, intervalSec, apiUrl });
process.exit(exitCode);
