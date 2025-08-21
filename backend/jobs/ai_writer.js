import { validateRSA } from "../lib/validators.js";
import { getDoc, ensureSheet } from "../sheets.js";
import { getAIProvider } from "../lib/aiProvider.js";
import { getRSAGenerator } from "../services/rsa-generator.js";
import {
  getApprovalWorkflow,
  CONTENT_TYPES,
} from "../services/content-approval.js";

function failFast(msg) {
  console.error(msg);
  process.exit(1);
}

async function writeDrafts(tenant, themes) {
  const doc = await getDoc();
  if (!doc) return 0;
  const rsa = await ensureSheet(doc, `RSA_ASSETS_DEFAULT_${tenant}`, [
    "headlines_pipe",
    "descriptions_pipe",
    "theme",
    "rationale",
    "source_url",
    "approval_status",
  ]);
  const lib = await ensureSheet(doc, `ASSET_LIBRARY_${tenant}`, [
    "theme",
    "headline",
    "description",
    "tone",
    "source",
    "approval_status",
  ]);
  const sitelinks = await ensureSheet(doc, `SITELINKS_${tenant}`, [
    "link_text",
    "line1",
    "line2",
    "final_url",
    "theme",
    "approval_status",
  ]);
  const callouts = await ensureSheet(doc, `CALLOUTS_${tenant}`, [
    "callout_text",
    "theme",
    "approval_status",
  ]);
  const snippets = await ensureSheet(doc, `SNIPPETS_${tenant}`, [
    "header",
    "values_pipe",
    "theme",
    "approval_status",
  ]);

  const rsaGenerator = getRSAGenerator();
  const approvalWorkflow = getApprovalWorkflow();
  let wrote = 0;

  for (const t of themes) {
    try {
      // Use new RSA generator for better content
      const rsaResult = await rsaGenerator.generateRSAContent({
        theme: t,
        industry: "general",
        tone: "professional",
        headlineCount: 8,
        descriptionCount: 3,
      });

      let headlines, descriptions;
      if (rsaResult.success && rsaResult.content) {
        headlines = rsaResult.content.headlines;
        descriptions = rsaResult.content.descriptions;
      } else {
        // Fallback to simple generation if RSA generator fails
        headlines = [
          `${t} Deals`,
          `${t} Official Site`,
          `${t} Fast Shipping`,
          `${t} Start Free`,
          `${t} Trusted`,
        ];
        descriptions = [
          `${t} — shop now with fast shipping and easy returns.`,
          `${t} — compare options and find your best fit today.`,
        ];
      }

      const v = validateRSA(headlines, descriptions);

      // Submit RSA content for approval
      const rsaApproval = await approvalWorkflow.submitForApproval(
        { headlines: v.clipped.h, descriptions: v.clipped.d },
        {
          contentType: CONTENT_TYPES.RSA_HEADLINES,
          tenant,
          submittedBy: "ai_writer",
          autoApprove: true,
          metadata: { theme: t, source: "ai_generator" },
        },
      );

      const approvalStatus =
        rsaApproval.success && rsaApproval.status === "approved"
          ? "approved"
          : "pending";

      // Write to sheets with approval status
      await rsa.addRow({
        headlines_pipe: v.clipped.h.join("|"),
        descriptions_pipe: v.clipped.d.join("|"),
        theme: t,
        rationale: "ai_generated",
        source_url: "",
        approval_status: approvalStatus,
      });

      for (const h of v.clipped.h) {
        await lib.addRow({
          theme: t,
          headline: h,
          description: "",
          tone: "default",
          source: "ai_writer",
          approval_status: approvalStatus,
        });
      }

      for (const d of v.clipped.d) {
        await lib.addRow({
          theme: t,
          headline: "",
          description: d,
          tone: "default",
          source: "ai_writer",
          approval_status: approvalStatus,
        });
      }

      // Generate and approve other content types
      await sitelinks.addRow({
        link_text: `${t} Info`,
        line1: "",
        line2: "",
        final_url: "",
        theme: t,
        approval_status: "approved",
      });

      await callouts.addRow({
        callout_text: `${t} Savings`,
        theme: t,
        approval_status: "approved",
      });

      await snippets.addRow({
        header: "Brands",
        values_pipe: "Top|Best",
        theme: t,
        approval_status: "approved",
      });

      wrote++;
    } catch (error) {
      console.error(`Failed to write drafts for theme ${t}:`, error);
      // Continue with next theme
    }
  }
  return wrote;
}

async function main() {
  const args = process.argv.slice(2);
  const tenant =
    (args.find((a) => a.startsWith("--tenant=")) || "").split("=")[1] ||
    process.env.TENANT_ID ||
    "default";
  const dryRun = args.includes("--dry-run");
  const limit = Number(
    (args.find((a) => a.startsWith("--limit=")) || "").split("=")[1] || "5",
  );
  if (!tenant) failFast("Missing --tenant");

  let ai;
  try {
    ai = await getAIProvider(); // Use async version for better multi-provider support
  } catch (e) {
    const msg =
      "AI disabled: set AI_PROVIDER=(openai|anthropic|google) and corresponding API key (see /docs/SECRETS.md).";
    console.log(msg);
    return process.exit(0);
  }

  const themes = Array.from({ length: Math.max(1, Math.min(5, limit)) }).map(
    (_, i) => `Theme ${i + 1}`,
  );
  if (dryRun) {
    console.log(
      JSON.stringify({
        ok: true,
        dryRun: true,
        tenant,
        themes,
        aiProvider: ai.provider,
        remainingCalls: ai.remainingCalls?.() || 0,
      }),
    );
    return;
  }

  // Generate content using enhanced AI services
  const wrote = await writeDrafts(tenant, themes);
  console.log(
    JSON.stringify({
      ok: true,
      wrote,
      aiProvider: ai.provider,
      remainingCalls: ai.remainingCalls?.() || 0,
    }),
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
