# QuickAid API Test Cases — Azure API Management

**Host**: `quickaid-api-managment.azure-api.net`

---

## Authentication Reference

All protected endpoints require the `X-User-Email` header. The backend looks up this email in Cosmos DB and checks the user's role.

| Role | Access Level |
|------|-------------|
| user | Tickets (own), Users |
| agent | Agent portal + user access |
| admin | Admin portal + all access |

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
  "display_name": "Test User",
  "email": "testuser@example.com"
}
```

**Expected Response** (200):

```json
{
  "success": true,
  "user": { "display_name": "Test User", "email": "testuser@example.com", "role": "user" }
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
| email | testuser@example.com |

**Headers**: None required

**Expected Response** (200):

```json
{
  "user": { "display_name": "Test User", "email": "testuser@example.com", "role": "user" }
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
| X-User-Email | testuser@example.com |

**Expected Response** (200):

```json
{
  "user": { "id": "...", "display_name": "Test User", "email": "testuser@example.com" }
}
```

> Protected — requires any role (user/agent/admin).

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
| X-User-Email | testuser@example.com |

**Body (Raw)**:

```json
{
  "subject": "Cannot access WiFi in Library",
  "description": "I am unable to connect to the campus WiFi network in the main library building since this morning.",
  "category": "IT Support",
  "priority": "High",
  "email": "testuser@example.com"
}
```

**Valid Categories**: `IT Support`, `Facilities`, `Academic Services`, `Library`, `Finance`, `General Inquiry`

**Valid Priorities**: `Low`, `Medium`, `High`, `Critical`

**Expected Response** (201):

```json
{
  "success": true,
  "ticket_id": "TIK-XXXXX",
  "message": "Ticket submitted! Your ID is TIK-XXXXX. Confirmation sent to testuser@example.com.",
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
| X-User-Email | testuser@example.com |

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
| X-User-Email | testuser@example.com |

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
| X-User-Email | testuser@example.com |

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

## 3. Agent Blueprint (Role: agent or admin)

### 3.1 GET `/api/agent/tickets` — View assigned tickets

| Field | Value |
|-------|-------|
| Method | GET |
| URL | `/api/agent/tickets` |

**Headers**:

| Name | Value |
|------|-------|
| X-User-Email | agentmember@example.com |

**Query Parameters** (optional):

| Name | Value | Options |
|------|-------|---------|
| status | Open | Open, In Progress, Resolved, Closed |
| priority | High | Low, Medium, High, Critical |

**Expected Response** (200):

```json
{
  "tickets": [ { "ticket_id": "TIK-XXXXX", "assigned_to": "agentmember@example.com", ... } ]
}
```

> Returns **403** if the user's role is `user`.

---

### 3.2 PATCH `/api/agent/tickets/{ticketId}/status` — Update ticket status

| Field | Value |
|-------|-------|
| Method | PATCH |
| URL | `/api/agent/tickets/{ticketId}/status` |

**Template Parameters**:

| Name | Value |
|------|-------|
| ticketId | (a ticket ID assigned to this agent member) |

**Headers**:

| Name | Value |
|------|-------|
| Content-Type | application/json |
| X-User-Email | agentmember@example.com |

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

> Agent can only update tickets assigned to them. Admins can update any ticket.

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

### 4.2 PATCH `/api/manage/tickets/{ticketId}/assign` — Assign ticket to agent

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
  "assigned_to": "agentmember@example.com"
}
```

**Expected Response** (200):

```json
{
  "success": true,
  "message": "Ticket TIK-XXXXX assigned to Agent Member.",
  "ticket": { ... }
}
```

**Email Triggered**: Assignment notification email sent to the agent member (`assigned_to`).

> The `assigned_to` email must belong to a user with role `agent` or `admin` in the database.

---

### 4.3 GET `/api/manage/agent` — List all agent members

| Field | Value |
|-------|-------|
| Method | GET |
| URL | `/api/manage/agent` |

**Headers**:

| Name | Value |
|------|-------|
| X-User-Email | adminuser@example.com |

**Expected Response** (200):

```json
{
  "agent": [ { "display_name": "Agent Member", "email": "agentmember@example.com", "role": "agent" }, ... ]
}
```

> Returns **403** if the user's role is not `admin`.

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

| Trigger | `PATCH /api/agent/tickets/{ticketId}/status` |
|---------|----------------------------------------------|
| Sent To | The original ticket submitter's email |
| Subject | `[TIK-XXXXX] Status Updated — (new status)` |
| Contains | Ticket ID, New Status |

**How to test**: Update a ticket's status and check the submitter's inbox.

---

### 5.3 Assignment Email (FR-09-01)

| Trigger | `PATCH /api/manage/tickets/{ticketId}/assign` |
|---------|-----------------------------------------------|
| Sent To | The agent member being assigned (`assigned_to`) |
| Subject | `[TIK-XXXXX] Ticket Assigned — (ticket subject)` |
| Contains | Ticket ID, Subject |

**How to test**: Assign a ticket to a agent member with a real email and check their inbox.

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
| 9 | `GET /api/manage/agent` | List available agent |
| 10 | `PATCH /api/manage/tickets/{ticketId}/assign` | Assign ticket to agent + verify **assignment email** |
| 11 | `GET /api/agent/tickets` | View assigned tickets as agent |
| 12 | `PATCH /api/agent/tickets/{ticketId}/status` | Update status to "In Progress" + verify **status update email** |
