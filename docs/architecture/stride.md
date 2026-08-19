# STRIDE Threat Model

| STRIDE Category | Threat Description | Mitigation |
|---|---|---|
| **Spoofing** | An attacker creates a false account or impersonates a registered user. | Registration requires a short-lived email code, passwords are hashed with bcrypt, and protected requests require a signed, expiring JWT. |
| **Tampering** | Requests or payment events are modified in transit. | HTTPS protects public traffic, and Stripe webhook signatures are verified before subscription data is updated. |
| **Repudiation** | A reviewer or administrator denies performing a sensitive action. | Review decisions are tied to the authenticated reviewer ID, role grants record `granted_by`, and Caddy maintains request logs. |
| **Information Disclosure** | Server errors expose internal implementation details. | Unexpected errors return a generic response without exposing stack traces. |
| **Denial of Service** | Automated requests exhaust platform resources. | Rate limiting restricts repeated requests. |
| **Elevation of Privilege** | A user attempts to perform an action reserved for a higher-privilege role. | RBAC separates normal users, reviewers, administrators, and super administrators; privileged routes check the required role before executing the action. |
