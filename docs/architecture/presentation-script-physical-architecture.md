# Physical Architecture Presentation Script

**Target duration:** approximately 5 minutes  
**Rubric coverage:** physical architectural decisions, technology stack, physical architecture overview, and physical deployment diagram

## 1. Physical Architectural Decisions

**[Show: Physical Architecture Overview]**

Our first decision was to separate frontend delivery from backend processing. The frontend is deployed through Vercel's edge network, so the browser can download the static application from a distributed hosting platform. The backend is placed on an Alibaba Cloud ECS instance, where we have full control over the application services and their data dependencies.

The second decision was to use a single ECS node for the backend. This is suitable for the expected workload and budget of this project, and it keeps deployment and maintenance manageable. The trade-off is that the ECS instance remains a single point of failure and has limited horizontal scalability.

The third decision was to use one public backend entry point. Caddy receives HTTPS traffic, terminates TLS, and forwards requests to the API Gateway. The application and data containers communicate through a private Docker bridge network.

With these deployment choices in place, I will briefly introduce the technologies used to implement them.

## 2. Technology Stack

The frontend stack is React, TypeScript, and Vite, deployed on Vercel.

The backend uses Python, FastAPI, and Uvicorn, running in Docker on an Ubuntu ECS instance. Docker Compose provides orchestration, and Caddy handles reverse proxying and TLS.

For data, PostgreSQL stores relational application records, while pgvector adds vector storage and similarity-search support. Redis is used for caching, verification codes, quotas, and workflow or evaluation state. The main external technologies are DeepSeek for language-model inference, Stripe for subscription payments, and QQ Mail SMTP for verification-email delivery.

Now I will use the overview diagram to follow the main network paths through this stack.

## 3. Physical Architecture Overview

The request path begins on the left with a desktop or mobile device. The browser downloads the React application from the Vercel Edge Network over HTTPS. Once loaded, the application sends API requests to the public HTTPS endpoint on the Alibaba Cloud ECS instance.

At the edge of the ECS node, Caddy accepts public HTTPS traffic and forwards it to the API Gateway. The gateway is the only application entry point and routes each request to the appropriate service container.

Service-to-service calls use the private Docker bridge network. PostgreSQL is attached to a Docker volume so that application and vector data survive container replacement, while Redis holds cache and workflow state. The reverse proxy is publicly reachable, while the application and data containers remain private.

The ECS node also makes outbound connections to managed services. DeepSeek and Stripe are reached through HTTPS, while registration emails are delivered to QQ Mail using SMTP over TLS. Users enter through HTTPS, internal containers communicate on the bridge network, and external providers are reached through encrypted outbound connections.

The overview shows the communication paths. The deployment diagram now shows exactly where the software artifacts are allocated.

## 4. Physical Deployment Diagram

**[Switch to: Physical Deployment Diagram]**

On the client side, the user device is the deployment node, the web browser is its execution environment, and the React SPA is the runtime artifact.

For the frontend, the compiled SPA distribution is allocated to the edge CDN and static-hosting environment within the Vercel Production Platform.

For the backend, the Alibaba Cloud ECS instance is the production compute node. Ubuntu Linux provides the host environment, and Docker Engine runs containers created from the API Gateway, application-service, and data-service images. Their allocation is defined by the production Docker Compose specification.

The deployment mapping is therefore clear: the frontend distribution is hosted on Vercel, the SPA runs in the user's browser, and the backend containers run on the ECS instance.
