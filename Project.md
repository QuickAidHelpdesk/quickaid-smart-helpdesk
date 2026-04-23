# QuickAid — Smart Campus Helpdesk

**Project Documentation**

MyMahir Microsoft Developer Programme — Capstone Project | Azure Cloud-Native Application | Group 2

---

# Review Page

## 1. Overview

The present project management document comprises an Introduction section ….

## 2. Target Audience

The primary target audience for the QuickAid system consists of the community within university which are the students, staff and the admin.

## 3. Team Member

| Member | Role | Responsibilities | Stage |
|--------|------|-----------------|-------|
| Nurnabila | Project Lead | Overall coordination, research stage, presentation intro and conclusion | Research |
| Ivan | Frontend Developer | Frontend design, wireframes, user experience, visual design of slides | Design |
| Haziq | Backend Developer | Azure Functions, Cosmos DB integration, API development | Implementation |
| Fazreen | QA / Tester | Test cases, bug tracking, end-to-end testing, demo preparation | Testing |
| Razin | DevOps | Azure deployment, Key Vault setup, project management Excel doc | Management |

---

# Project Overview

**QuickAid — Smart Campus Helpdesk** is a cloud-native web application designed for university students and staff to submit campus-related issues, track the progress of their requests in real time, and receive timely support through automated notifications. The application addresses the common challenge faced by educational institutions where campus helpdesk operations are fragmented across email, phone calls, and walk-in visits, leading to delayed response times, lost requests, and poor visibility into issue resolution.

Built entirely on Microsoft Azure services under the Free Tier, QuickAid leverages a serverless architecture with Azure Functions (Python V2 programming model) for backend processing, Azure Cosmos DB for scalable NoSQL data storage, and Azure App Service for frontend hosting. The application integrates Azure Communication Services (Email) for automated notifications and Azure Key Vault for secure secret management, ensuring production-grade security practices from the ground up.

The system is designed to be scalable and maintainable, with the potential to be adopted by other educational institutions. By centralising all helpdesk operations into a single, accessible web platform, QuickAid eliminates the inefficiencies of traditional support channels and provides both users and administrators with a transparent, trackable workflow for issue resolution.

---

# Project Scopes

This section defines the project boundary which includes system functionalities, software, hardware, platform requirements and system users.

### I. System User

The primary users of the QuickAid Smart Campus Helpdesk system are university community members. Students and Staff are the customer audience who submit helpdesk requests. Support Agents (organised into category-specific teams such as "IT Squad" or "Library Team") manage and resolve tickets within their team's category. Administrators oversee the entire helpdesk operation, manage user roles, define teams, and assign individual tickets to agents.

### II. System Platform

The proposed system is a web-based application hosted on Microsoft Azure which can be accessed through any modern web browser.

### III. Authentication and Access Control

The proposed system integrates Azure Active Directory (Azure AD) authentication into the platform to manage secure login and role-based access control across four roles — Student, Staff, Agent, and Admin — ensuring that each user can only access the features and data permitted for their assigned role. Agents additionally hold a `team_id` linking them to a category-specific team, which determines the queue of tickets they can see and act on.

### IV. Ticket Submission & Storage

The proposed system provides a structured ticket submission interface allowing Students and Staff to submit helpdesk requests by completing a web form with each submitted ticket automatically assigned a unique identifier and stored persistently in Azure Cosmos DB.

### V. Automated Email Notifications

The proposed system integrates Azure Communication Services (Email) as the automated email notification service to communicate with users at key points in the ticket lifecycle, including dispatching a confirmation email upon ticket creation, notifying users of edits and status changes, and notifying staff of new ticket assignments.

### VI. Secure Secret Management

The proposed system implements Azure Key Vault as the centralised secret management solution, storing all sensitive configuration values including database connection strings, Azure Communication Services connection strings, and other credentials securely at rest.

### VII. Application Performance Monitoring

As an optional enhancement, the proposed system integrates Azure Application Insights to provide real-time monitoring of application performance and system health, tracking key metrics including request rates, response times, error rates, and dependency failures.

---

# Technology Stack

### I. Frontend

- Next.js 16 (App Router) with React 19 and TypeScript 5
- Tailwind CSS 4 and shadcn/ui (Radix primitives) for component design
- Recharts for the admin monitoring dashboard
- Microsoft Entra ID authentication via MSAL (`@azure/msal-browser`, `@azure/msal-react`)
- Azure App Service for frontend hosting

### II. Backend

- Azure Functions (Python 3.9+) using the V2 programming model with Blueprints
- HTTP-triggered serverless functions organised by service: `tickets`, `users`, `staff`, `admin`, `insights`
- Azure Functions Core Tools for local development and testing

### III. Database

- Azure Cosmos DB (NoSQL, Core SQL API)
- Partition key strategy based on user email for efficient querying

### IV. Email Service

- Azure Communication Services (Email) for transactional email delivery
- Templated emails for ticket confirmation, edits, status updates, and staff assignment notifications

### V. Security

- Azure Key Vault for secret management
- Azure Managed Identity for credential-free authentication
- Role-based access control via `X-User-Email` header + `require_role()` server-side lookup

### VI. Monitoring

- Azure Application Insights for telemetry and performance tracking
- Custom events: `TicketSubmitted`, `TicketAssigned`, `TicketStatusChanged`
- In-app monitoring dashboard (UC-11) at `/admin/insights` backed by `/api/manage/insights`

### VII. Deployment

- All components deployable under Azure Free Tier
- Docker and Docker Compose for local containerised development
- GitHub for version control and team collaboration

---

# Actor Description

This section will discuss all the actors involved in the QuickAid system with a description of their respective role.

| No. | Actor | Role |
|-----|-------|------|
| 1 | Student/Staff | Undergraduate student, postgraduate student, academic staff, or administrative staff, who encounters a problem or requires support from the campus helpdesk. Both `student` and `staff` roles are customers in the system. |
| 2 | Support Agent | Trained university staff member responsible for resolving helpdesk tickets within their team's category. Agents belong to one team (e.g., "IT Squad" handles "IT Support" tickets) and automatically see every ticket in that category, in addition to any ticket the Admin assigns directly to them. They update ticket statuses and communicate resolutions back to users. Stored as the `agent` role with a `team_id` reference. |
| 3 | Admin | Held by the Helpdesk Manager or IT Supervisor at the university. Responsible for the operational management of the helpdesk: managing user roles, defining/editing/deleting teams, assigning tickets to agents, and monitoring overall performance. |

---

# Functional Requirements

## User Management Module

| FR ID | Use Case ID | Use Case | Functional Requirements |
|-------|:-----------:|----------|------------------------|
| **FR-01-01** | **UC-1** | **Log In** | The system shall provide a login allowing Support Staff and Admin users to authenticate using Azure Active Directory (Azure AD) credentials. |
| **FR-01-02** | | | The system shall assign the correct role (Support Staff or Admin) to the authenticated user based on their Azure AD group membership, and grant access only to the features permitted for that role. |
| **FR-01-03** | | | The system shall maintain the authenticated user session using Azure AD tokens and automatically redirect the user to their role-appropriate dashboard upon successful login. |
| **FR-01-04** | | | The system shall redirect unauthenticated users attempting to access the Support Staff portal or Admin portal to the Azure AD login page. |

## Ticket Submission Module

| FR ID | Use Case ID | Use Case | Functional Requirements |
|-------|:-----------:|----------|------------------------|
| **FR-02-01** | **UC-2** | **Create Ticket** | The system shall provide a form allowing students and staff to submit help desk tickets with fields for subject, description, category, priority level, and contact email. |
| **FR-02-02** | | | The system shall validate all required fields before allowing ticket submission and display appropriate error messages for invalid inputs. |
| **FR-02-03** | | | The system shall support ticket categorisation including IT Support, Facilities, Academic Services, Library, Finance, and General Inquiry. |
| **FR-02-04** | | | The system shall assign a unique ticket identifier (e.g., QA-00001) to each submitted ticket and store ticket details with a default status of 'Open' timestamp created. |
| **FR-02-05** | | | The system shall display a success message to the user upon successful ticket submission, containing the unique ticket ID generated for their reference and a message confirming their email has been notified. |
| **FR-03-01** | **UC-3** | **Send Email Ticket Submission Confirmation** | The system shall send an automated confirmation email to the submitter upon successful ticket creation via Azure Communication Services integration. |
| **FR-03-02** | | | The system shall send all confirmation emails using the Azure Communication Services API, retrieving the Azure Communication Services API key exclusively from Azure Key Vault at runtime. |
| **FR-03-03** | | | The confirmation email shall include the ticket ID, subject, category, priority, and a summary of the submitted issue. |

## Ticket Tracking Module

| FR ID | Use Case ID | Use Case | Functional Requirements |
|-------|:-----------:|----------|------------------------|
| **FR-04-01** | **UC-4** | **View Submitted Tickets by Email** | The system shall display retrieved tickets in a list view showing ticket ID, subject, category, status, priority, assigned support staff and submission date. |
| **FR-04-02** | | | The system shall allow users to view full ticket details including description, timestamps, and any status update history. |
| **FR-04-03** | | | The system shall allow users to filter retrieved tickets by status (Open, In Progress, Resolved, Closed) and category. |
| **FR-04-04** | | | The system shall display a message stating "No tickets found for this email address" when the query returns no matching records. |
| **FR-04-05** | | | The system shall display an error message if the Cosmos DB query fails due to a connection or service issue. |
| **FR-05-01** | **UC-5** | **Notify on Ticket Status Change** | The system shall automatically send a status update email notification to the ticket submitter's university email address every time a Support Staff member successfully updates the status. |
| **FR-05-02** | | | The system shall send all status update notification emails using the Azure Communication Services API, retrieving the Azure Communication Services API key exclusively from Azure Key Vault at runtime before every sending operation. |
| **FR-06-01** | **UC-6** | **Search Ticket** | The system shall provide a search input field allowing users to search for a specific ticket name and id. |
| **FR-06-02** | | | The system shall query Cosmos DB and return all tickets matching the entered in the input field. |
| **FR-06-03** | | | The system shall display a message stating "No tickets matched your search. Try different keywords." when the search query returns no results. |
| **FR-06-04** | | | The system shall display a user-friendly error message if the Cosmos DB search query fails due to a service issue. |

## Ticket Management Module

| FR ID | Use Case ID | Use Case | Functional Requirements |
|-------|:-----------:|----------|------------------------|
| **FR-07-01** | **UC-7** | **View Assigned Tickets** | The system shall provide a support staff portal to authenticated Support Staff users, displaying all tickets currently assigned to the logged-in staff member filtered by their Azure AD identity. |
| **FR-07-02** | | | The system shall allow the user to view the details of the assigned ticket. |
| **FR-07-03** | | | The system shall allow the support staff to filter the assigned tickets by priority and status. |
| **FR-07-04** | | | The system shall display a message stating "You have no tickets currently assigned to you" when the agent has no assigned tickets. |
| **FR-08-01** | **UC-8** | **Update Ticket Status** | The system shall allow an authenticated Support Agent to update the status of any ticket assigned to them. |
| **FR-08-02** | | | The system shall display the latest list of assigned tasks after a successful ticket update. |
| **FR-08-03** | | | The system shall automatically trigger UC to send a status update email to the original ticket submitter every time a Support Agent successfully changes a ticket's status. |
| **FR-09-01** | **UC-9** | **Receive Ticket Assignment Notification** | The system shall automatically send an assignment notification email to the assigned Support Staff member's university email address every time the Admin assigns a ticket. |
| **FR-09-02** | | | The system shall send all assignment notification emails using the Azure Communication Services API, retrieving the Azure Communication Services API key exclusively from Azure Key Vault at runtime before every sending operation. |
| **FR-09-03** | | | The assignment notification email shall contain the ticket details. |
| **FR-10-01** | **UC-10** | **Assign Ticket to Support Staff** | The system shall provide access only to authenticated Admin users displaying all submitted tickets across all users. |
| **FR-10-02** | | | The system shall allow admin users to assign tickets to specific support staff members. |
| **FR-10-03** | | | The system shall automatically change the ticket status from "Open" to "In Progress" when a ticket is assigned. |
| **FR-10-04** | | | The system shall allow the Admin to filter the full ticket list by status, category, priority, user type, and date range. |
| **FR-11-01** | **UC-11** | **View System Performance (Application Insights)** | The system shall integrate Azure Application Insights to monitor application performance, request rates, and response times. |
| **FR-11-02** | | | The system shall log custom events for ticket submission, retrieval, and status changes for analytics purposes. |
| **FR-11-03** | | | The system shall provide a monitoring dashboard showing error rates, dependency failures, and user activity metrics. |

---

# Database Design

QuickAid uses Azure Cosmos DB with the Core SQL API. The database is structured into the following containers (collections), each designed to support efficient querying and scalability. The partition key strategy uses user email for user-centric queries and ticket ID for ticket-centric operations.

### 1. users

| Field | Type | Constraint | Description |
|-------|------|-----------|-------------|
| **user_id** | string | PK | Unique user identifier (Azure AD or email-based) |
| **display_name** | string | — | User's full display name |
| **email** | string | UNIQUE, IDX | User's institutional email address |
| **role** | enum | — | User role: student, staff, or admin |
| **created_at** | timestamp | — | Account creation timestamp |

### 2. tickets

| Field | Type | Constraint | Description |
|-------|------|-----------|-------------|
| **ticket_id** | string | PK | Unique ticket identifier (e.g., QA-00001) |
| **user_id** | string | FK | References users.user_id |
| **subject** | string | — | Brief summary of the issue |
| **description** | string | — | Detailed description of the reported issue |
| **category** | enum | — | Ticket category: IT Support, Facilities, Academic, Library, Finance, General |
| **priority** | enum | — | Priority level: Low, Medium, High, Urgent |
| **status** | enum | — | Ticket status: Open, In Progress, Resolved, Closed |
| **assigned_to** | string | FK, nullable | References users.user_id (admin/staff assigned) |
| **created_at** | timestamp | — | Ticket submission timestamp |
| **updated_at** | timestamp | — | Last status update timestamp |
| **resolved_at** | timestamp | nullable | Timestamp when ticket was resolved |

### 3. status_history

| Field | Type | Constraint | Description |
|-------|------|-----------|-------------|
| **history_id** | string | PK | Unique identifier for the status change record |
| **ticket_id** | string | FK | References tickets.ticket_id |
| **previous_status** | enum | — | Status before the change |
| **new_status** | enum | — | Status after the change |
| **changed_by** | string | FK | References users.user_id (who made the change) |
| **notes** | string | nullable | Internal notes or comments about the status change |
| **changed_at** | timestamp | — | Timestamp of the status change |

### 4. email_logs

| Field | Type | Constraint | Description |
|-------|------|-----------|-------------|
| **log_id** | string | PK | Unique identifier for the email log |
| **ticket_id** | string | FK | References tickets.ticket_id |
| **recipient_email** | string | — | Email address of the recipient |
| **email_type** | enum | — | Type: confirmation, status_update, assignment |
| **message_id** | string | nullable | Azure Communication Services message tracking ID |
| **status** | enum | — | Delivery status: sent, delivered, failed, bounced |
| **sent_at** | timestamp | — | Timestamp when the email was sent |

### 5. admin_notes

| Field | Type | Constraint | Description |
|-------|------|-----------|-------------|
| **note_id** | string | PK | Unique identifier for the admin note |
| **ticket_id** | string | FK | References tickets.ticket_id |
| **author_id** | string | FK | References users.user_id (admin who wrote the note) |
| **content** | string | — | Content of the internal note |
| **created_at** | timestamp | — | Timestamp when the note was created |

## Relationships

| Relationship | Type | Description |
|-------------|------|-------------|
| users → tickets | One-to-Many (1:N) | One user can submit many helpdesk tickets |
| users → admin_notes | One-to-Many (1:N) | One admin user can author many internal notes |
| tickets → status_history | One-to-Many (1:N) | One ticket can have many status change records |
| tickets → email_logs | One-to-Many (1:N) | One ticket can trigger many email notifications |
| tickets → admin_notes | One-to-Many (1:N) | One ticket can have many internal admin notes |
| users → tickets (assigned_to) | One-to-Many (1:N) | One admin/staff can be assigned to many tickets |

## Database Diagram

![Database ER Diagram](image1.png)

---

# System Architecture

The system follows a serverless, event-driven architecture leveraging Azure cloud services. Below is a high-level overview of how the components interact:

**User (Browser)** → Azure App Service (Frontend) → Azure Functions (Backend API) → Azure Cosmos DB (Data Store)

**Azure Functions** → Azure Communication Services (Email Notifications)
**Azure Functions** → Azure Key Vault (Secret Retrieval via Managed Identity)
**Azure Functions** → Azure Application Insights (Monitoring & Telemetry)

The frontend is a static web application hosted on Azure App Service that communicates with the backend through RESTful HTTP endpoints exposed by Azure Functions. The backend functions handle all business logic including ticket creation, retrieval, status updates, and email dispatch. All sensitive credentials are retrieved from Azure Key Vault at runtime, and all application telemetry is forwarded to Application Insights for monitoring.

*[Insert Architecture Diagram here]*

---

# API Endpoints

The backend is implemented with the Azure Functions V2 programming model using Blueprints, with routes grouped by service in `backend/blueprints/`. Admin endpoints use the `/api/manage/` prefix because Azure Functions reserves the `admin` route segment. All protected endpoints require the `X-User-Email` header and are authorised via `require_role()` in `utils/auth.py`.

### Public — `tickets.py`, `users.py`

| Method | Endpoint | Blueprint Handler | Description |
|--------|----------|-------------------|-------------|
| **POST** | /api/submit_ticket | `tickets.submit_ticket` | Validates input, stores the ticket in Cosmos DB, emits a `TicketSubmitted` telemetry event, and sends a confirmation email via Azure Communication Services. |
| **GET** | /api/tickets | `tickets.get_tickets_endpoint` | Retrieves all tickets belonging to the authenticated user (filters: `status`, `category`). |
| **GET** | /api/tickets/search?q= | `tickets.search_tickets_endpoint` | Searches tickets by subject or ticket ID. |
| **GET** | /api/tickets/{ticketId} | `tickets.ticket_by_id_endpoint` | Retrieves full details for a specific ticket. |
| **PATCH** | /api/tickets/{ticketId} | `tickets.ticket_by_id_endpoint` | Edits a ticket (owner only, status must be Open). Sends an edit confirmation email. |
| **POST** | /api/users/login | `users.user_login` | Upserts the user record on Entra ID login. |
| **GET** | /api/users?email= | `users.get_user_endpoint` | Retrieves a user by email. |
| **GET** | /api/users/{userId} | `users.get_user_by_id_endpoint` | Retrieves a user by ID (any authenticated role). |

### Staff portal — `staff.py` (role: staff/admin)

| Method | Endpoint | Blueprint Handler | Description |
|--------|----------|-------------------|-------------|
| **GET** | /api/staff/tickets | `staff.get_staff_tickets` | Lists tickets assigned to the logged-in staff member (filters: `status`, `priority`). |
| **PATCH** | /api/staff/tickets/{ticketId}/status | `staff.update_ticket_status_endpoint` | Updates a ticket status, emits a `TicketStatusChanged` telemetry event, and notifies the submitter. |

### Admin portal — `admin.py`, `insights.py` (role: admin)

| Method | Endpoint | Blueprint Handler | Description |
|--------|----------|-------------------|-------------|
| **GET** | /api/manage/tickets | `admin.get_admin_tickets` | Lists all tickets with optional filters for status, category, priority, and date range. |
| **PATCH** | /api/manage/tickets/{ticketId}/assign | `admin.assign_ticket_endpoint` | Assigns a ticket to staff, emits a `TicketAssigned` telemetry event, and notifies the assignee. |
| **GET** | /api/manage/staff | `admin.get_staff_list` | Lists all staff members for assignment UIs. |
| **GET** | /api/manage/users | `admin.get_all_users_endpoint` | Lists all users (filters: `role`, `q`). |
| **PATCH** | /api/manage/users/{userId} | `admin.update_user_endpoint` | Updates a user's role or display name. |
| **GET** | /api/manage/insights?days=30 | `insights.get_insights` | Aggregated ticket metrics powering the UC-11 monitoring dashboard. |

---

# Non-Functional Requirements

### Performance

API response time for ticket submission and retrieval shall not exceed 3 seconds under normal load. The serverless architecture auto-scales to handle concurrent requests.

### Security

All secrets managed via Azure Key Vault with Managed Identity access. No credentials hardcoded in source code. HTTPS enforced for all endpoints. Input sanitisation applied to all user-submitted data to prevent injection attacks.

### Scalability

Azure Cosmos DB provides automatic horizontal scaling. Azure Functions scale on demand with no manual intervention. The system is designed to accommodate scaling to multiple institutions.

### Availability

Leveraging Azure global infrastructure with built-in redundancy. Target availability of 99.9% for all critical endpoints.

### Usability

Responsive web design supporting desktop and mobile browsers. Intuitive form layout requiring no training for end users. Clear status indicators and feedback messages throughout the user journey.

### Maintainability

Clean separation of concerns between frontend and backend. Serverless functions independently deployable. Comprehensive README and architecture documentation for onboarding new developers.

---

# Deployment Guide

All components are deployed under the Azure Free Tier. The following steps outline the deployment process:

### Prerequisites

- Azure account with active subscription (Free Tier eligible)
- Azure CLI installed and configured
- Python 3.9+ installed locally
- Azure Functions Core Tools v4
- Azure Communication Services account with verified sender email
- Git and GitHub for version control

### Step 1: Resource Group Setup

Create an Azure Resource Group to organise all QuickAid resources. Use a consistent naming convention (e.g., rg-quickaid-dev) and select the nearest Azure region.

### Step 2: Cosmos DB Configuration

Provision an Azure Cosmos DB account using the Core SQL API. Create a database named quickaid-db and containers for users, tickets, status_history, email_logs, and admin_notes with appropriate partition keys.

### Step 3: Azure Functions Deployment

Deploy the Python-based Azure Functions app containing all API endpoints. Configure application settings to reference Key Vault secrets using the @Microsoft.KeyVault() syntax.

### Step 4: Azure Key Vault Setup

Create an Azure Key Vault instance and store all sensitive values including the Cosmos DB connection string, Azure Communication Services API key, and any other configuration secrets. Assign access policies granting the Functions app Managed Identity read access to secrets.

### Step 5: Azure Communication Services Integration

Configure a Azure Communication Services account, verify the sender email address, and generate an API key. Store the API key in Azure Key Vault. Implement email templates for ticket confirmation and status update notifications.

### Step 6: App Service Frontend Deployment

Deploy the frontend application to Azure App Service. Configure CORS settings to allow communication with the Azure Functions backend. Verify the frontend can successfully call all backend API endpoints.

### Step 7: Application Insights (Optional)

Enable Application Insights on the Azure Functions app. Configure custom event tracking for ticket lifecycle events. Set up alert rules for error rate thresholds and performance degradation.
