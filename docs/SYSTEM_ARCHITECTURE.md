# System Architecture Design

LinawLetra follows a three-layer architecture consisting of the User Interface Layer, Application Logic Layer, and Data Storage Layer.

```text
┌───────────────────────────────────────────────────────────────┐
│ User Interface Layer                                            │
│ React + TypeScript web application hosted on Hostinger          │
│ Student, Parent, Teacher, and Admin dashboards                  │
└──────────────────────────────┬────────────────────────────────┘
                               │ HTTPS / authenticated API calls
┌──────────────────────────────▼────────────────────────────────┐
│ Application Logic Layer                                         │
│ Node.js + Express API hosted on Railway                         │
│ Authentication, role authorization, validation, rate limits,   │
│ TTS protection, credential workflows, and access URL handling  │
└──────────────────────────────┬────────────────────────────────┘
                               │ Service-role database operations
┌──────────────────────────────▼────────────────────────────────┐
│ Data Storage Layer                                              │
│ Supabase Auth, PostgreSQL database, Row-Level Security,        │
│ storage buckets, migrations, and managed backups               │
└───────────────────────────────────────────────────────────────┘
```

## Layer responsibilities

| Layer | Main responsibility | LinawLetra components |
| --- | --- | --- |
| User Interface | Presents accessible screens and collects user input. It does not contain service-role credentials or make authorization decisions. | React, TypeScript, Vite, Hostinger, role dashboards, browser accessibility controls. |
| Application Logic | Validates requests, identifies the authenticated user, enforces roles and ownership, calculates trusted outcomes, and returns safe responses. | Express routes, authentication middleware, authorization service, PDF validation, rate limiting, TTS route, Railway. |
| Data Storage | Stores identities, learning records, credential metadata, notifications, assignments, and material metadata while enforcing database isolation. | Supabase Auth, PostgreSQL, RLS policies, RPCs, storage, migrations 023–026. |

## Security boundary

The browser communicates only with approved HTTPS endpoints and public Supabase configuration. Sensitive actions are performed by the Application Logic Layer using server-only credentials. Supabase Row-Level Security provides a second authorization boundary for direct database access. Password values and service-role keys must never be included in the User Interface Layer or documentation.

## Deployment mapping

| Component | Deployment service |
| --- | --- |
| Web user interface | Hostinger (`linawletra.com`) |
| Application API | Railway |
| Authentication, database, storage | Supabase |

