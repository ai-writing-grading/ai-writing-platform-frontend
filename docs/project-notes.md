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

The following class- and object-level analysis uses the single-document assessment workflow as a representative frontend design slice. It covers document submission, history and result retrieval, and shared authenticated API access; editor, subscription, batch-processing, and administrative workflows are outside the scope of these diagrams.

**[Insert Figure: Frontend Analysis Object Model]**

Within this scope, submission is separated from retrieval because it has file-specific responsibilities: checking the selected file, constructing a multipart request, and maintaining the pending, result, and error states of a single processing attempt. The dashboard and document-details boundaries instead depend on the same query control because both read stored pipeline results and differ only in the amount of information they present. They do not depend on upload state or repeat submission behaviour.

The authenticated API client is the shared browser-to-gateway control. It obtains the current JWT when a request is dispatched, adds the authorisation header, clears an invalid session after a `401` response, and publishes the quota event used for `429` responses. Endpoint selection and response interpretation remain with the upload and query controls because the processing, history, and detail operations return different data shapes. This keeps session and quota behaviour consistent without forcing unrelated document operations into one controller.

The entity structure represents the states produced by the document pipeline. A `Document` can exist without an `Assessment Result`, allowing the same object to represent a document that is still processing or has failed before scoring. When scoring completes, the result belongs to that document and supplies the score, grade, summary, model identifier, and any feedback. A feedback item has no independent identity or retrieval path in the frontend; its lifecycle is tied to the assessment result. The optional and one-to-many relationships therefore encode processing state and response ownership rather than merely grouping related fields.

## Frontend Object-Level Interaction Design

**[Insert Figure: Frontend Object Interaction Design]**

The upload interaction creates a new `FormData` object for each submission and places the selected document in the `file` field required by the processing endpoint. The authenticated client leaves the multipart content type unset so that the browser can generate the correct boundary, then attaches the JWT immediately before dispatch. The file and credential are therefore combined only for the outgoing request; the upload boundary does not retain a separate copy of the token.

The API client returns the gateway `Response` to the upload workflow rather than decoding it centrally. This is required because the upload workflow interprets a successful body as an `UploadResult`, whereas a failed body may contain an API `detail` message. The result state is assigned only after a successful response has been decoded. A non-success response instead updates the error state, and a `401` additionally triggers the shared token-clear and login-redirection behaviour. The two outcomes cannot populate result and error state from the same submission.

Single-document processing uses a synchronous request-response interaction: the upload boundary remains in its pending state until the gateway returns the pipeline result. This provides the score and processing summary immediately after submission, but couples the duration of the interaction to parsing and assessment latency. The design is limited to the bounded single-file workflow; batch grading uses an asynchronous job and status-retrieval model elsewhere in the system.
