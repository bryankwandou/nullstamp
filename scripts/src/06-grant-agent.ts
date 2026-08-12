/**
 * Step 6 — install the authorization grant.
 *
 * This is the most common reason a correct contract still cannot reach its target
 * API. A contract has no authority to permit its own egress; the data owner does.
 * Any destination host not named here is refused with `host/http.egress_denied`.
 *
 * Because this exercise runs on my own behalf, the agent DID is the tenant DID.
 * That is the shape used for direct invocation.
 */
import { CONTRACT_TAIL, UPSTREAM_HOST } from "./config.js";
import { openTenantClient, openUserSession, reportError } from "./session.js";
import { writeState } from "./state.js";

const FUNGSI = ["issue-receipt", "verify-receipt", "list-receipts"];

try {
  const s = await openUserSession();
  const tenant = openTenantClient(s);
  const scriptName = tenant.canonicalName(CONTRACT_TAIL);

  console.log(`contract       : ${scriptName}`);
  console.log(`functions      : ${FUNGSI.join(", ")}`);
  console.log(`allowed hosts  : ${UPSTREAM_HOST}`);

  await s.t3n.agentAuthUpdate({
    agents: [
      {
        agentDid: s.tenantDid,
        scripts: [
          {
            scriptName,
            versionReq: null,
            functions: FUNGSI,
            allowedHosts: [UPSTREAM_HOST],
          },
        ],
      },
    ],
  });

  const terpasang = await s.t3n.getAgentAuth();
  console.log("\ngrant read back:", JSON.stringify(terpasang, null, 2));

  writeState({ grantedHosts: [UPSTREAM_HOST] });
} catch (e) {
  reportError(e);
}
