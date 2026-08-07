# Security Assessment Presentation Script

**Target duration:** approximately 2 minutes  
**Method:** STRIDE threat modelling

## STRIDE Threat Assessment

| STRIDE Category | Threat Description | Mitigation |
| --- | --- | --- |
| **Spoofing** | An attacker creates a false account or impersonates a registered user. | Registration requires a short-lived email code, passwords are hashed with bcrypt, and protected requests require a signed, expiring JWT. |
| **Tampering** | Requests or payment events are modified in transit. | HTTPS protects public traffic, and Stripe webhook signatures are verified before subscription data is updated. |
| **Repudiation** | A reviewer or administrator denies performing a sensitive action. | Review decisions are tied to the authenticated reviewer ID, role grants record `granted_by`, and Caddy maintains request logs. |
| **Information Disclosure** | Server errors expose internal implementation details. | Unexpected errors return a generic response without exposing stack traces. |
| **Denial of Service** | Automated requests exhaust platform resources. | Rate limiting restricts repeated requests. |
| **Elevation of Privilege** | A user attempts to perform an action reserved for a higher-privilege role. | RBAC separates normal users, reviewers, administrators, and super administrators; privileged routes check the required role before executing the action. |

## Presentation Script

**[Show: STRIDE Threat Assessment Table]**

After presenting the architecture, I will now assess its security using the STRIDE threat model. The table summarises one representative threat and the main controls implemented for each category.

For spoofing, an attacker may try to create a false account or impersonate a registered user. Registration requires a short-lived email verification code, passwords are stored as bcrypt hashes, and protected requests require a signed JWT with an expiry time.

For tampering, requests or payment events could be modified. Public traffic is protected by HTTPS, and Stripe webhook signatures are verified before any subscription record is updated.

For repudiation, a reviewer or administrator could deny performing a sensitive action. Review decisions are tied to the authenticated reviewer ID, role grants record who granted the permission, and Caddy maintains request logs to support traceability.

For information disclosure, server errors could expose internal implementation details. Unexpected errors are converted into a generic response rather than returning stack traces to the client.

For denial of service, automated requests could exhaust platform resources. Rate limiting restricts repeated requests and reduces resource abuse.

Finally, elevation of privilege is controlled through four role levels. Normal users access writing features, reviewers handle human-review cases, and administrators manage user status, view subscriptions, and operate knowledge, batch, and rubric functions. Only super administrators can grant roles or manually assign paid access. Each privileged route checks the required role before executing the action.

Together, these controls provide protection across identity, data integrity, accountability, confidentiality, availability, and authorisation.
