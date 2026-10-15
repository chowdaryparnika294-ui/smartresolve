# Backend audit and fixes

Scope: the checked-out SmartResolve Express API, schemas, dependency manifests, and frontend API calls. Findings were exercised locally against real MongoDB. This is not an audit of a deployed host or a browser-based accessibility/UI audit.

## Fixed findings

| Priority | Problem | Fix |
| --- | --- | --- |
| High | Duplicate suggestions returned other citizens' and departments' complaint details, including private contact data. | Scope candidate queries to the authenticated citizen or staff department; administrators retain global access. |
| High | Staff without a department could list all unassigned complaints. | Use a shared restrictive access scope for lists, analytics, and duplicate suggestions. |
| High | JWT role/department claims remained authoritative after demotion, reassignment, or account deletion. | Resolve the current account on every authenticated request; reject deleted accounts and restrict verification to HS256. |
| High | Complaint search accepted MongoDB query objects and raw regular expressions; pagination accepted invalid numbers. | Validate query types/enums and bounded integer pages; escape literal search text for both title and code. |
| Medium | Staff could not open their assigned complaint details because the populated department object was compared to a string ID. | Compare the populated department ID and test both allowed and forbidden reads. |
| Medium | Administrators could assign nonexistent departments or staff from a different department. | Validate referenced departments and assignees; clear stale assignees on department changes. Missing user updates return 404, and role-only updates preserve department bindings. |
| Medium | Duplicate grouping accepted repeated/nonexistent complaints, allowing self-links and invalid groups. | Validate distinct IDs, existence, bounded group size, and existing duplicate relationships before writing. |
| Medium | Reopening preserved confirmed/resolved state and an expired deadline. | Clear confirmation and resolution, record the transition, and establish a new deadline for the reopened complaint. |
| Medium | SLA analytics counted every resolved complaint as compliant, even when resolved late. | Compare the final resolved history timestamp to the deadline; missing resolution evidence is not counted as compliant. |
| Medium | Invalid IDs and malformed JSON became HTTP 500 responses; registration races could also return 500. | Return appropriate 400/409/413 client errors without exposing database details. |
| Medium | Multipart text fields were insufficiently bounded and the upload library was deprecated. | Upgrade Multer from 1.x to 2.4.0, limit file/field/part counts and field sizes, and reject unsupported MIME types explicitly. |
| Medium | Registration accepted passwords beyond bcrypt's 72-byte limit, silently truncating distinguishing characters. | Validate UTF-8 byte length before hashing. |

Added the missing `backend/.env.example` referenced by setup documentation. The actual development secret is generated locally in ignored configuration, never committed.

## Validation

- Reproduced nine failing security/workflow regression cases against the original API before applying fixes.
- Four behavioral logic tests and fourteen MongoDB-backed API tests pass after fixes. The suite includes successful register/login/submit/resolve/confirm/feedback/reopen requests as well as access-denial cases.
- Frontend production build passes; Vite serves the application and proxies `/api/health` to a connected backend.
- Lockfile-based installation works. npm dependency audits report zero advisories for root, backend, and frontend at the time of this run; advisory results do not guarantee the absence of vulnerabilities.

Commands from the repository root:
```bash
npm test
TEST_MONGODB_URI=mongodb://127.0.0.1:27017 npm run test:integration
npm run build
```

## Remaining production work

- Complaint, audit, notification, and duplicate-group writes span multiple documents without transactions. A database failure or concurrent mutation can leave partial state. Transactional guarantees require a replica-set MongoDB deployment and additional concurrency testing.
- Large analytics, department-detail, and administrator-user queries still need pagination/aggregation and load testing.
- Frontend authentication uses localStorage. Consider an HTTPS-only, HttpOnly cookie session design with appropriate CSRF protection; add email verification, account recovery, and session revocation for password changes.
- Images are not retained, and MIME checks do not verify image contents. Durable evidence needs private storage, actual content validation, and controlled downloads.
- The demo seed creates documented fixed-password accounts and can reset their roles/passwords when rerun. Keep it confined to local demonstration databases.
- Browser end-to-end tests, deployed HTTPS/CORS/proxy behavior, backup recovery, and the optional trained Python classifier were not verified in this audit.

The changes are local and have not been deployed or published. Review the environment configuration draft and publish the prepared development environment through environment settings when desired.
