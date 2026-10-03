-- Analytics Queries for Healthcare Access Guidance Prototype
-- Safety: Completely anonymous event and session aggregation; zero PII.

-- 1. High-Level Telemetry Summary Metrics
SELECT 
    COUNT(s.session_id) AS sessions_started,
    COUNT(CASE WHEN s.is_completed = TRUE THEN 1 END) AS sessions_completed,
    ROUND(
        (COUNT(CASE WHEN s.is_completed = TRUE THEN 1 END)::numeric / 
        NULLIF(COUNT(s.session_id), 0)::numeric) * 100, 
        2
    ) AS completion_rate_percentage,
    COUNT(CASE WHEN s.reference_found = TRUE THEN 1 END) AS reference_found_count,
    COUNT(CASE WHEN s.reference_found = FALSE THEN 1 END) AS reference_not_found_count
FROM guidance_session s;

-- 2. State Transition Event Counts
SELECT 
    to_state AS state_name,
    COUNT(*) AS event_count
FROM guidance_event
GROUP BY to_state
ORDER BY event_count DESC;

-- 3. Category Selection Distribution
SELECT 
    COALESCE(selected_category, 'NONE_OR_ABORTED') AS category_id,
    COUNT(*) AS selection_count
FROM guidance_session
GROUP BY selected_category
ORDER BY selection_count DESC;

-- 4. Recent Guidance Audit Trail (Append-Only Event Ledger)
SELECT 
    event_id,
    session_id,
    event_type,
    from_state,
    to_state,
    created_at
FROM guidance_event
ORDER BY created_at DESC
LIMIT 20;
