# Algo Flashcards: Full Stack Architecture Diagram

```mermaid
graph TD
  subgraph Frontend (React + Vite)
    A1[User Browser]
    A2[React App]
    A3[React Router]
    A4[Monaco Editor]
    A5[Tailwind CSS]
    A1 --> A2
    A2 --> A3
    A2 --> A4
    A2 --> A5
  end

  subgraph API Layer (Django REST Framework)
    B1[JWT Auth (SimpleJWT)]
    B2[Deck API]
    B3[Card API]
    B4[UserCard API]
    B5[OpenAI Integration]
    B6[Anki Import Command]
    B7[Admin Site]
    B1 --> B2
    B1 --> B3
    B1 --> B4
    B2 --> B3
    B3 --> B4
    B2 --> B5
    B6 -.-> B3
    B7 --> B2
    B7 --> B3
    B7 --> B4
  end

  subgraph Database
    C1[(SQLite DB)]
    C1 --- B2
    C1 --- B3
    C1 --- B4
  end

  A2 -- REST API calls --> B2
  A2 -- REST API calls --> B3
  A2 -- REST API calls --> B4
  B5 -- API calls --> D1[OpenAI API]

  style A1 fill:#f9f,stroke:#333,stroke-width:2px
  style A2 fill:#bbf,stroke:#333,stroke-width:2px
  style B1 fill:#bfb,stroke:#333,stroke-width:2px
  style C1 fill:#ffb,stroke:#333,stroke-width:2px
```

---

**Legend:**
- **Frontend**: React app (Vite, Tailwind, Monaco Editor, React Router)
- **API Layer**: Django REST Framework, JWT Auth, OpenAI integration, Anki import, Admin
- **Database**: SQLite (dev), can be swapped for Postgres/MySQL in prod
- **External**: OpenAI API for card generation

**Flow:**
- User interacts with React app
- React app makes REST API calls to Django backend
- Backend serves data from DB, handles auth, and can call OpenAI
- Admin and import tools manage data
