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

The primary users of the QuickAid Smart Campus Helpdesk system are university community members including Students and Staff who submit helpdesk requests, Support Staff who manage and resolve assigned tickets, and Administrators who oversee the entire helpdesk operation and manage ticket assignments across the system.

### II. System Platform

The proposed system is a web-based application hosted on Microsoft Azure which can be accessed through any modern web browser.

### III. Authentication and Access Control

The proposed system integrates Azure Active Directory (Azure AD) authentication into the platform to manage secure login and role-based access control for Support Staff and Administrator users, ensuring that each user can only access the features and data permitted for their assigned role.

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
- Custom Next.js server (`server.ts` via `tsx`) with `ws` WebSocket server for real-time in-app notifications
- Azure App Service for frontend hosting

### II. Backend

- Azure Functions (Python 3.9+) using the V2 programming model with Blueprints
- HTTP-triggered serverless functions organised by service: `tickets`, `users`, `agent`, `admin`, `insights`, `teams`
- Timer-triggered serverless function (`escalation`) for scheduled background work (NCRONTAB schedule)
- Azure Functions Core Tools for local development and testing

### III. Database

- Azure Cosmos DB (NoSQL, Core SQL API)
- Partition key strategy based on user email for efficient querying

### IV. Email Service

- Azure Communication Services (Email) for transactional email delivery
- Templated emails for ticket confirmation, edits, status updates, staff assignment notifications, and priority escalation alerts

### V. Security

- Azure Key Vault for secret management
- Azure Managed Identity for credential-free authentication
- Role-based access control via `X-User-Email` header + `require_role()` server-side lookup

### VI. Monitoring

- Azure Application Insights for telemetry and performance tracking
- Custom events: `TicketSubmitted`, `TicketStatusChanged`, `TicketResolved`, `TicketReopened`, `TicketEscalated`
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
| 1 | Student/Staff | Undergraduate student, postgraduate student, academic staff, or administrative staff, who encounters a problem or requires support from the campus helpdesk |
| 2 | Support Agent | Trained university staff member responsible for resolving helpdesk tickets assigned to them by the Admin. They work within the support portal to manage their workload, update ticket statuses, and communicate resolutions back to users |
| 3 | Admin | Held by the Helpdesk Manager or IT Supervisor at the university. They are responsible for the operational management of the entire helpdesk |

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
| **FR-12-01** | **UC-12** | **Comment on Ticket** | The system shall allow the ticket owner, agents whose team category matches the ticket's category, and admins to post progress entries (topic, description, optional location) on a ticket. Entries are stored in the `ticket_comments` container and rendered in chronological order. |
| **FR-12-02** | | | The system shall validate progress-entry topic (3–100 chars) and description (3–1000 chars), and reject locations longer than 200 chars. |
| **FR-12-03** | | | The system shall reject comment submissions from users who do not have visibility on the ticket with HTTP 403. |
| **FR-14-01** | **UC-14** | **Delete Own Ticket (Soft)** | The system shall allow a ticket owner to soft-delete their own ticket. Deleted tickets are flagged with `is_deleted`, `deleted_at`, and `deleted_by`, are hidden from the owner's ticket list, and remain visible to agents and admins with a "Deleted by user" indicator. |
| **FR-14-02** | | | The system shall reject delete requests from non-owners with HTTP 403, and reject deleting an already-deleted ticket with HTTP 409. |
| **FR-17-01** | **UC-17** | **Re-open Resolved Ticket** | The system shall allow the ticket owner to re-open a ticket whose status is `Resolved` via `POST /api/tickets/{id}/reopen`. Re-opening sets `status="Open"`, clears `resolved_at`, records `reopened_at` and `reopened_by`, and increments `reopen_count`. |
| **FR-17-02** | | | The system shall reject re-open requests from non-owners with HTTP 403 and re-open requests on soft-deleted tickets with HTTP 409. |
| **FR-17-03** | | | The system shall reject re-open requests for tickets whose current status is not `Resolved` with HTTP 409. |
| **FR-17-04** | | | The system shall write a `reopen` entry (`entry_type="reopen"`) to `ticket_comments` capturing the submitter's reason, send the existing status-update email to the submitter, and emit a `TicketReopened` Application Insights event including `ticket_id`, `previous_status`, `reopened_by`, `reopen_count`, and `category`. |

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
| **FR-13-01** | **UC-13** | **Finish Ticket** | The system shall allow agents (matching team category) and admins to finish a ticket via a single action that (a) sets status to Resolved, (b) writes a resolution entry to `ticket_comments` containing topic, description, optional location, finisher email, and time-to-resolve in seconds, and (c) sends the existing status-update email to the submitter. |
| **FR-13-02** | | | The system shall reject finish requests on tickets already in `Resolved` or `Closed` state with HTTP 409. |
| **FR-13-03** | | | The system shall emit a `TicketResolved` Application Insights event each time a ticket is finished. |
| **FR-15-01** | **UC-15** | **Auto-Escalate Stale Tickets** | The system shall run a timer-triggered Azure Function on a configurable NCRONTAB schedule (`ESCALATION_TIMER_SCHEDULE`) that scans all `Open`, non-deleted tickets and bumps the priority of any ticket whose current priority has not changed for at least `ESCALATION_DAYS_THRESHOLD` days. Priority order: Low → Medium → High → Critical. |
| **FR-15-02** | | | The system shall cap auto-escalation at `Critical` and never escalate `In Progress`, `Resolved`, `Closed`, or soft-deleted tickets. |
| **FR-15-03** | | | The system shall record each escalation by (a) updating `last_escalated_at`, `escalation_count`, and `priority` on the ticket, and (b) writing a system-authored entry (`entry_type="escalation"`, `author_role="system"`) to `ticket_comments`. |
| **FR-15-04** | | | The system shall send an escalation notification email to the ticket submitter and to every agent in a team whose category matches the ticket's category. Email failures shall not block the priority bump. |
| **FR-15-05** | | | The system shall emit a `TicketEscalated` Application Insights event for each successful escalation containing `ticket_id`, `old_priority`, `new_priority`, `escalation_count`, `days_since_last_change`, and `category`. |
| **FR-16-01** | **UC-16** | **Admin Internal Notes** | The system shall provide an admin-only notes channel on every ticket, distinct from the user-visible comment thread. Notes are stored in the `admin_notes` Cosmos container (partition key `/ticket_id`) and are accessible only via `/api/manage/tickets/{ticketId}/notes` endpoints, gated by `role=admin`. |
| **FR-16-02** | | | The system shall validate note content (3–2000 characters) and stamp each note with `author_id`, `author_email`, `author_display_name`, and `created_at`. |
| **FR-16-03** | | | The system shall allow any admin to delete an admin note via `DELETE /api/manage/tickets/{ticketId}/notes/{noteId}`. Notes are hard-deleted because they never leave the admin surface. |
| **FR-16-04** | | | The system shall hide internal admin notes from all non-admin users — they must not be returned by any `/api/tickets/*` or `/api/agent/*` endpoint, and the frontend shall render them only when `user.role === "admin"`. |
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
| **role** | enum | — | User role: user, agent, or admin |
| **team_id** | string | FK, nullable | References teams.team_id (agents only) |
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
| **created_at** | timestamp | — | Ticket submission timestamp |
| **updated_at** | timestamp | — | Last status update timestamp |
| **resolved_at** | timestamp | nullable | Timestamp when ticket was resolved |
| **is_deleted** | boolean | — | True if the owner soft-deleted the ticket; hidden from owner's list, still visible to agents/admins |
| **deleted_at** | timestamp | nullable | Timestamp of soft-delete |
| **deleted_by** | string | nullable | Email of the user who deleted the ticket |
| **last_escalated_at** | timestamp | nullable | Timestamp of the most recent auto-escalation (UC-15) |
| **escalation_count** | integer | nullable | Number of times this ticket has been auto-escalated (defaults to 0; only written on first escalation) |
| **reopened_at** | timestamp | nullable | Timestamp of the most recent re-open (UC-17) |
| **reopened_by** | string | nullable | Email of the owner who re-opened the ticket |
| **reopen_count** | integer | nullable | Number of times this ticket has been re-opened (defaults to 0; only written on first reopen) |
| **assigned_to** | string | nullable | Email of the agent/admin the ticket is assigned to (UC-10) |
| **assigned_to_name** | string | nullable | Display name snapshot of the assigned agent/admin (UC-10) |

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

### 5. ticket_comments

Implemented. Partition key `/ticket_id`. Stores append-only progress entries on each ticket — free-form `comment` entries from owner / agent / admin, the special `resolution` entry written by the finish flow, and `escalation` entries written by the auto-escalation timer.

| Field | Type | Constraint | Description |
|-------|------|-----------|-------------|
| **comment_id** | string | PK | Unique identifier for the entry |
| **ticket_id** | string | FK, partition key | References tickets.ticket_id |
| **entry_type** | enum | — | `comment`, `resolution`, `escalation`, or `reopen` |
| **topic** | string | — | Short topic / heading (3–100 chars) |
| **description** | string | — | Body of the entry (3–1000 chars) |
| **location** | string | nullable | Optional place tag (≤200 chars) |
| **author_email** | string | — | Email of the entry author (or `system@quickaid` for auto-escalation entries) |
| **author_role** | enum | — | `user`, `agent`, `admin`, or `system` (the latter reserved for auto-escalation entries) |
| **author_display_name** | string | — | Display name snapshot |
| **created_at** | timestamp | — | Entry creation timestamp |
| **resolved_in_seconds** | integer | nullable | Time-to-resolve in seconds (only set for `resolution` entries) |

### 7. notifications

Implemented. Partition key `/recipient_email`. Stores in-app notifications for all roles; must be created manually in the Cosmos DB account.

| Field | Type | Constraint | Description |
|-------|------|-----------|-------------|
| **notification_id** | string | PK | Unique notification identifier (uuid4); also stored as Cosmos `id` |
| **recipient_email** | string | partition key | Recipient's email address (lowercase) |
| **type** | enum | — | `ticket_created`, `ticket_updated`, `ticket_assigned`, `ticket_assigned_to_me`, `status_changed`, `ticket_resolved`, `ticket_deleted`, `ticket_reopened`, `ticket_escalated`, `new_ticket`, `new_user_registered` |
| **title** | string | — | Short heading |
| **message** | string | — | Full message body |
| **ticket_id** | string | nullable | Related ticket ID (if applicable) |
| **is_read** | boolean | — | False by default; set to true when user reads or marks as read |
| **created_at** | timestamp | — | ISO 8601 UTC creation timestamp |

### 6. admin_notes

Implemented (UC-16). Partition key `/ticket_id`. Stores internal admin-only notes that are completely separate from `ticket_comments` and are accessible only to users with role `admin`.

| Field | Type | Constraint | Description |
|-------|------|-----------|-------------|
| **note_id** | string | PK | Unique identifier for the admin note |
| **ticket_id** | string | FK, partition key | References tickets.ticket_id |
| **author_id** | string | FK | References users.user_id (admin who wrote the note) |
| **author_email** | string | — | Email snapshot of the authoring admin |
| **author_display_name** | string | — | Display name snapshot of the authoring admin |
| **content** | string | — | Body of the internal note (3–2000 chars) |
| **created_at** | timestamp | — | Timestamp when the note was created |

## Relationships

| Relationship | Type | Description |
|-------------|------|-------------|
| users → tickets | One-to-Many (1:N) | One user can submit many helpdesk tickets |
| tickets → status_history | One-to-Many (1:N) | One ticket can have many status change records |
| tickets → ticket_comments | One-to-Many (1:N) | One ticket can have many progress entries (comments + one resolution) |
| tickets → admin_notes | One-to-Many (1:N) | One ticket can have many internal admin-only notes |
| tickets → email_logs | One-to-Many (1:N) | One ticket can trigger many email notifications |
| users → notifications | One-to-Many (1:N) | One user (recipient_email) can have many in-app notifications |
| teams → users (agents) | One-to-Many (1:N) | One team can have many agent users assigned via `team_id` |

## Database Diagram

![Database ER Diagram](image1.png)

---

# System Architecture

The system follows a serverless, event-driven architecture leveraging Azure cloud services. Below is a high-level overview of how the components interact:

**User (Browser)** → Azure App Service (Frontend) → Azure Functions (Backend API) → Azure Cosmos DB (Data Store)

**Azure Functions** → Azure Communication Services (Email Notifications)
**Azure Functions** → Azure Key Vault (Secret Retrieval via Managed Identity)
**Azure Functions** → Azure Application Insights (Monitoring & Telemetry)

**Timer Trigger (NCRONTAB)** → Azure Functions (`escalation`) → Azure Cosmos DB (scan + update) → Azure Communication Services (notify) → Azure Application Insights (`TicketEscalated`)

The frontend is a static web application hosted on Azure App Service that communicates with the backend through RESTful HTTP endpoints exposed by Azure Functions. The backend functions handle all business logic including ticket creation, retrieval, status updates, email dispatch, and scheduled background work such as auto-escalation of stale tickets. All sensitive credentials are retrieved from Azure Key Vault at runtime, and all application telemetry is forwarded to Application Insights for monitoring.

*[Insert Architecture Diagram here]*

---

# API Endpoints

The backend is implemented with the Azure Functions V2 programming model using Blueprints, with routes grouped by service in `backend/blueprints/`. Admin endpoints use the `/api/manage/` prefix because Azure Functions reserves the `admin` route segment. All protected endpoints require the `X-User-Email` header and are authorised via `require_role()` in `utils/auth.py`.

### Public — `tickets.py`, `users.py`

| Method | Endpoint | Blueprint Handler | Description |
|--------|----------|-------------------|-------------|
| **POST** | /api/submit_ticket | `tickets.submit_ticket` | Validates input, stores the ticket in Cosmos DB, emits a `TicketSubmitted` telemetry event, and sends a confirmation email via Azure Communication Services. |
| **GET** | /api/tickets | `tickets.get_tickets_endpoint` | Retrieves all tickets belonging to the authenticated user (filters: `status`, `category`). Excludes soft-deleted tickets. |
| **GET** | /api/tickets/search?q= | `tickets.search_tickets_endpoint` | Searches tickets by subject or ticket ID. |
| **GET** | /api/tickets/{ticketId} | `tickets.ticket_by_id_endpoint` | Retrieves full details for a specific ticket. |
| **PATCH** | /api/tickets/{ticketId} | `tickets.ticket_by_id_endpoint` | Edits a ticket (owner only, status must be Open). Sends an edit confirmation email. |
| **DELETE** | /api/tickets/{ticketId} | `tickets.ticket_by_id_endpoint` | Soft-deletes a ticket (owner only); flagged for agents/admins. |
| **GET** | /api/tickets/{ticketId}/comments | `tickets.ticket_comments_endpoint` | Lists progress entries on the ticket. Visible to owner / matching-team agent / admin. |
| **POST** | /api/tickets/{ticketId}/comments | `tickets.ticket_comments_endpoint` | Adds a progress entry (topic, description, optional location). |
| **POST** | /api/tickets/{ticketId}/finish | `tickets.finish_ticket_endpoint` | Resolves the ticket and writes a resolution entry; emits `TicketResolved`. |
| **POST** | /api/tickets/{ticketId}/reopen | `tickets.reopen_ticket_endpoint` | Owner re-opens a Resolved ticket; clears `resolved_at`, bumps `reopen_count`, writes a `reopen` entry, emits `TicketReopened` (UC-17). |
| **POST** | /api/users/login | `users.user_login` | Upserts the user record on Entra ID login. |
| **GET** | /api/users?email= | `users.get_user_endpoint` | Retrieves a user by email. |
| **GET** | /api/users/{userId} | `users.get_user_by_id_endpoint` | Retrieves a user by ID (any authenticated role). |

### Agent portal — `agent.py` (role: agent/admin)

| Method | Endpoint | Blueprint Handler | Description |
|--------|----------|-------------------|-------------|
| **GET** | /api/agent/tickets | `agent.get_agent_tickets` | Lists tickets visible to the agent — those whose category matches one of the agent's team categories (filters: `status`, `priority`). |
| **PATCH** | /api/agent/tickets/{ticketId}/status | `agent.update_ticket_status_endpoint` | Updates a ticket status, emits a `TicketStatusChanged` telemetry event, and notifies the submitter. |

### Notifications — `notifications.py` (any authenticated role)

| Method | Endpoint | Blueprint Handler | Description |
|--------|----------|-------------------|-------------|
| **GET** | /api/notifications | `notifications.get_notifications` | Lists notifications for the authenticated user. Optional `?unread_only=true` filter. |
| **PATCH** | /api/notifications/{notificationId}/read | `notifications.mark_notification_read` | Marks a single notification as read. |
| **POST** | /api/notifications/mark-all-read | `notifications.mark_all_read` | Marks all notifications as read for the authenticated user. |

### Admin portal — `admin.py`, `admin_notes.py`, `insights.py`, `teams.py` (role: admin)

| Method | Endpoint | Blueprint Handler | Description |
|--------|----------|-------------------|-------------|
| **GET** | /api/manage/tickets | `admin.get_admin_tickets` | Lists all tickets with optional filters for status, category, priority, and date range. |
| **PATCH** | /api/manage/tickets/{ticketId}/assign | `admin.assign_ticket_endpoint` | Assigns ticket to an agent/admin; auto-promotes Open → In Progress; sends assignment email; emits `TicketAssigned` (FR-10-02, FR-10-03). |
| **GET** | /api/manage/agent | `admin.get_agent_list` | Lists all agents; optional `?category=` filters to team-matching agents (used by assignment UIs). |
| **GET** | /api/manage/users | `admin.get_all_users_endpoint` | Lists all users (filters: `role`, `q`). |
| **PATCH** | /api/manage/users/{userId} | `admin.update_user_endpoint` | Updates a user's role or display name. |
| **GET** | /api/manage/insights?days=30 | `insights.get_insights` | Aggregated ticket metrics powering the UC-11 monitoring dashboard. |
| **GET / POST** | /api/manage/tickets/{ticketId}/notes | `admin_notes.admin_notes_endpoint` | List or add internal admin notes on a ticket (UC-16). |
| **DELETE** | /api/manage/tickets/{ticketId}/notes/{noteId} | `admin_notes.admin_note_delete_endpoint` | Delete an admin note (hard-delete). |
| **GET / POST / PATCH / DELETE** | /api/manage/teams[/{id}] | `teams.*` | Team CRUD; agents are linked to a team via `team_id` and a team's `category` must match one of the six ticket categories. |

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

Provision an Azure Cosmos DB account using the Core SQL API. Create a database named quickaid-db and containers for users, tickets, status_history, email_logs, ticket_comments, admin_notes, teams, and notifications with appropriate partition keys. The notifications container must use `/recipient_email` as its partition key.

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
