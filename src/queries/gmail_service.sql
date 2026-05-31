SELECT MAX(id) AS last_email_id
FROM gmail.search_emails(q => 'from:{BILLING_EMAIL}')