// server.js — Express API that runs Coral queries and returns audit results

const express = require("express");
const cors = require("cors");
const { execSync } = require("child_process");
const { scoreAll } = require("../agent/scorer");
const { generateVerdicts } = require("../agent/claude");

const router = express.Router();

function coralQuery(sql) {
  try {
    const result = execSync(
      `coral sql --format json "${sql.replace(/"/g, '\\"')}"`,
      {
        encoding: "utf8",
        timeout: 30000,
      },
    );
    return JSON.parse(result);
  } catch (err) {
    console.error("Coral query failed:", err.message);
    return [];
  }
}

function gmailQuery(billingEmail) {
  try {
    const result = execSync(
      `coral sql --format json "SELECT id, thread_id FROM gmail.search_emails(q => 'from:${billingEmail}') LIMIT 1"`,
      { encoding: 'utf8', timeout: 15000 }
    );
    const rows = JSON.parse(result);
    if (rows.length > 0) {
      // Estimate date from Gmail ID (higher ID = more recent)
      // Gmail IDs are roughly chronological hex values
      const id = rows[0].id;
      return { id, estimated_recent: true };
    }
    return null;
  } catch {
    return null;
  }
}
router.get("/audit", async (req, res) => {
  try {
    console.log("Running Notion + Calendar query...");

    // Step 1 — Notion + Calendar JOIN
    const baseQuery = `
      SELECT
        n.service, n.monthly_cost, n.billing_email, n.category,
        MAX(c.updated) AS last_calendar_activity
      FROM (
        SELECT
          json_get_str(json_get_json(properties, 'Service', 'title'), 0, 'plain_text') AS service,
          json_get_float(properties, 'Monthly Cost', 'number') AS monthly_cost,
          json_get_str(json_get_json(properties, 'Billing Email', 'rich_text'), 0, 'plain_text') AS billing_email,
          json_get_str(properties, 'Category', 'select', 'name') AS category
        FROM notion.data_source_pages
        WHERE data_source_id = '019e211f-b134-4e8b-9438-4bc028ba48ab'
      ) n
      LEFT JOIN google_calendar.events c
        ON c.summary ILIKE '%' || n.service || '%'
      GROUP BY n.service, n.monthly_cost, n.billing_email, n.category
      ORDER BY last_calendar_activity ASC NULLS FIRST
    `
      .replace(/\n\s+/g, " ")
      .trim();

    const subscriptions = coralQuery(baseQuery);

    // Step 2 — Per-service Gmail lookup
    console.log("Running per-service Gmail lookups...");
    const enriched = subscriptions.map((sub) => {
  const emailResult = gmailQuery(sub.billing_email);
  return {
    ...sub,
    last_email_id: emailResult ? emailResult.id : null,
    last_email_date: null,
  };
});

    // Step 3 — Score each subscription
    console.log("Scoring subscriptions...");
    const scored = scoreAll(enriched);

    // Step 4 — Generate Claude verdicts
    console.log("Generating AI verdicts...");
    const withVerdicts = await generateVerdicts(scored);

    // Step 5 — Calculate summary stats
    const totalMonthly = withVerdicts.reduce(
      (sum, s) => sum + (s.monthly_cost || 0),
      0,
    );
    const zombieSavings = withVerdicts
      .filter((s) => s.status === "zombie")
      .reduce((sum, s) => sum + (s.monthly_cost || 0), 0);

    res.json({
      subscriptions: withVerdicts,
      summary: {
        total: withVerdicts.length,
        zombie: withVerdicts.filter((s) => s.status === "zombie").length,
        hibernating: withVerdicts.filter((s) => s.status === "hibernating")
          .length,
        active: withVerdicts.filter((s) => s.status === "active").length,
        monthly_spend: Math.round(totalMonthly * 100) / 100,
        potential_yearly_savings: Math.round(zombieSavings * 12 * 100) / 100,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
