// claude.js — AI verdicts using Gemini API (free tier)

const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

async function generateVerdict(subscription) {
  const {
    service,
    monthly_cost,
    category,
    days_since_activity,
    status,
    last_calendar_activity,
  } = subscription;

  const prompt = `You are a personal finance assistant auditing someone's subscriptions.

Subscription details:
- Service: ${service}
- Monthly cost: $${monthly_cost}
- Category: ${category}
- Days since last activity: ${days_since_activity === 999 ? "No activity found" : days_since_activity + " days"}
- Last calendar activity: ${last_calendar_activity || "None found"}
- Status: ${status}

Write a single punchy 1-2 sentence verdict about this subscription. Be direct and specific.
If zombie: explain why it should be cancelled and how much they'd save yearly.
If hibernating: flag it as worth reviewing.
If active: confirm it looks used.
Keep it under 30 words. No bullet points. Just plain text.`;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (err) {
    console.error(`Gemini error for ${service}:`, err.message);
    // Fallback to rule-based verdict if API fails
    const yearlyCost = (monthly_cost * 12).toFixed(2);
    if (status === "zombie") {
      return `You haven't used ${service} in ${days_since_activity} days. Cancelling saves $${yearlyCost}/year.`;
    } else if (status === "hibernating") {
      return `${service} shows low activity. Worth reviewing at $${monthly_cost}/mo.`;
    } else {
      return `${service} appears active. No action needed.`;
    }
  }
}

async function generateVerdicts(subscriptions) {
  const results = [];
  for (const sub of subscriptions) {
    const verdict = await generateVerdict(sub);
    results.push({ ...sub, verdict });
  }
  return results;
}

module.exports = { generateVerdicts };
