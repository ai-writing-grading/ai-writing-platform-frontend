# Logical Architecture Presentation Script

**Target duration:** approximately 5 minutes  
**Coverage:** logical architectural decisions, logical architecture overview, Domain-Driven Design, and the Multi-Agent subsystem

## 1. Logical Architectural Decisions

**[Show Figure 2a: System Logical Architecture Overview]**

I will begin with the logical architecture of our AI Writing Platform. Here I am focusing on how responsibilities are separated and how components collaborate.

We made three main decisions. First, a layered, service-oriented structure separates user interaction, business capabilities, state, and external integration. Second, a single API Gateway gives the frontend one entry point for authentication, access control, quotas, and routing. Third, specialist AI capabilities are separated into inference and review, knowledge retrieval, document workflow, and multi-agent collaboration. This reduces direct coupling and allows the scoring workflow to fall back to an alternative evaluation service when necessary.

With these choices, let us look at how the system is organised as a whole.

## 2. Logical Architecture Overview

The presentation layer provides three role-oriented workspaces. The User Portal supports writing, upload, feedback, learning, and subscriptions. The Reviewer Workspace handles human-review cases, while the Admin Portal covers operational management and rubric policy.

All three use the same gateway boundary. Behind it, AI Inference manages grading and review, Knowledge Retrieval provides semantic search, Document Pipeline orchestrates processing, and Multi-Agent provides drafting, evaluation, refinement, guardrails, and recommendations.

The data layer separates persistent relational and vector information from short-lived cache and workflow state. The external layer contains email delivery, payment, and managed language-model providers. The Application Layer connects to these providers through dedicated integration points.

This layered view explains technical responsibility, but not ownership of domain models. For that, I will move to the Domain-Driven Design context map.

## 3. Domain-Driven Design Context Map

**[Show Figure: DDD Context Map, Existing-State Map]**

The core domains are Writing Intelligence, which covers drafting, evaluation, refinement, and recommendations, and Assessment and Review, which covers rubrics, inference results, review cases, and reviewer decisions. Knowledge Library and Document Workflow are supporting domains. Identity and Access, and Subscription and Billing, are generic domains needed to operate the platform.

The arrows show implemented upstream and downstream influence. Knowledge Library publishes a retrieval contract consumed by Writing Intelligence through an anti-corruption layer. Writing Intelligence provides primary evaluation to Document Workflow, while Assessment and Review provides fallback grading. Assessment and Review also publishes rubric dimensions that Writing Intelligence translates for its Master Judge. QQ Mail, Stripe, and LLM providers are external upstream systems, isolated by internal adapters.

The purple dashed line highlights shared-database coupling between Identity and Subscription. They currently share a relational schema with a physical foreign-key relationship.

Finally, I will take a closer look at the Multi-Agent subsystem.

## 4. Multi-Agent Subsystem Logical View

**[Switch to Figure 2b: Multi-Agent Subsystem Logical Architecture]**

Figure 2b provides a closer view of the Multi-Agent subsystem within the Application Layer. Its Agent API exposes guardrail, drafting, evaluation, refinement, and recommendation capabilities. Inside the Evaluation Panel, three specialist agents assess language, structure, and style in parallel. The Master Judge combines their results, and the Consistency Arbiter performs an additional check when their scores differ significantly. The Knowledge RAG Agent supports vocabulary and writing recommendations through semantic retrieval.

This completes the logical architecture. I will now move to the physical architecture and show where these components are deployed.
