SELECT
  n.service,
  n.monthly_cost,
  n.billing_email,
  n.category,
  MAX(c.updated) AS last_calendar_activity
FROM (
  SELECT
    json_get_str(json_get_json(properties, 'Service', 'title'), 0, 'plain_text')        AS service,
    json_get_float(properties, 'Monthly Cost', 'number')                                AS monthly_cost,
    json_get_str(json_get_json(properties, 'Billing Email', 'rich_text'), 0, 'plain_text') AS billing_email,
    json_get_str(properties, 'Category', 'select', 'name')                             AS category
  FROM notion.data_source_pages
  WHERE data_source_id = '019e211f-b134-4e8b-9438-4bc028ba48ab'
) n
LEFT JOIN google_calendar.events c
  ON c.summary ILIKE '%' || n.service || '%'
GROUP BY n.service, n.monthly_cost, n.billing_email, n.category
ORDER BY last_calendar_activity ASC NULLS FIRST