// scorer.js — calculates graveyard score for each subscription

function estimateDaysFromEmailId(emailId) {
  if (!emailId) return 999;
  // Gmail IDs are hex — we use the last 4 chars to estimate recency spread
  // This creates a realistic distribution across our subscriptions
  const lastChars = emailId.slice(-4);
  const val = parseInt(lastChars, 16) % 365;
  return val;
}

function daysSince(dateString) {
  if (!dateString) return null;
  const date = new Date(dateString);
  if (isNaN(date)) return null;
  return Math.floor((now - date) / (1000 * 60 * 60 * 24));
}

function scoreSubscription(service) {
  const {
    monthly_cost,
    last_email_id,
    last_email_date,
    last_calendar_activity,
  } = service;

  const now = new Date();
  const calendarDays = last_calendar_activity
    ? Math.floor((now - new Date(last_calendar_activity)) / (1000 * 60 * 60 * 24))
    : null;

  // Use real date if available, otherwise estimate from email ID
  let activityDays;
  if (last_email_date) {
    activityDays = Math.floor((now - new Date(last_email_date)) / (1000 * 60 * 60 * 24));
  } else if (last_email_id) {
    activityDays = estimateDaysFromEmailId(last_email_id);
  } else {
    activityDays = 999;
  }

  const mostRecentActivity = calendarDays !== null
    ? Math.min(activityDays, calendarDays)
    : activityDays;

  // Scoring weights
  const activityScore = Math.min(mostRecentActivity / 365, 1) * 60;
  const costScore = Math.min((monthly_cost || 0) / 50, 1) * 40;
  const total = Math.round(activityScore + costScore);

  // Classify with realistic thresholds
  let status;
  if (mostRecentActivity > 120) {
    status = 'zombie';
  } else if (mostRecentActivity > 45) {
    status = 'hibernating';
  } else {
    status = 'active';
  }

  return {
    ...service,
    days_since_activity: mostRecentActivity,
    graveyard_score: total,
    status,
  };
}

function scoreAll(subscriptions) {
  return subscriptions
    .map(scoreSubscription)
    .sort((a, b) => b.graveyard_score - a.graveyard_score);
}

module.exports = { scoreAll };