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

QuickAid is a smart campus helpdesk application designed for university students and staff to submit issues, track requests, and receive timely support. Built with a Next.js frontend and Azure Functions serverless backend, QuickAid enables ticket submission, status tracking, automated notifications, and secure data management powered by Azure Cosmos DB.

This application was developed as a Capstone Project for the MyMahir Microsoft Developer programme.

## Features

- **Issue Submission**: A modern web form interface allowing users to quickly submit helpdesk tickets with categories and priority levels.
- **Ticket Tracking**: Users can retrieve and check the status of their submitted tickets via their email addresses.
- **Role-Based Access**: Three user roles — Student/Staff, Support Agent, and Admin — each with appropriate permissions.
- **Ticket Management**: Support staff can update ticket statuses; admins can assign tickets and add internal notes.
- **Automated Notifications**: Email confirmations on ticket creation, status changes, and ticket assignments via SendGrid.

## Architecture and Technology Stack

The project uses a decoupled client-server architecture with a React frontend and Azure Functions serverless backend.

### Frontend

- **Framework**: Next.js 16 with React 19
- **Styling**: Tailwind CSS 4
- **UI Components**: Radix UI, shadcn/ui
- **Hosting**: Azure App Service

### Backend

- **Runtime**: Azure Functions (Python, V2 model)
- **Database**: Azure Cosmos DB (NoSQL, Core SQL API)
- **Email**: SendGrid API for transactional emails
- **Security**: Azure Key Vault for secret management
- **Monitoring**: Azure Application Insights (optional)

### DevOps

- **Containerisation**: Docker and Docker Compose
- **Version Control**: Git and GitHub

## Project Structure

```text
QuickSmartAid/
├── docker-compose.yml
├── Project.md
├── README.md
│
├── frontend/                       # Next.js web application
│   ├── Dockerfile
│   ├── app/                        # Next.js App Router
│   │   ├── dashboard/              # Dashboard pages
│   │   ├── login/                  # Authentication pages
│   │   ├── layout.tsx              # Root layout
│   │   └── page.tsx                # Landing page
│   ├── components/                 # Reusable UI components
│   │   ├── ui/                     # shadcn/ui primitives
│   │   ├── app-sidebar.tsx         # Sidebar navigation
│   │   ├── nav-main.tsx            # Main navigation
│   │   └── ...
│   ├── hooks/                      # Custom React hooks
│   ├── lib/                        # Utility functions
│   └── public/                     # Static assets
│
├── azure-functions/                # Azure Functions serverless API
│   ├── function_app.py             # All API endpoint definitions
│   ├── host.json                   # Azure Functions host configuration
│   ├── local.settings.json         # Local environment variables (gitignored)
│   ├── requirements.txt            # Python dependencies
│   └── shared/                     # Shared modules
│       ├── cosmos_client.py        # Cosmos DB connection & helpers
│       ├── validators.py           # Request input validation
│       ├── user_service.py         # User CRUD operations
│       ├── ticket_service.py       # Ticket CRUD & status operations
│       └── email_service.py        # SendGrid email notifications
│
└── docs/                           # Project documentation
```

## API Endpoints

| Method | Endpoint                         | Description                          | Auth      |
|--------|----------------------------------|--------------------------------------|-----------|
| POST   | `/api/tickets`                   | Create a new ticket                  | Public    |
| GET    | `/api/tickets?email={email}`     | Get tickets by email                 | Public    |
| GET    | `/api/tickets?search={term}`     | Search tickets by ID or subject      | Public    |
| GET    | `/api/tickets/{ticketId}`        | Get ticket details                   | Public    |
| PUT    | `/api/tickets/{ticketId}/status` | Update ticket status                 | Required  |
| PUT    | `/api/tickets/{ticketId}/assign` | Assign ticket to support staff       | Required  |
| POST   | `/api/tickets/{ticketId}/notes`  | Add internal note to ticket          | Required  |
| GET    | `/api/management/tickets`        | Get all tickets with filters         | Required  |

## System Requirements

- **Node.js** v18+ (frontend)
- **Python** v3.9+ (backend)
- **Azure Functions Core Tools** v4 (backend local development)
- **Docker** and **Docker Compose** (optional, for containerised setup)
- **Microsoft Azure** subscription (for production deployment)
- **SendGrid** account (for email notifications)

## Getting Started

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at `http://localhost:3000`.

### Backend Setup (Azure Functions)

```bash
cd azure-functions

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

### Environment Variables

Copy and update `azure-functions/local.settings.json` with your values:

| Variable                  | Description                          |
|---------------------------|--------------------------------------|
| `COSMOS_CONNECTION_STRING`| Azure Cosmos DB connection string    |
| `COSMOS_DATABASE`         | Database name (default: `quickaid-db`) |
| `SENDGRID_API_KEY`        | SendGrid API key for email delivery  |
| `SENDGRID_FROM_EMAIL`     | Sender email address                 |

## License

This project was created for educational purposes as part of the MyMahir Microsoft Developer programme Capstone.
