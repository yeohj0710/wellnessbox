-- RND: Module 03 KPI #6 ops adapter query template.
-- Bind :window_end_utc with an ISO-8601 UTC timestamp (for example 2026-02-09T00:00:00Z).
-- Replace schema/table names to match your pharmacovigilance warehouse.

SELECT
  ae.event_id,
  ae.case_id,
  ae.reported_at_utc AS reported_at,
  CASE
    WHEN COALESCE(ae.engine_recommendation_linked, FALSE) THEN 'true'
    ELSE 'false'
  END AS linked_to_engine_recommendation
FROM pharmacovigilance.adverse_events AS ae
WHERE ae.reported_at_utc >= (:window_end_utc::timestamptz - INTERVAL '12 months')
  AND ae.reported_at_utc <= :window_end_utc::timestamptz
  AND ae.event_status = 'confirmed';
