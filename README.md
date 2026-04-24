<div align="center">

# QuickAid — Smart Campus Helpdesk

![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Azure Functions](https://img.shields.io/badge/Azure_Functions-0062AD?style=for-the-badge&logo=azure-functions&logoColor=white)
![Azure Cosmos DB](https://img.shields.io/badge/Azure_Cosmos_DB-0078D4?style=for-the-badge&logo=microsoft-azure&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![Python](https://img.shields.io/badge/Python-14354C?style=for-the-badge&logo=python&logoColor=white)

</div>

## Overview

QuickAid is a smart campus helpdesk application designed for university users and agent to submit issues, track requests, and receive timely support. Built with a Next.js frontend and Azure Functions serverless backend, QuickAid enables ticket submission, status tracking, automated notifications, and secure data management powered by Azure Cosmos DB.

This application was developed as a Capstone Project for the MyMahir Microsoft Developer programme.

## Features

- **Issue Submission**: A modern web form letting users submit helpdesk tickets with categories and priority levels.
- **Ticket Tracking & Editing**: Users can list, search, view, and edit (while still Open) their own tickets.
- **Role-Based Access**: Three roles — User, Agent, and Admin — each routed to an appropriate portal.
- **Agent Portal**: Agent see tickets assigned to them and can update status (Open / In Progress / Resolved / Closed).
- **Admin Portal**: Admins view all tickets, assign to agent, manage users and roles, and view a monitoring dashboard (UC-11) with Application Insights metrics.
- **Automated Notifications**: Emails on ticket creation, edits, status changes, and assignments via Azure Communication Services.

## Architecture and Technology Stack

The project uses a decoupled client-server architecture with a Next.js frontend and Azure Functions serverless backend.

### Frontend

- **Framework**: Next.js 16 (App Router) with React 19 and TypeScript 5
- **Styling**: Tailwind CSS 4
- **UI Components**: Radix UI, shadcn/ui, Recharts
- **Auth**: Microsoft Entra ID via MSAL (`@azure/msal-browser`, `@azure/msal-react`)
- **Hosting**: Azure App Service

### Backend

- **Runtime**: Azure Functions (Python 3.9+, V2 programming model with Blueprints)
- **Database**: Azure Cosmos DB (NoSQL, Core SQL API)
- **Email**: Azure Communication Services (Email) for transactional emails
- **Security**: Azure Key Vault for secret management
- **Monitoring**: Azure Application Insights (custom events: `TicketSubmitted`, `TicketAssigned`, `TicketStatusChanged`)

### DevOps

- **Containerisation**: Docker and Docker Compose
- **Version Control**: Git and GitHub

## Project Structure

```text
QuickSmartAid/
├── docker-compose.yml
├── CLAUDE.md
├── Project.md
├── README.md
├── TestCase.md
│
├── frontend/                       # Next.js web application
│   ├── Dockerfile
│   ├── middleware.ts               # Route guard (quickaid_session cookie)
│   ├── app/                        # Next.js App Router
│   │   ├── layout.tsx              # Root layout
│   │   ├── page.tsx                # Landing page
│   │   ├── login/                  # Entra ID sign-in
│   │   ├── register/               # Post-login registration
│   │   ├── dashboard/              # User dashboard
│   │   ├── account/                # User account page
│   │   ├── tickets/                # Ticket list
│   │   │   ├── new/                #   Create ticket
│   │   │   └── [id]/               #   Ticket details / edit
│   │   ├── assigned-tickets/       # Agent assigned-tickets view
│   │   ├── admin/insights/         # Admin monitoring dashboard (UC-11)
│   │   └── users/                  # Admin user management
│   │       └── [id]/               #   User detail / role edit
│   ├── components/                 # Reusable UI components
│   │   ├── ui/                     #   shadcn/ui primitives
│   │   ├── app-sidebar.tsx         #   Sidebar navigation
│   │   ├── nav-main.tsx            #   Main navigation
│   │   ├── protected-route.tsx     #   Client-side role gate
│   │   └── ...
│   ├── context/                    # React context providers (auth-context)
│   ├── hooks/                      # Custom React hooks
│   ├── lib/                        # Utilities (api, msal-config, utils)
│   ├── config/                     # Site config + enums
│   ├── types/                      # Shared TS types (user, insights)
│   └── public/                     # Static assets
│
├── backend/                        # Azure Functions serverless API (Python V2)
│   ├── Dockerfile
│   ├── function_app.py             # Main entry: registers blueprints, inits telemetry
│   ├── host.json                   # Azure Functions host configuration
│   ├── local.settings.json         # Local environment variables (gitignored)
│   ├── requirements.txt            # Python dependencies
│   ├── blueprints/                 # API route blueprints
│   │   ├── tickets.py              #   Public ticket endpoints
│   │   ├── users.py                #   Public user endpoints
│   │   ├── agent.py                #   Agent portal endpoints
│   │   ├── admin.py                #   Admin portal endpoints
│   │   └── insights.py             #   Admin analytics endpoint (UC-11)
│   ├── utils/                      # Helpers
│   │   ├── cosmos_client.py        #   Cosmos DB connection
│   │   ├── http_helpers.py         #   JSON / error / CORS helpers
│   │   ├── auth.py                 #   require_role() — X-User-Email lookup
│   │   └── telemetry.py            #   Application Insights custom events
│   └── shared/                     # Service layer
│       ├── ticket/                 #   ticket_service, email_service, validator
│       └── user/                   #   user_service, validator
│
└── docs/                           # Project documentation
```

## API Endpoints

### Public — tickets & users

| Method | Endpoint                              | Description                                | Auth         |
|--------|---------------------------------------|--------------------------------------------|--------------|
| POST   | `/api/submit_ticket`                  | Create a new ticket                        | Any role     |
| GET    | `/api/tickets`                        | Get tickets for the authenticated user     | Any role     |
| GET    | `/api/tickets/search?q={query}`       | Search tickets by subject or ID            | Any role     |
| GET    | `/api/tickets/{ticketId}`             | Get ticket details                         | Any role     |
| PATCH  | `/api/tickets/{ticketId}`             | Edit a ticket (owner only, status=Open)    | Any role     |
| POST   | `/api/users/login`                    | Upsert user on Entra ID login              | Public       |
| GET    | `/api/users?email={email}`            | Get user by email                          | Public       |
| GET    | `/api/users/{userId}`                 | Get user by ID                             | Any role     |

### Agent portal (`X-User-Email` header, role: agent/admin)

| Method | Endpoint                                      | Description                       |
|--------|-----------------------------------------------|-----------------------------------|
| GET    | `/api/agent/tickets`                          | View assigned tickets             |
| PATCH  | `/api/agent/tickets/{ticketId}/status`        | Update ticket status              |

### Admin portal (`X-User-Email` header, role: admin)

| Method | Endpoint                                       | Description                            |
|--------|------------------------------------------------|----------------------------------------|
| GET    | `/api/manage/tickets`                          | View all tickets with filters          |
| PATCH  | `/api/manage/tickets/{ticketId}/assign`        | Assign ticket to agent                 |
| GET    | `/api/manage/agent`                            | List all agent members                 |
| GET    | `/api/manage/users`                            | List all users                         |
| PATCH  | `/api/manage/users/{userId}`                   | Update user role or display name       |
| GET    | `/api/manage/insights?days=30`                 | Aggregated metrics for UC-11 dashboard |

> Note: Uses the `manage` prefix because Azure Functions reserves the `admin` route segment.

## Prerequisites

- **Node.js** v18+ (frontend)
- **Python** v3.9+ (backend)
- **Azure Functions Core Tools** v4 (backend local development)
- **Docker** and **Docker Compose** (optional, for containerised setup)
- **Microsoft Azure** subscription (for production deployment)
- **Azure Communication Services** with Email enabled (for email notifications)
- **Microsoft Entra ID** app registration (for authentication)

---

## Setup — Environment Variables

### Frontend (`frontend/.env.local`)

Create `frontend/.env.local` with the following variables:

```env
NEXT_PUBLIC_API_URL=http://localhost:7071/api
NEXT_PUBLIC_MSAL_CLIENT_ID=<your-entra-app-client-id>
NEXT_PUBLIC_MSAL_TENANT_ID=<your-entra-tenant-id>
```

| Variable | Description | Where to get it |
|----------|-------------|-----------------|
| `NEXT_PUBLIC_API_URL` | Backend API base URL | Use `http://localhost:7071/api` for local dev |
| `NEXT_PUBLIC_MSAL_CLIENT_ID` | Microsoft Entra ID application (client) ID | Azure Portal → App registrations → your app → Overview |
| `NEXT_PUBLIC_MSAL_TENANT_ID` | Microsoft Entra ID directory (tenant) ID | Azure Portal → App registrations → your app → Overview |

### Backend (`backend/local.settings.json`)

Create `backend/local.settings.json` with the following structure:

```json
{
  "IsEncrypted": false,
  "Values": {
    "FUNCTIONS_WORKER_RUNTIME": "python",
    "AzureWebJobsStorage": "",
    "COSMOS_CONNECTION_STRING": "<your-cosmos-db-connection-string>",
    "COSMOS_DATABASE_NAME": "quickaid-db",
    "COSMOS_CONTAINER_TICKETS": "tickets",
    "COSMOS_CONTAINER_USERS": "users",
    "COSMOS_CONTAINER_STATUS_HISTORY": "status_history",
    "EMAIL_CONNECTION_STRING": "<your-azure-communication-services-connection-string>",
    "EMAIL_SENDER_ADDRESS": "<your-verified-sender-address>",
    "APPLICATIONINSIGHTS_CONNECTION_STRING": "<your-application-insights-connection-string>",
    "APPLICATIONINSIGHTS_PORTAL_URL": "<optional-deep-link-to-azure-portal>"
  },
  "Host": {
    "CORS": "*"
  }
}
```

| Variable | Description | Where to get it |
|----------|-------------|-----------------|
| `COSMOS_CONNECTION_STRING` | Azure Cosmos DB connection string | Azure Portal → Cosmos DB account → Keys → Primary Connection String |
| `COSMOS_DATABASE_NAME` | Cosmos DB database name | Default: `quickaid-db` |
| `COSMOS_CONTAINER_TICKETS` | Container for tickets | Default: `tickets` |
| `COSMOS_CONTAINER_USERS` | Container for users | Default: `users` |
| `COSMOS_CONTAINER_STATUS_HISTORY` | Container for status history | Default: `status_history` |
| `EMAIL_CONNECTION_STRING` | Azure Communication Services connection string | Azure Portal → Communication Services → Keys → Connection String |
| `EMAIL_SENDER_ADDRESS` | Verified sender email address (e.g., `DoNotReply@xxx.azurecomm.net`) | Azure Portal → Email Communication Services → Provision Domains → MailFrom addresses |
| `APPLICATIONINSIGHTS_CONNECTION_STRING` | Application Insights connection string (enables telemetry + custom events, FR-11-01/02) | Azure Portal → `quickaid-func` Application Insights → Properties → Connection String |
| `APPLICATIONINSIGHTS_PORTAL_URL` | Optional. Deep link shown on the admin insights page for raw telemetry | Azure Portal → Application Insights blade → copy URL from the address bar |

> **Note:** `local.settings.json` is gitignored and should never be committed. Each developer must create their own copy.

---

## Running Locally

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at `http://localhost:3000`.

### Backend (Azure Functions)

```bash
cd backend

# Create and activate virtual environment
python -m venv .venv
.venv/Scripts/activate        # Windows
# source .venv/bin/activate   # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Start the local Azure Functions runtime
func start
```

The backend API will be available at `http://localhost:7071/api/`.

> **Tip:** Make sure both frontend and backend are running simultaneously. The frontend expects the backend at the URL specified in `NEXT_PUBLIC_API_URL`.

---

## Running with Docker

Docker Compose runs both services together. Backend environment variables are passed via a `.env` file at the project root.

### 1. Create a root `.env` file

```env
COSMOS_CONNECTION_STRING=<your-cosmos-db-connection-string>
EMAIL_CONNECTION_STRING=<your-azure-communication-services-connection-string>
EMAIL_SENDER_ADDRESS=DoNotReply@<your-azure-subdomain>.azurecomm.net
```

### 2. Build and start

```bash
docker-compose up --build
```

| Service | URL |
|---------|-----|
| Frontend | `http://localhost:3000` |
| Backend | `http://localhost:7071` |

### 3. Stop

```bash
docker-compose down
```

> **Note:** The Docker setup mounts local source files as volumes, so code changes are reflected without rebuilding.

---

## Deploying Azure Functions to Azure

### Prerequisites

- [Azure CLI](https://learn.microsoft.com/en-us/cli/azure/install-azure-cli) installed
- [Azure Functions Core Tools v4](https://learn.microsoft.com/en-us/azure/azure-functions/functions-run-local) installed
- An Azure subscription with a resource group ready

### 1. Log in to Azure

```bash
az login
```

### 2. Create Azure resources (first time only)

```bash
# Create a resource group (skip if you already have one)
az group create --name quickaid-rg --location southeastasia

# Create a storage account (required by Azure Functions)
az storage account create \
  --name quickaidstorage \
  --resource-group quickaid-rg \
  --location southeastasia \
  --sku Standard_LRS

# Create the Function App
az functionapp create \
  --name quickaid-api \
  --resource-group quickaid-rg \
  --storage-account quickaidstorage \
  --consumption-plan-location southeastasia \
  --runtime python \
  --runtime-version 3.9 \
  --functions-version 4 \
  --os-type Linux
```

### 3. Configure app settings

```bash
az functionapp config appsettings set \
  --name quickaid-api \
  --resource-group quickaid-rg \
  --settings \
    COSMOS_CONNECTION_STRING="<your-cosmos-connection-string>" \
    COSMOS_DATABASE_NAME="quickaid-db" \
    COSMOS_CONTAINER_TICKETS="tickets" \
    COSMOS_CONTAINER_USERS="users" \
    COSMOS_CONTAINER_STATUS_HISTORY="status_history" \
    EMAIL_CONNECTION_STRING="<your-azure-communication-services-connection-string>" \
    EMAIL_SENDER_ADDRESS="DoNotReply@<your-azure-subdomain>.azurecomm.net"
```

### 4. Deploy

```bash
cd backend
func azure functionapp publish quickaid-api
```

The API will be available at `https://quickaid-api.azurewebsites.net/api/`.

> **Tip:** After deploying, update the frontend's `NEXT_PUBLIC_API_URL` to point to the production Azure Functions URL.

---

## License

This project was created for educational purposes as part of the MyMahir Microsoft Developer programme Capstone.
