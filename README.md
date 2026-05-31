#  Subscription Graveyard Auditor

> Built for the [Pirates of the Coral-bean Hackathon](https://www.wemakedevs.org/hackathons/coral) by WeMakeDevs

An AI agent that audits your subscriptions by querying **Gmail, Notion, and Google Calendar** in a single Coral SQL cross-source JOIN — then classifies each subscription as Zombie, Hibernating, or Active.

##  The Problem
You pay for dozens of subscriptions. You have no idea which ones you actually use. This agent figures it out automatically.

##  How It Works

```sql
SELECT
  n.service, n.monthly_cost, n.billing_email,
  MAX(c.updated) AS last_calendar_activity
FROM notion.data_source_pages n
LEFT JOIN google_calendar.events c
  ON c.summary ILIKE '%' || n.service || '%'
GROUP BY n.service, n.monthly_cost, n.billing_email
ORDER BY last_calendar_activity ASC NULLS FIRST
```

One query. Three sources. Zero glue code.

##  Data Sources
- **Gmail** — billing emails and receipts (custom source spec built from scratch)
- **Notion** — subscription registry with costs and categories  
- **Google Calendar** — usage signals from calendar events

##  Classification
| Status | Criteria | Action |
|---|---|---|
| Zombie | 120+ days inactive | Cancel now |
| Hibernating | 45–120 days inactive | Review |
| Active | Under 45 days | Keep |

##  Tech Stack
- **Coral** — cross-source SQL engine (CLI + MCP)
- **Node.js + Express** — backend agent
- **React + Vite** — dashboard frontend
- **Gemini AI** — natural language verdicts per subscription
- **Custom Gmail source spec** — built for this project (submitted separately for the source spec bounty)

##  Setup

### Prerequisites
- [Coral CLI](https://withcoral.com) installed
- Node.js 18+
- Gmail, Notion, Google Calendar accounts

### Install
```bash
git clone https://github.com/Jaybea00/subscription-graveyard
cd subscription-graveyard
npm install
cd frontend && npm install && npm run build && cd ..
```

### Connect Sources
```bash
coral source add --interactive --file coral/gmail.yaml
coral source add --interactive google_calendar
coral source add --interactive notion
```

### Configure
Create a `.env` file:


GEMINI_API_KEY=your_key_here
PORT=3001

### Run
```bash
node src/index.js
```

Open [http://localhost:3001](http://localhost:3001)

##  Special Bounty — Custom Gmail Source Spec
Gmail is not a bundled Coral source. This project includes a custom `coral/gmail.yaml` source spec that adds Gmail as a queryable SQL source with:
- `gmail.emails` table
- `gmail.labels` table  
- `gmail.search_emails()` function with Gmail's native query syntax

##  Demo Output
- **$878/year** in potential savings identified
- 7 zombie subscriptions flagged for cancellation
- 2 hibernating subscriptions flagged for review
- 1 active subscription confirmed healthy