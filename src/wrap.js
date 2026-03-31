import { spawn } from "node:child_process";
import { checkIp, CheckFailReason } from "./check-ip.js";

const MAX_NETWORK_FAILURES = 5;

/**
 * Spawn a child process and periodically check IP.
 * Kill the child if IP leaves the allowed country.
 * Network errors are tolerated up to MAX_NETWORK_FAILURES consecutive times.
 *
 * @param {string} cmd
 * @param {string[]} args
 * @param {{country: string, intervalSec: number, apiUrl: string}} opts
 * @returns {Promise<number>} exit code
 */
export function wrap(cmd, args, { country, intervalSec, apiUrl }) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, {
      stdio: "inherit",
      shell: process.platform === "win32",
    });

    let killed = false;
    let childExited = false;
    let networkFailures = 0;

    function killChild(message) {
      if (childExited) return;
      console.error(`\n${message}`);
      console.error("[ipgatekeeper] Terminating child process...");
      killed = true;
      child.kill("SIGTERM");
      setTimeout(() => {
        if (child.exitCode === null && child.signalCode === null) {
          child.kill("SIGKILL");
        }
      }, 3000);
    }

    const timer = setInterval(async () => {
      if (childExited) return;
      const result = await checkIp(apiUrl, country);
      if (childExited) return;

      if (result.ok) {
        networkFailures = 0;
        return;
      }

      if (result.reason === CheckFailReason.COUNTRY_MISMATCH) {
        clearInterval(timer);
        killChild(result.message);
        return;
      }

      // Network error — tolerate up to MAX_NETWORK_FAILURES
      networkFailures++;
      console.error(`${result.message} (${networkFailures}/${MAX_NETWORK_FAILURES})`);
      if (networkFailures >= MAX_NETWORK_FAILURES) {
        clearInterval(timer);
        killChild(
          `[ipgatekeeper] ${MAX_NETWORK_FAILURES} consecutive network failures, cannot verify IP`,
        );
      }
    }, intervalSec * 1000);

    // Forward signals to child
    const signalHandlers = {};
    for (const sig of ["SIGINT", "SIGTERM"]) {
      const handler = () => {
        clearInterval(timer);
        child.kill(sig);
      };
      signalHandlers[sig] = handler;
      process.on(sig, handler);
    }

    function cleanup() {
      childExited = true;
      clearInterval(timer);
      for (const sig of ["SIGINT", "SIGTERM"]) {
        process.removeListener(sig, signalHandlers[sig]);
      }
    }

    child.on("error", (err) => {
      cleanup();
      console.error(`[ipgatekeeper] Failed to start: ${err.message}`);
      resolve(1);
    });

    child.on("close", (code) => {
      cleanup();
      if (killed) {
        console.error("[ipgatekeeper] Child process terminated due to IP change");
        resolve(1);
      } else {
        resolve(code ?? 0);
      }
    });
  });
}
