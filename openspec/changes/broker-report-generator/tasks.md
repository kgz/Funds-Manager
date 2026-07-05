## 1. Database

- [ ] 1.1 Migration: `broker_report_shares`, `broker_report_annotations`
- [ ] 1.2 Model: share + annotation CRUD, public fetch by token
- [ ] 1.3 Redaction helper applied to payload clone at read time
- [ ] 1.4 `cargo test --lib`

## 2. API

- [ ] 2.1 Share endpoints on `/api/report-snapshots/{id}/shares`
- [ ] 2.2 Annotation endpoints on `/api/report-snapshots/{id}/annotations`
- [ ] 2.3 Public `GET /api/public/broker-reports/{token}`
- [ ] 2.4 Register routes in app scope

## 3. Frontend

- [ ] 3.1 Types + API helpers for shares, annotations, public report
- [ ] 3.2 `BrokerReportPage` print layout (sections, chart, disclaimer)
- [ ] 3.3 Share panel (redaction, create/copy/revoke)
- [ ] 3.4 Annotation panel on snapshot report
- [ ] 3.5 Public route `/r/:token`
- [ ] 3.6 Link from snapshot detail → report
- [ ] 3.7 Print CSS
- [ ] 3.8 `pnpm run build`

## 4. Verification

- [ ] 4.1 Manual QA: create share, open incognito, print PDF, revoke
- [ ] 4.2 PR `Closes #117`
