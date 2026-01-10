# DB CHANGES - DIAGRAM ER

To see the diagram ER to understand better the changes in the DB

https://www.mermaidchart.com/d/79cd4c71-ca44-412d-bd18-f9a8536e063b

# commands

terminal BE : cd server;npm i;nodemon index.mjs
terminal FE : cd client;npm i;npm run dev
connection to db: (docker-desktop open and running) docker compose up -d
test: cd server; npm test ( cd server; npm run test:coverage) (npm test name_file)
retrospective: cd retrospective; node calculate.mjs

commads to reset and restart postgreSQL db : docker compose down; Remove-Item -Recurse -Force .\db_data; docker compose up -d
commands to remove a container named participium_db: docker rm -f participium_db

# Docker compose using participium image example

Copy the following compose.yaml file and init.sql of the project into the same folder

docker compose up

```yaml
version: "3.9"

services:
  postgres:
    image: postgres:15
    container_name: participium_db
    environment:
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: changeme
      POSTGRES_DB: participium
    ports:
      - "5432:5432"
    volumes:
      - ./db_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    networks:
      - participium_network
    restart: unless-stopped

  participium:
    image: participium/participium:latest
    container_name: participium_app
    environment:
      DB_HOST: postgres
      DB_PORT: 5432
      DB_USER: admin
      DB_PASSWORD: changeme
      DB_NAME: participium
      SUPABASE_URL: https://your-supabase-url.supabase.co
      SUPABASE_SERVICE_ROLE_KEY: your-supabase-service-role-key
      SUPABASE_BUCKET_NAME: your-bucket-name
      GMAIL_USER: your-gmail
      GMAIL_APP_PASSWORD: your-gmail-app-psw

    ports:
      - "3001:3001"
      - "5173:5173"
    depends_on:
      - postgres
    networks:
      - participium_network
    restart: unless-stopped

networks:
  participium_network:
    driver: bridge
```

# mail - password

admin@participium.local - participium

-- Citizen
melo@participium.local - password

-- Organization Office
off.org@participium.local - participium

-- Water Department
tec.water@participium.local - participium

-- Accessibility Office
tec.accessibility@participium.local - participium

-- Sewage Department
tec.sewage@participium.local - participium

-- Lighting Department
tec.lighting@participium.local - participium

-- Waste Management
tec.waste@participium.local - participium

-- Traffic Department
tec.traffic@participium.local - participium

-- Public Works
tec.publicworks@participium.local - participium

-- Parks Department
tec.parks@participium.local - participium

-- General Services
tec.general@participium.local - participium

# Real-time Features (WebSockets)

The application uses **Socket.IO** for real-time communication between the server and clients.

## Architecture

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│     Client      │◄───────►│   Socket.IO     │◄───────►│     Server      │
│   (React App)   │  WS     │    Server       │         │   (Express)     │
└─────────────────┘         └─────────────────┘         └─────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
              citizen:1       operator:6      report:123
              (user room)   (operator room)  (chat room)
```

## Socket Rooms

| Room Type         | Format          | Purpose                              |
| ----------------- | --------------- | ------------------------------------ |
| **Citizen Room**  | `citizen:{id}`  | Personal notifications for citizens  |
| **Operator Room** | `operator:{id}` | Personal notifications for operators |
| **Report Room**   | `report:{id}`   | Chat messages for a specific report  |

## Events

### Server → Client

| Event              | Payload                                                                               | Description                    |
| ------------------ | ------------------------------------------------------------------------------------- | ------------------------------ |
| `new_notification` | `{ id, report_id, report_title, message, new_status_id, status_name, sent_at, seen }` | New status update notification |
| `new_message`      | `{ id, report_id, sender_type, sender_id, content, sent_at }`                         | New chat message               |

### Client → Server

| Event          | Payload    | Description                |
| -------------- | ---------- | -------------------------- |
| `join_report`  | `reportId` | Join a report's chat room  |
| `leave_report` | `reportId` | Leave a report's chat room |

## Features

### Notifications (Citizens only)

- Citizens receive real-time notifications when their report status changes
- Notification badge in header shows unread count
- Notification dropdown shows last 10 notifications with report title, new status, and time
- "Show All" button opens `/notifications` page with full notification history
- Clicking a notification navigates to the report on the map

### Chat (Citizens & Technical Officers)

Chat visibility follows different rules for each role:

**For Citizens:**

- Chat appears in their list **only after** a technical officer sends the first message
- Citizens cannot initiate a chat or send the first message
- "Open Chat" button on map is hidden until the technical officer starts the conversation
- New chats appear instantly when the technical officer sends the first message (no refresh needed)

**For Technical Officers:**

- Chat appears in their list **only after** they click "Open Chat" for a specific report
- Chats are not created automatically when a report is assigned
- Technical officer can send the first message after opening the chat

**Features:**

- Real-time message delivery via WebSocket
- Unread message badge in header
- Full chat history available on `/chats` page
- Status badges use consistent color standards across the app

## Connection Flow

1. User logs in → Client establishes WebSocket connection with `userId` and `userType`
2. Server authenticates and joins user to their personal room (`citizen:{id}` or `operator:{id}`)
3. When user opens a chat → Client emits `join_report` to join the report room
4. When user leaves chat → Client emits `leave_report` to leave the room
5. On logout → WebSocket connection is closed

---

# DB

citizens( citizen_id, email, username, first_name, last_name, password_hash, salt, profile_photo_url, telegram_username, email_notifications, created_at, verified )

verification_codes( code_id, citizen_id, code, created_at, expires_at )

categories( category_id, name, office )

companies( company_id, name, description )

company_categories( company_id, category_id )

statuses( status_id, name )

roles( role_id, name, description )

operators( operator_id, email, username, password_hash, salt, role_id, company_id )

operator_categories( operator_id, category_id )

reports( report_id, citizen_id, category_id, status_id, assigned_to_operator_id, assigned_to_company_id, assigned_to_external_id, title, description, latitude, longitude, anonymous, rejection_reason, created_at, updated_at )

photos( photo_id, report_id, image_url, uploaded_at )

internal_comment( internal_comment_id, report_id, sender_operator_id, content, created_at )

messages( message_id, report_id, sender_type, sender_id, content, sent_at )

notifications( notification_id, citizen_id, report_id, message, new_status_id, sent_at, seen )

telegram_users( telegram_user_id, citizen_id, chat_id, linked_at )

---

# Server Structure

```
server/
├── index.mjs              # Express app + Socket.IO server setup
├── dao.mjs                # Data Access Object (exports all services)
├── socket.mjs             # Socket.IO instance holder (prevents circular deps)
├── utils.mjs              # Utility functions
├── router/
│   ├── category.mjs       # Category routes
│   ├── citizen.mjs        # Citizen routes
│   ├── company.mjs        # Company routes
│   ├── operator.mjs       # Operator routes
│   ├── report.mjs         # Report routes (includes messages)
│   ├── role.mjs           # Role routes
│   ├── notification.mjs   # Notification routes
│   └── chat.mjs           # Chat routes
├── services/
│   ├── category.mjs       # Category database operations
│   ├── citizen.mjs        # Citizen database operations
│   ├── comment.mjs        # Comments & messages database operations
│   ├── company.mjs        # Company database operations
│   ├── operator.mjs       # Operator database operations
│   ├── report.mjs         # Report database operations
│   ├── role.mjs           # Role database operations
│   ├── notification.mjs   # Notification database operations
│   ├── chat.mjs           # Chat database operations
│   └── utils.mjs          # Database utility functions
└── __tests__/             # Jest test files
```
