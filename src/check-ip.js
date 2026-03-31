/** @enum {string} */
export const CheckFailReason = {
  COUNTRY_MISMATCH: "country_mismatch",
  NETWORK_ERROR: "network_error",
};

/**
 * Check current IP against allowed country code.
 * @param {string} apiUrl
 * @param {string} allowedCountry - e.g. "JP"
 * @returns {Promise<{ok: boolean, reason?: string, ip?: string, country?: string, message: string}>}
 */
export async function checkIp(apiUrl, allowedCountry) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(apiUrl, { signal: controller.signal });
    clearTimeout(timer);

    if (!res.ok) {
      return {
        ok: false,
        reason: CheckFailReason.NETWORK_ERROR,
        message: `[ipgatekeeper] IP API returned ${res.status}`,
      };
    }

    const data = await res.json();
    const ip = data.ip;
    const country = data.country;

    if (!country) {
      return {
        ok: false,
        reason: CheckFailReason.NETWORK_ERROR,
        ip,
        message: `[ipgatekeeper] Could not determine country for IP ${ip}`,
      };
    }

    if (country.toUpperCase() !== allowedCountry) {
      return {
        ok: false,
        reason: CheckFailReason.COUNTRY_MISMATCH,
        ip,
        country,
        message: `[ipgatekeeper] BLOCKED - IP ${ip} is in ${country}, not ${allowedCountry}`,
      };
    }

    return {
      ok: true,
      ip,
      country,
      message: `[ipgatekeeper] OK - IP ${ip} is in ${country}`,
    };
  } catch (err) {
    const msg = err.name === "AbortError" ? "IP check timed out" : err.message;
    return {
      ok: false,
      reason: CheckFailReason.NETWORK_ERROR,
      message: `[ipgatekeeper] Error: ${msg}`,
    };
  }
}
