# QuickAid API Test Cases — Azure API Management

**Host**: `quickaid-api-managment.azure-api.net`

---

## Authentication Reference

All protected endpoints require the `X-User-Email` header. The backend looks up this email in Cosmos DB and checks the user's role.

| Role | Access Level |
|------|-------------|
| student | Tickets (own), Users — customer |
| staff | Tickets (own), Users — customer (legacy ticket-handler if directly assigned) |
| agent | Handler portal — sees all tickets in their team's category + any directly assigned. Belongs to a team via `team_id`. |
| admin | Admin portal + all access (manages users, teams, ticket assignment) |

---

## 1. Users Blueprint (Public)

### 1.1 POST `/api/users/login` — Upsert user on login

| Field | Value |
|-------|-------|
| Method | POST |
| URL | `/api/users/login` |

**Headers**:

| Name | Value |
|------|-------|
| Content-Type | application/json |

**Body (Raw)**:

```json
{
  "display_name": "Test Student",
  "email": "teststudent@example.com"
}
```

**Expected Response** (200):

```json
{
  "success": true,
  "user": { "display_name": "Test Student", "email": "teststudent@example.com", "role": "student" }
}
```

> No `X-User-Email` header needed — this is the login endpoint itself.

---

### 1.2 GET `/api/users?email={email}` — Get user by email

| Field | Value |
|-------|-------|
| Method | GET |
| URL | `/api/users` |

**Query Parameters**:

| Name | Value |
|------|-------|
| email | teststudent@example.com |

**Headers**: None required

**Expected Response** (200):

```json
{
  "user": { "display_name": "Test Student", "email": "teststudent@example.com", "role": "student" }
}
```

---

### 1.3 GET `/api/users/{userId}` — Get user by ID

| Field | Value |
|-------|-------|
| Method | GET |
| URL | `/api/users/{userId}` |

**Template Parameters**:

| Name | Value |
|------|-------|
| userId | (a real user ID from your DB) |

**Headers**:

| Name | Value |
|------|-------|
| X-User-Email | teststudent@example.com |

**Expected Response** (200):

```json
{
  "user": { "id": "...", "display_name": "Test Student", "email": "teststudent@example.com" }
}
```

> Protected — requires any role (student/staff/admin).

---

## 2. Tickets Blueprint (Auth Required)

### 2.1 POST `/api/submit_ticket` — Create a ticket

| Field | Value |
|-------|-------|
| Method | POST |
| URL | `/api/submit_ticket` |

**Headers**:

| Name | Value |
|------|-------|
| Content-Type | application/json |
| X-User-Email | teststudent@example.com |

**Body (Raw)**:

```json
{
  "subject": "Cannot access WiFi in Library",
  "description": "I am unable to connect to the campus WiFi network in the main library building since this morning.",
  "category": "IT Support",
  "priority": "High",
  "email": "teststudent@example.com"
}
```

**Valid Categories**: `IT Support`, `Facilities`, `Academic Services`, `Library`, `Finance`, `General Inquiry`

**Valid Priorities**: `Low`, `Medium`, `High`, `Critical`

**Expected Response** (201):

```json
{
  "success": true,
  "ticket_id": "TIK-XXXXX",
  "message": "Ticket submitted! Your ID is TIK-XXXXX. Confirmation sent to teststudent@example.com.",
  "ticket": { ... }
}
```

**Email Triggered**: Confirmation email sent to the `email` in the body.

---

### 2.2 GET `/api/tickets` — Get my tickets

| Field | Value |
|-------|-------|
| Method | GET |
| URL | `/api/tickets` |

**Headers**:

| Name | Value |
|------|-------|
| X-User-Email | teststudent@example.com |

**Query Parameters** (optional):

| Name | Value | Options |
|------|-------|---------|
| status | Open | Open, In Progress, Resolved, Closed |
| category | IT Support | IT Support, Facilities, Academic Services, Library, Finance, General Inquiry |

**Expected Response** (200):

```json
{
  "tickets": [ { "ticket_id": "TIK-XXXXX", "subject": "...", "status": "Open", ... } ]
}
```

---

### 2.3 GET `/api/tickets/search?q={query}` — Search tickets

| Field | Value |
|-------|-------|
| Method | GET |
| URL | `/api/tickets/search` |

**Headers**:

| Name | Value |
|------|-------|
| X-User-Email | teststudent@example.com |

**Query Parameters**:

| Name | Value |
|------|-------|
| q | WiFi |

**Expected Response** (200):

```json
{
  "tickets": [ { "ticket_id": "TIK-XXXXX", "subject": "Cannot access WiFi in Library", ... } ]
}
```

---

### 2.4 GET `/api/tickets/{ticketId}` — Get ticket by ID

| Field | Value |
|-------|-------|
| Method | GET |
| URL | `/api/tickets/{ticketId}` |

**Template Parameters**:

| Name | Value |
|------|-------|
| ticketId | (a real ticket ID from submit response) |

**Headers**:

| Name | Value |
|------|-------|
| X-User-Email | teststudent@example.com |

**Expected Response** (200):

```json
{
  "ticket_id": "TIK-XXXXX",
  "subject": "Cannot access WiFi in Library",
  "status": "Open",
  ...
}
```

---

## 3. Handler Blueprint (Role: staff, agent, or admin)

### 3.1 GET `/api/staff/tickets` — View visible tickets

> Visibility model:
> - **staff** (legacy handler): only tickets where `assigned_to == X-User-Email`.
> - **agent**: directly-assigned tickets PLUS every ticket whose `category` matches the agent's team category (resolved via `team_id` → `team.category`). Agents without a `team_id` see only directly-assigned.
> - **admin**: only directly-assigned tickets via this endpoint (admins use `/api/manage/tickets` for the full view).

| Field | Value |
|-------|-------|
| Method | GET |
| URL | `/api/staff/tickets` |

**Headers**:

| Name | Value |
|------|-------|
| X-User-Email | staffmember@example.com |

**Query Parameters** (optional):

| Name | Value | Options |
|------|-------|---------|
| status | Open | Open, In Progress, Resolved, Closed |
| priority | High | Low, Medium, High, Critical |

**Expected Response** (200):

```json
{
  "tickets": [ { "ticket_id": "TIK-XXXXX", "assigned_to": "staffmember@example.com", ... } ]
}
```

> Returns **403** if the user's role is `student`.

**Agent test variant**: Use `X-User-Email: agent@example.com` (a user with role=agent and a `team_id` whose team category is "IT Support"). Submit a ticket with `category: "IT Support"` (do NOT assign it). The unassigned ticket should still appear in this list.

---

### 3.2 PATCH `/api/staff/tickets/{ticketId}/status` — Update ticket status

| Field | Value |
|-------|-------|
| Method | PATCH |
| URL | `/api/staff/tickets/{ticketId}/status` |

**Template Parameters**:

| Name | Value |
|------|-------|
| ticketId | (a ticket ID assigned to this staff member) |

**Headers**:

| Name | Value |
|------|-------|
| Content-Type | application/json |
| X-User-Email | staffmember@example.com |

**Body (Raw)**:

```json
{
  "status": "In Progress"
}
```

**Valid Status Transitions**:

| Current Status | Allowed Next Status |
|---------------|-------------------|
| Open | In Progress, Closed |
| In Progress | Resolved, Closed |
| Resolved | Closed, In Progress |
| Closed | (none — terminal state) |

**Expected Response** (200):

```json
{
  "success": true,
  "message": "Status updated to 'In Progress'.",
  "ticket": { ... },
  "tickets": [ ... ]
}
```

**Email Triggered**: Status update email sent to the ticket submitter.

> **Authorization rules**:
> - **staff** (legacy): may update only tickets directly assigned to them.
> - **agent**: may update tickets directly assigned to them OR any ticket whose category matches their team's category.
> - **admin**: may update any ticket.

---

## 4. Admin Blueprint (Role: admin only)

### 4.1 GET `/api/manage/tickets` — View all tickets

| Field | Value |
|-------|-------|
| Method | GET |
| URL | `/api/manage/tickets` |

**Headers**:

| Name | Value |
|------|-------|
| X-User-Email | adminuser@example.com |

**Query Parameters** (optional):

| Name | Value | Options |
|------|-------|---------|
| status | Open | Open, In Progress, Resolved, Closed |
| category | IT Support | IT Support, Facilities, Academic Services, Library, Finance, General Inquiry |
| priority | High | Low, Medium, High, Critical |
| date_from | 2026-04-01 | YYYY-MM-DD format |
| date_to | 2026-04-17 | YYYY-MM-DD format |

**Expected Response** (200):

```json
{
  "tickets": [ { "ticket_id": "TIK-XXXXX", ... }, ... ]
}
```

> Returns **403** if the user's role is not `admin`.

---

### 4.2 PATCH `/api/manage/tickets/{ticketId}/assign` — Assign ticket to staff

| Field | Value |
|-------|-------|
| Method | PATCH |
| URL | `/api/manage/tickets/{ticketId}/assign` |

**Template Parameters**:

| Name | Value |
|------|-------|
| ticketId | (a real ticket ID) |

**Headers**:

| Name | Value |
|------|-------|
| Content-Type | application/json |
| X-User-Email | adminuser@example.com |

**Body (Raw)**:

```json
{
  "assigned_to": "staffmember@example.com"
}
```

**Expected Response** (200):

```json
{
  "success": true,
  "message": "Ticket TIK-XXXXX assigned to Staff Member.",
  "ticket": { ... }
}
```

**Email Triggered**: Assignment notification email sent to the staff member (`assigned_to`).

> The `assigned_to` email must belong to a user with role `staff`, `agent`, or `admin` in the database.

**Agent assignment rules**:

- If the assignee is an `agent`, they must have a `team_id` set, and the team's `category` must equal the ticket's `category`.
- Mismatched category returns **400** with `"Agent's team category 'X' does not match ticket category 'Y'."`
- Agent without a `team_id` returns **400** with `"Agent '<email>' has no team assigned."`

---

### 4.3 GET `/api/manage/staff` — List all staff members

| Field | Value |
|-------|-------|
| Method | GET |
| URL | `/api/manage/staff` |

**Headers**:

| Name | Value |
|------|-------|
| X-User-Email | adminuser@example.com |

**Expected Response** (200):

```json
{
  "staff": [ { "display_name": "Staff Member", "email": "staffmember@example.com", "role": "staff" }, ... ]
}
```

> Returns **403** if the user's role is not `admin`.

---

### 4.4 GET `/api/manage/teams` — List all teams

| Field | Value |
|-------|-------|
| Method | GET |
| URL | `/api/manage/teams` |

**Headers**:

| Name | Value |
|------|-------|
| X-User-Email | adminuser@example.com |

**Expected Response** (200):

```json
{
  "teams": [ { "team_id": "...", "name": "IT Squad", "category": "IT Support", "created_at": "...", "updated_at": "..." } ]
}
```

---

### 4.5 POST `/api/manage/teams` — Create a team

| Field | Value |
|-------|-------|
| Method | POST |
| URL | `/api/manage/teams` |

**Headers**:

| Name | Value |
|------|-------|
| Content-Type | application/json |
| X-User-Email | adminuser@example.com |

**Body (Raw)**:

```json
{
  "name": "IT Squad",
  "category": "IT Support"
}
```

**Expected Response** (201):

```json
{
  "success": true,
  "team": { "team_id": "...", "name": "IT Squad", "category": "IT Support", ... }
}
```

> Returns **400** if `name` or `category` is missing/invalid (category must be one of `VALID_CATEGORIES`), or if a team with the same name already exists.

---

### 4.6 PATCH `/api/manage/teams/{teamId}` — Update team

| Field | Value |
|-------|-------|
| Method | PATCH |
| URL | `/api/manage/teams/{teamId}` |

**Body (Raw)** (any subset of fields):

```json
{
  "name": "IT Operations",
  "category": "IT Support"
}
```

**Expected Response** (200):

```json
{
  "success": true,
  "team": { ... }
}
```

> Returns **400** for empty payload or duplicate name; **404** if `teamId` not found.

---

### 4.7 DELETE `/api/manage/teams/{teamId}` — Delete team

| Field | Value |
|-------|-------|
| Method | DELETE |
| URL | `/api/manage/teams/{teamId}` |

**Headers**:

| Name | Value |
|------|-------|
| X-User-Email | adminuser@example.com |

**Expected Response** (200):

```json
{ "success": true, "message": "Team 'IT Squad' deleted." }
```

> Returns **409** if any agent still references this team — admin must reassign those agents first. Returns **404** if `teamId` not found.

---

### 4.8 GET `/api/manage/agents` — List all agents

| Field | Value |
|-------|-------|
| Method | GET |
| URL | `/api/manage/agents` |

**Headers**:

| Name | Value |
|------|-------|
| X-User-Email | adminuser@example.com |

**Expected Response** (200):

```json
{
  "agents": [ { "user_id": "...", "display_name": "Agent Smith", "email": "agent@example.com", "team_id": "..." } ]
}
```

---

### 4.9 PATCH `/api/manage/users/{userId}` — Set role/team for an agent

To turn an existing user into an agent and assign them to a team:

**Body (Raw)**:

```json
{
  "role": "agent",
  "team_id": "<team_id from /api/manage/teams>"
}
```

> If `role` is changed away from `agent`, the backend defensively forces `team_id` to `null`.

---

## 5. Email Notifications (Side Effects)

Emails are **not** separate endpoints. They fire automatically as side effects of the following API calls. Use a real email address you can check to verify.

### 5.1 Confirmation Email (FR-03-01)

| Trigger | `POST /api/submit_ticket` |
|---------|--------------------------|
| Sent To | The `email` in the ticket body |
| Subject | `[TIK-XXXXX] Ticket Received — (ticket subject)` |
| Contains | Ticket ID, Subject, Category, Priority, Description |

**How to test**: Submit a ticket with your real email and check your inbox.

---

### 5.2 Status Update Email (FR-05-01)

| Trigger | `PATCH /api/staff/tickets/{ticketId}/status` |
|---------|----------------------------------------------|
| Sent To | The original ticket submitter's email |
| Subject | `[TIK-XXXXX] Status Updated — (new status)` |
| Contains | Ticket ID, New Status |

**How to test**: Update a ticket's status and check the submitter's inbox.

---

### 5.3 Assignment Email (FR-09-01)

| Trigger | `PATCH /api/manage/tickets/{ticketId}/assign` |
|---------|-----------------------------------------------|
| Sent To | The staff member being assigned (`assigned_to`) |
| Subject | `[TIK-XXXXX] Ticket Assigned — (ticket subject)` |
| Contains | Ticket ID, Subject |

**How to test**: Assign a ticket to a staff member with a real email and check their inbox.

---

## 6. Error Responses Reference

| Status | When |
|--------|------|
| 400 | Validation failed (missing/invalid fields, bad status transition) |
| 401 | `X-User-Email` header missing or user not found in DB |
| 403 | User role not authorized for this endpoint |
| 404 | Ticket or user not found |
| 500 | Internal server error (DB or email failure) |

---

## 7. Recommended Test Order

| Step | Endpoint | Purpose |
|------|----------|---------|
| 1 | `POST /api/users/login` | Create a test user |
| 2 | `GET /api/users?email=...` | Verify user was created |
| 3 | `GET /api/users/{userId}` | Verify user lookup by ID |
| 4 | `POST /api/submit_ticket` | Create a ticket (note the `ticket_id`) + verify **confirmation email** |
| 5 | `GET /api/tickets` | List your tickets |
| 6 | `GET /api/tickets/{ticketId}` | Get the ticket you just created |
| 7 | `GET /api/tickets/search?q=WiFi` | Search for the ticket |
| 8 | `GET /api/manage/tickets` | View all tickets as admin |
| 9 | `GET /api/manage/staff` | List available staff |
| 10 | `PATCH /api/manage/tickets/{ticketId}/assign` | Assign ticket to staff + verify **assignment email** |
| 11 | `GET /api/staff/tickets` | View assigned tickets as staff |
| 12 | `PATCH /api/staff/tickets/{ticketId}/status` | Update status to "In Progress" + verify **status update email** |
| 13 | `POST /api/manage/teams` | Create an "IT Squad" team for the "IT Support" category |
| 14 | `PATCH /api/manage/users/{agentId}` | Promote a user to `agent` and set their `team_id` |
| 15 | `GET /api/staff/tickets` (as agent) | Verify the agent sees the IT Support ticket from step 4 even without direct assignment |
| 16 | `PATCH /api/manage/tickets/{ticketId}/assign` | Assign that ticket to the agent — confirm 200 (category matches) |
| 17 | `PATCH /api/manage/tickets/{otherTicketId}/assign` | Try assigning a non-IT ticket to the same agent — confirm **400** (category mismatch) |
| 18 | `DELETE /api/manage/teams/{teamId}` | Try deleting the team while the agent still belongs — confirm **409** |
