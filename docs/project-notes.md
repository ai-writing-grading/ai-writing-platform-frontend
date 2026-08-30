# Architectural Constraints and Decisions

## Architectural Constraints

### Reliability of AI Evaluation

Language-model output is probabilistic and may vary between requests. A single model response cannot be treated as an authoritative assessment, particularly when a score is ambiguous or confidence is low. The architecture must support rubric grounding, consistency checks, and human review for cases that should not be resolved solely by automated grading.

### Latency and External-Service Dependency

Document parsing, semantic retrieval, multi-agent evaluation, and language-model inference may take substantially longer than ordinary application requests. The platform also depends on externally managed services for model inference, payment processing, and email delivery. Network latency or provider failure is outside the direct control of the platform and must not cause unrelated services to become unavailable.

### Security and Access Boundaries

The platform processes user accounts, submitted writing, assessment results, subscription information, and privileged review operations. Externally initiated application requests must pass through a controlled entry point, and protected functions require authentication. Reviewer, administrator, and super-administrator capabilities must remain separated from ordinary user functions. Service credentials and provider keys must remain in backend environment configuration and must not be exposed to the browser.

### Bounded Resource Usage

Uploads and batch operations must be bounded to protect backend and external-model capacity. Uploaded PDF and DOCX files are limited to 20 MB. Batch grading allows between 1 and 20 concurrent evaluations per job, and inference usage is controlled by plan-based daily quotas. These limits reduce excessive memory consumption, uncontrolled parallel model calls, and resource contention.

### Deployment Scope

The backend services are deployed on a single Alibaba Cloud ECS instance. This keeps the operational model appropriate for the current project scope and requires workloads to remain within the capacity of one compute node.

## Key Architectural Decisions

### Layered and Service-Oriented Logical Structure

The system uses a layered, service-oriented structure to separate user interaction, business capabilities, data responsibilities, and external integration. Capability boundaries and explicit service contracts reduce coupling and keep responsibilities clear.

### Central API Gateway and Role-Based Access Control

A single API Gateway centralises authentication, routing, role checks, and inference quotas instead of duplicating these controls across public endpoints. RBAC separates ordinary users, reviewers, administrators, and super administrators, with role grants and manual paid-access assignment restricted to the super-administrator role.

### Grounded, Multi-Stage AI Evaluation

AI assessment combines retrieval grounding, multiple specialist evaluations, consistency checking, and human review rather than relying on one model response. This decision improves the basis of generated feedback and provides an escalation path for uncertain, ambiguous, or inconsistent results.

### Shared Data Platform with Explicit Responsibilities

PostgreSQL with pgvector stores relational and vector data in one persistent platform, while Redis handles short-lived state and caching. Sharing PostgreSQL reduces operational complexity, although the foreign-key relationship between subscriptions and users remains an acknowledged coupling between two domain contexts.

### Asynchronous and Bounded Long-Running Work

Interactive operations use direct request-response APIs, while batch grading and workflow execution run asynchronously with separately retrievable status. Bounded concurrency prevents long-running work from monopolising backend or external-model capacity.

### Inference Efficiency and Resilience Controls

Plan-based quotas and exact or near-duplicate caching limit unnecessary inference requests. A tiered evaluation path allows the document pipeline to use an alternative grading service when the primary path is unavailable; deterministic mock output is limited to development, testing, and demonstration environments.

### Separated Frontend and Containerised Backend Deployment

Frontend delivery is separated from backend processing: the React application is hosted independently, while the backend services are containerised on a single compute node. This creates a clear deployment boundary between static application delivery and backend processing.

# Logical Architecture

The logical architecture is presented through a layered system view, a Domain-Driven Design context map, and a detailed view of the Multi-Agent subsystem.

## Logical Architecture Overview

**[Insert Figure: System Logical Architecture Overview]**

The system is organised into Presentation, Application Services, Data, and External Systems layers. The Presentation Layer contains separate portals for users, reviewers, and administrators, all of which access backend capabilities through the API Gateway.

Within the Application Services Layer, the gateway handles the common access boundary and routes requests to four specialist capabilities. AI Inference performs rubric-based grading and manages human-review cases; Knowledge Retrieval provides semantic search; Document Pipeline coordinates document processing and scoring; and Multi-Agent Service provides drafting, evaluation, refinement, and recommendation functions.

The Data Layer separates persistent relational and vector information from temporary cache and processing state. The External Systems layer contains QQ Mail, Stripe, and DeepSeek. Only application services access the data stores and external providers; presentation components do not connect to them directly.

A writing submission illustrates how the layers collaborate. The request enters through the gateway and is routed to Document Pipeline, which coordinates document processing with retrieval and evaluation capabilities. Persistent results and temporary processing state are handled through the Data Layer, while model calls use the external inference provider. The completed result returns through the same gateway boundary, and any case requiring human judgement becomes available through the Reviewer Workspace.

## Domain-Driven Design Context Map

**[Insert Figure: DDD Context Map]**

The context map reorganises the platform around domain-model boundaries rather than runtime services. Writing Intelligence and Assessment and Review are the core domains. Knowledge Library and Document Workflow are supporting domains, while Identity and Access and Subscription and Billing are generic domains.

This classification reflects each context's contribution to the platform. The two core domains contain the writing-assistance and assessment capabilities that distinguish the product. Supporting domains enable those capabilities without defining the platform's primary value, while the generic domains provide functions required by most account-based applications.

The main relationships show how models cross these boundaries. Knowledge Library publishes a retrieval contract consumed by Writing Intelligence through an anti-corruption layer. Writing Intelligence supplies primary evaluation to Document Workflow, while Assessment and Review supplies fallback grading. Assessment and Review also publishes rubric dimensions that Writing Intelligence translates for its own evaluation model. In these relationships, the Open Host Service and Published Language define a stable upstream contract, while the downstream anti-corruption layer translates that contract into its own model. QQ Mail, Stripe, and the language-model providers are external upstream systems isolated through internal adapters.

Identity and Access and Subscription and Billing currently share a database-level relationship through `subscriptions.user_id`. The context map marks this as shared-database coupling rather than a Shared Kernel relationship. The foreign key provides referential integrity, but it also makes the two contexts more tightly coupled than the other contract-based integrations.

## Multi-Agent Subsystem Design

**[Insert Figure: Multi-Agent Subsystem Logical Architecture]**

The Multi-Agent diagram shows how lower-level functional elements are packaged behind the Agent API. The API Gateway routes direct requests to guardrail, drafting, evaluation, refinement, and recommendation capabilities, while Document Pipeline uses the evaluation capability as its primary grading path. Security Guardrail, Drafting Agent, Refinement Agent, and Knowledge RAG Agent remain separate capabilities within the same subsystem boundary.

Security Guardrail screens input before further AI processing. Drafting Agent creates structured writing, Refinement Agent improves existing text while preserving its voice, and Knowledge RAG Agent supplies vocabulary and idiom recommendations grounded in retrieved material. Keeping these functions separate allows each request to invoke only the capability it requires while retaining one subsystem interface.

Evaluation is implemented as an orchestrated panel. Vocabulary and Grammar, Structure and Logic, and Style agents assess complementary dimensions in parallel. Their outputs are combined by the Master Judge into an overall result. When the variation between specialist results exceeds the configured threshold, the Consistency Arbiter performs an additional check; otherwise, the Master Judge result proceeds directly. This conditional route adds scrutiny only when the specialist evaluations materially disagree.

The subsystem uses DeepSeek for language-model execution, Knowledge Retrieval for semantic results, the Cache and State Store for reusable evaluation state, and AI Inference for administrator-configured rubric information. These dependencies remain outside the subsystem boundary.

# Physical Architecture

The physical architecture separates frontend delivery on Vercel from containerised backend execution on Alibaba Cloud ECS. It defines the runtime nodes, network boundaries, persistence components, external connections, and allocation of deployable software artifacts.

## Technology Stack

| Area | Technologies | Role |
|---|---|---|
| Frontend | React, TypeScript, Vite, Vercel | Builds and distributes the browser-based single-page application |
| Backend | Python, FastAPI, Uvicorn | Implements the API Gateway and specialist application services |
| Container platform | Docker, Docker Compose, Caddy | Packages backend services, coordinates their deployment, and provides the HTTPS entry point |
| Data platform | PostgreSQL 16, pgvector, Redis 7 | Stores relational and vector data and supports caching and short-lived processing state |
| Infrastructure | Alibaba Cloud ECS, Ubuntu Linux | Hosts the backend container environment on a single compute node |
| External services | DeepSeek API, Stripe API, QQ Mail SMTP | Provides model inference, payment processing, and registration-email delivery |

## Physical Architecture Overview

**[Insert Figure: Physical Architecture Overview]**

The frontend and backend run in separate hosting environments. Vercel hosts the compiled React SPA and distributes its HTML, CSS, and JavaScript assets through its edge network. A user first downloads these assets over HTTPS, after which the application executes in the browser and sends API requests to the public backend endpoint.

The backend is hosted on an Ubuntu-based Alibaba Cloud ECS instance. Docker Engine and Docker Compose provide the container runtime, and Caddy is the public ingress component. Caddy terminates TLS and forwards requests to the API Gateway, which is the internal application entry point. The gateway then routes requests to AI Inference, Knowledge Retrieval, Pipelines, and Multi-Agent according to the requested capability. These containers communicate over a private Docker bridge network; the reverse proxy is the externally accessible entry to the backend.

PostgreSQL 16 with pgvector provides persistent relational and vector storage. Its data is retained in a Docker volume backed by ECS storage. Redis 7 provides caching and temporary processing state for services such as the gateway, inference, pipelines, and agents. Keeping these data components inside the container network prevents browser clients from accessing them directly.

Outbound integrations leave the ECS node through secured provider connections. AI services call DeepSeek over HTTPS, the gateway communicates with Stripe over HTTPS for checkout and webhook processing, and registration verification messages are delivered through QQ Mail using SMTP over TLS. Provider credentials are supplied to backend containers through environment configuration and are not included in the frontend bundle.

## Physical Deployment

**[Insert Figure: Physical Deployment Diagram]**

The deployment diagram focuses on the allocation of deployable artifacts. The frontend build produces a React SPA distribution containing the static `dist/` assets. This artifact is deployed to the Vercel production platform and served by its edge CDN. The browser downloads the SPA from Vercel over HTTPS and executes it on the user's device.

Backend artifacts are deployed to a separate Alibaba Cloud ECS node. The node runs Ubuntu Linux and Docker Engine, while `docker-compose.prod.yml` defines the container allocation. The deployment contains the API Gateway image, the specialist application images for AI, retrieval, pipelines, and agents, and the data images for PostgreSQL and Redis. Once deployed, the browser communicates with the ECS backend through the HTTPS API endpoint; it does not connect directly to individual service or data containers.

# Security Assessment

## STRIDE Threat Model

**[Insert Figure: STRIDE Threat Model]**

The STRIDE assessment focuses on three principal trust boundaries: browser-to-API traffic, external-provider interactions, and privileged administrative operations. Controls are concentrated at the public API and around actions with the greatest security impact.

Identity protection combines email verification, bcrypt password hashing, and expiring JWTs. RBAC limits authenticated accounts to their assigned capabilities, while repeated role checks at the gateway and sensitive downstream endpoints provide defence in depth. Only super administrators can grant privileged roles.

HTTPS protects traffic from modification in transit. Stripe webhook signatures additionally verify billing events before subscription state is changed.

For accountability, reviewer identities come from authenticated requests, role changes record their grantor, and Caddy logs requests at the public ingress.

Generic error responses reduce information disclosure, while rate limiting restricts repeated automated requests before they consume downstream capacity.

Overall, the implemented controls cover all six STRIDE categories and align with the platform's most exposed and privileged workflows.

# Database Design

The platform uses PostgreSQL with pgvector for relational and vector data. The schema is organised into three responsibility areas: identity and billing, assessment and workflow, and knowledge and configuration.

**[Insert Figure: Database Design]**

`users`, `user_roles`, and `subscriptions` separate account identity from role assignment and billing state. `pipeline_results` stores document-processing outcomes, while `review_queue` preserves AI assessment data and the subsequent human-review lifecycle. `document_embeddings` supports semantic retrieval, and `rubric_dimensions` stores configurable assessment criteria. This separation keeps independently changing concerns out of the same records while retaining one shared data platform.

Privileged role assignments are stored separately from user accounts and support additive RBAC where required. Holding multiple roles combines their permitted actions, but does not bypass endpoint-level authorisation: only a super administrator can grant or revoke roles, protected operations still check for an accepted role, and each grant records who issued it. The unique `(user_id, role)` pair also prevents duplicate assignments. A user may have at most one subscription because `subscriptions.user_id` is both its primary key and a foreign key to `users`. Other cross-service identifiers are resolved by the application, preserving traceability without introducing additional foreign-key coupling.

Stable business attributes use typed relational columns and constraints, while pipeline output and evolving metadata use JSON or `JSONB`. Indexes cover user history, role lookup, and review identifiers. Semantic retrieval uses a 384-dimensional vector column with an HNSW cosine-distance index.

# Detailed Software Design

## Frontend Class-Level Analysis and Design

The following analysis uses the single-document assessment workflow as a representative frontend design slice. It covers submission, result retrieval, and authenticated API access; other frontend workflows are outside the scope of these diagrams.

**[Insert Figure: Frontend Analysis Object Model]**

Within this scope, submission and retrieval are assigned to separate controls. The upload control handles the file-specific workflow, including validation, multipart request construction, and the state of a processing attempt. The dashboard and document-details boundaries share a query control because both retrieve stored pipeline results. This keeps read-only views independent of upload state while avoiding duplicated query behaviour.

The authenticated API client centralises gateway concerns that must remain consistent across both controls: obtaining the current JWT, attaching the authorisation header, and handling `401` and `429` responses. The use-case controls still select their endpoints and interpret their responses because processing, history, and document-detail operations have different contracts.

The entity relationships reflect the document pipeline lifecycle. A `Document` may exist without an `Assessment Result` while processing is incomplete or when failure occurs before scoring. Once produced, the assessment belongs to that document and owns zero or more feedback items; feedback is not retrieved or managed independently by the frontend.

## Frontend Object-Level Interaction Design

**[Insert Figure: Frontend Object Interaction Design]**

Each submission creates a new `FormData` object and places the selected document in the processing endpoint's `file` field. The authenticated client leaves the content type unset so that the browser supplies the multipart boundary, and it attaches the current JWT at dispatch rather than copying the token into upload state.

The API client returns the raw gateway `Response` because the upload workflow parses successful content as an `UploadResult` and failed content as an API `detail` message. Result state is committed only after successful decoding; a failed response updates error state, while a `401` also clears the token and redirects to login.

Single-document processing is synchronous, so the upload boundary remains pending until the gateway returns the pipeline result. This provides an immediate processing summary but ties interaction time to parsing and assessment latency; batch grading therefore uses an asynchronous job and status-retrieval model.

# Testing

This section presents frontend test evidence for the release commit. Backend unit, load, and infrastructure tests are reported separately.

## Frontend Unit Testing

**[Insert Figure: Jest result from GitHub Actions]**

The Jest suite completed 15 test suites and 144 tests without failure.

## Frontend Security Scanning

**[Insert Figure: SonarCloud static analysis and security result]**

**[Insert Figure: Snyk dependency vulnerability scan]**

**[Insert Figure: OWASP ZAP scan of the deployed frontend]**

## Frontend Test Coverage

**[Insert Figure: SonarCloud coverage result]**

## Frontend End-to-End Testing

**[Insert Figure: Playwright HTML report]**

The Playwright run completed both Chromium scenarios without failure: unauthenticated-route protection and the student workflow from login and document upload to result inspection. The test uses the local Docker Compose stack with deterministic mock inference.
