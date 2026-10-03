## Admin analytics dashboard verification

**Date:** 2026-10-03  
**Environment:** Local synthetic demonstration environment

### Steps performed

1. Opened `http://localhost:5173`.
2. Opened the **Admin Analytics** view.
3. Clicked **Refresh Metrics**.
4. Confirmed that the dashboard displayed synthetic workflow metrics from the backend.

### Observed results

| Metric | Observed value |
|---|---:|
| Sessions started | 19 |
| Sessions completed | 12 |
| Completion rate | 63.16% |
| Reference found count | 8 |
| Reference not found count | 5 |
| Data-quality check flags | 0 |
| `SESSION_INITIALIZED` events | 19 |
| `SERVICE_CATEGORY_SELECTED` events | 13 |
| `GUIDANCE_ACKNOWLEDGED_AND_COMPLETED` events | 12 |
| `SERVICE_MATCH_FOUND` events | 8 |
| `OFFICIAL_ROUTE_VIEWED` events | 8 |
| `SERVICE_MATCH_NOT_FOUND` events | 5 |
| `SUPPORT_ROUTE_VIEWED` events | 5 |

### Interpretation

- The dashboard successfully displayed event-derived metrics for synthetic anonymous demonstration sessions.
- The 13 category-selection events equal 8 synthetic reference matches plus 5 synthetic no-match outcomes.
- The difference between 19 started sessions and 12 completed sessions represents incomplete or abandoned prototype sessions.
- The dashboard metrics are synthetic  prototype telemetry only and do not represent clinical outcomes, real patient behavior, hospital performance, eligibility, coverage, or healthcare access .

### Safety and scope confirmation

- All displayed data are from synthetic student-demo sessions.
- No patient identity, Aadhaar, ABHA, medical record, eligibility, claim, billing, or hospital-availability data were collected or displayed.
- Admin endpoints are unauthenticated only in local demonstration mode and must be protected before deployment.
