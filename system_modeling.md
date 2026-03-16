# OpsCommand System Modeling

This document provides a system-level model of OpsCommand, including runtime components, communication paths, and trust boundaries.

## 1. Runtime Context Model

```mermaid
flowchart LR
    User["Engineer / Team Member"]
    Browser["Web Browser"]
    Ingress["K8s Ingress\nopscommand.local"]

    subgraph K8S["Kubernetes Cluster"]
        Frontend["Frontend Pod\nReact + Vite static app"]
        Backend["Backend Pod\nNode.js + Express + Socket.io"]
        Mongo["MongoDB Pod\nStateful data store"]
        KubeAPI["Kubernetes API Server"]
        SA["ServiceAccount + RBAC"]
        Cmds["Command Plugins\n/help /status /logs /restart"]
    end

    User --> Browser
    Browser -->|HTTP/HTTPS| Ingress
    Ingress -->|HTTP| Frontend
    Browser -->|REST API + JWT| Backend
    Browser <-->|WebSocket (Socket.io)| Backend
    Backend -->|Mongoose| Mongo
    Backend -->|client-node| KubeAPI
    Backend --> Cmds
    SA -->|Authorize API calls| KubeAPI
    Backend -. runs as .-> SA

    classDef external fill:#F3F7FF,stroke:#4C6FFF,stroke-width:1px,color:#0F1C3F;
    classDef platform fill:#F7FFF3,stroke:#2E7D32,stroke-width:1px,color:#102814;
    classDef data fill:#FFF8F1,stroke:#D97706,stroke-width:1px,color:#3B2204;

    class User,Browser external;
    class Frontend,Backend,KubeAPI,SA,Cmds platform;
    class Mongo data;
```

## 2. Container and Responsibility Model

| Component | Responsibility | Key Protocols / Interfaces |
|---|---|---|
| Frontend | User authentication UI, team chat UI, ops terminal UI | HTTP to backend, WebSocket to backend |
| Backend | Auth, command execution, event broadcasting, persistence | Express REST, Socket.io, Mongoose, Kubernetes client |
| MongoDB | Persist chat and operational message history | Mongo wire protocol |
| Kubernetes API | Cluster state and operation endpoint | Kubernetes REST API |
| ServiceAccount + RBAC | Access control for backend cluster operations | Kubernetes RBAC rules |

## 3. Primary Interaction Paths

1. User logs in from the frontend and receives a JWT from backend auth routes.
2. Frontend opens a Socket.io connection for real-time chat and command responses.
3. User sends slash commands from terminal UI to backend.
4. Backend command plugin executes against Kubernetes API as permitted by RBAC.
5. Backend emits results over WebSocket and stores relevant messages in MongoDB.

## 4. Trust Boundaries

- Boundary A: User browser to cluster ingress (public entry point).
- Boundary B: Frontend-to-backend API and WebSocket traffic (application boundary).
- Boundary C: Backend to Kubernetes API using ServiceAccount identity (control plane boundary).
- Boundary D: Backend to MongoDB for persistent storage (data boundary).

## 5. Operational Notes

- Local development can run via Docker Compose (frontend, backend, mongo).
- Kubernetes workflow uses Skaffold plus manifests under k8s/.
- Ingress host expected: opscommand.local.
