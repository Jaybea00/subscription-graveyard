import { useState, useEffect } from 'react'
import axios from 'axios'
import './App.css'

const STATUS_CONFIG = {
  zombie: {
    label: '💀 Zombie',
    color: '#ff4757',
    bg: 'rgba(255, 71, 87, 0.08)',
    border: 'rgba(255, 71, 87, 0.25)',
    desc: 'Cancel these now'
  },
  hibernating: {
    label: '😴 Hibernating',
    color: '#ffa502',
    bg: 'rgba(255, 165, 2, 0.08)',
    border: 'rgba(255, 165, 2, 0.25)',
    desc: 'Worth reviewing'
  },
  active: {
    label: '✅ Active',
    color: '#2ed573',
    bg: 'rgba(46, 213, 115, 0.08)',
    border: 'rgba(46, 213, 115, 0.25)',
    desc: 'Looking good'
  }
}

function SavingsBanner({ summary }) {
  return (
    <div className="savings-banner">
      <div className="savings-main">
        <span className="savings-amount">${summary.potential_yearly_savings.toLocaleString()}</span>
        <span className="savings-label">potential yearly savings</span>
      </div>
      <div className="savings-stats">
        <div className="stat">
          <span className="stat-value">{summary.total}</span>
          <span className="stat-label">subscriptions</span>
        </div>
        <div className="stat-divider" />
        <div className="stat">
          <span className="stat-value">${summary.monthly_spend}</span>
          <span className="stat-label">per month</span>
        </div>
        <div className="stat-divider" />
        <div className="stat">
          <span className="stat-value zombie">{summary.zombie}</span>
          <span className="stat-label">zombies</span>
        </div>
        <div className="stat-divider" />
        <div className="stat">
          <span className="stat-value hibernating">{summary.hibernating}</span>
          <span className="stat-label">hibernating</span>
        </div>
        <div className="stat-divider" />
        <div className="stat">
          <span className="stat-value active">{summary.active}</span>
          <span className="stat-label">active</span>
        </div>
      </div>
    </div>
  )
}

function SubscriptionCard({ sub }) {
  const config = STATUS_CONFIG[sub.status]
  const yearlyCost = (sub.monthly_cost * 12).toFixed(2)

  return (
    <div className="card" style={{ borderColor: config.border, background: config.bg }}>
      <div className="card-header">
        <div className="card-title">
          <span className="service-name">{sub.service}</span>
          <span className="category-badge">{sub.category}</span>
        </div>
        <div className="card-cost">
          <span className="monthly-cost">${sub.monthly_cost}<span className="per-month">/mo</span></span>
          <span className="yearly-cost">${yearlyCost}/yr</span>
        </div>
      </div>

      <div className="card-score">
        <div className="score-bar-bg">
          <div
            className="score-bar-fill"
            style={{
              width: `${sub.graveyard_score}%`,
              background: config.color
            }}
          />
        </div>
        <span className="score-label" style={{ color: config.color }}>
          Score: {sub.graveyard_score}
        </span>
      </div>

      <p className="verdict">{sub.verdict}</p>

      <div className="card-footer">
        <span className="billing-email">📧 {sub.billing_email}</span>
        {sub.last_email_id && (
          <span className="last-seen">Last email found</span>
        )}
      </div>
    </div>
  )
}

function Column({ status, subscriptions }) {
  const config = STATUS_CONFIG[status]
  return (
    <div className="column">
      <div className="column-header" style={{ borderColor: config.color }}>
        <span className="column-title">{config.label}</span>
        <span className="column-desc">{config.desc}</span>
        <span className="column-count" style={{ background: config.color }}>
          {subscriptions.length}
        </span>
      </div>
      <div className="column-cards">
        {subscriptions.length === 0 ? (
          <div className="empty-column">None here 🎉</div>
        ) : (
          subscriptions.map(sub => (
            <SubscriptionCard key={sub.service} sub={sub} />
          ))
        )}
      </div>
    </div>
  )
}

export default function App() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)

  const fetchAudit = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await axios.get('http://localhost:3001/api/audit')
      setData(res.data)
      setLastUpdated(new Date().toLocaleTimeString())
    } catch (err) {
      setError('Failed to fetch audit data. Make sure the server is running.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAudit()
  }, [])

  const grouped = data ? {
    zombie: data.subscriptions.filter(s => s.status === 'zombie'),
    hibernating: data.subscriptions.filter(s => s.status === 'hibernating'),
    active: data.subscriptions.filter(s => s.status === 'active'),
  } : null

  return (
    <div className="app">
      <header className="header">
        <div className="header-left">
          <h1 className="title">💀 Subscription Graveyard</h1>
          <p className="subtitle">Audit your subscriptions. Kill the zombies. Keep your money.</p>
        </div>
        <div className="header-right">
          {lastUpdated && <span className="last-updated">Updated {lastUpdated}</span>}
          <button className="refresh-btn" onClick={fetchAudit} disabled={loading}>
            {loading ? '⏳ Scanning...' : '🔍 Run Audit'}
          </button>
        </div>
      </header>

      {loading && (
        <div className="loading">
          <div className="loading-spinner" />
          <p>Scanning your subscriptions across Gmail, Notion & Google Calendar...</p>
          <p className="loading-sub">Powered by Coral SQL · 3-source cross JOIN</p>
        </div>
      )}

      {error && (
        <div className="error">
          <p>{error}</p>
          <button onClick={fetchAudit}>Try Again</button>
        </div>
      )}

      {data && !loading && (
        <>
          <SavingsBanner summary={data.summary} />
          <div className="columns">
            <Column status="zombie" subscriptions={grouped.zombie} />
            <Column status="hibernating" subscriptions={grouped.hibernating} />
            <Column status="active" subscriptions={grouped.active} />
          </div>
          <footer className="footer">
            <p>Powered by <strong>Coral</strong> · Gmail + Notion + Google Calendar · Built for Pirates of the Coral-bean Hackathon</p>
          </footer>
        </>
      )}
    </div>
  )
}