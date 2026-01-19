# Participium — Personal Contribution

Participium is a web platform for reporting and managing urban issues, developed for the city of Turin, Italy. Citizens submit reports about city problems, while municipal officers process them through a structured workflow.

This repository is a fork of the original project. Below is a summary of my personal contribution to the project as part of a team.

---

## Overview of My Contribution

I worked on both frontend and backend parts of the application, focusing on real-time features, user experience, accessibility, and system reliability. My work covered new feature development as well as improvements to existing functionality.

---

## Key Contributions

### 1. Real-Time Notification System

Designed and implemented a complete real-time notification system:

- Instant notifications for citizens when the status of their reports changes
- Notification dropdown in the application header with latest updates
- Dedicated notifications page with full notification history
- One-click navigation from a notification to the related report on the map
- Synchronization of unread counters across the UI

**Business value:** Improved transparency for citizens by keeping them informed about the progress of their reports at all times.

---

### 2. Chat System Redesign (Citizen ↔ Operator)

Reworked the business logic and technical implementation of the chat system:

- Operators initiate conversations for specific reports
- Chats appear dynamically for each role at the correct moment
- Citizens cannot send the first message before the operator starts the chat
- Messages are delivered in real time using WebSockets
- Removed duplicated system messages caused by status updates

**Business value:** Simplified and structured communication between citizens and municipal services.

---

### 3. Real-Time Updates for Operator Workflows

- Automatically updated report lists when report statuses change
- Eliminated the need for manual page reloads for operators
- Implemented event-based updates across multiple operator dashboards

**Business value:** Increased operator efficiency and reduced manual actions.

---

### 4. Accessibility Improvements

Improved accessibility to support users with disabilities:

- Keyboard navigation support
- Screen reader compatibility
- Better focus management for interactive elements

**Business value:** Expanded the platform’s accessibility and improved compliance with accessibility standards.

---

### 5. User Profile Enhancements

- Implemented username change functionality in user profile settings

---

### 6. Security Improvements

- Replaced an insecure random number generator with a cryptographically secure implementation

---

## Technical Details

### Technologies Used

**Frontend**
- React
- React Router
- Redux
- WebSocket (Socket.IO)

**Backend**
- Node.js
- Express
- PostgreSQL

**Architecture**
- REST API
- Event-driven updates
- Role-based access logic
- Real-time bidirectional communication

---

## Implementation Highlights

### Notification System

**Backend**
- Extended WebSocket payloads with report metadata (`new_status_id`, `report_title`, `status_name`)
- Added support for fetching the latest N notifications
- Updated database schema to support enhanced notification data

**Frontend**
- Header dropdown with the latest notifications
- New notifications page with filtering and bulk actions
- Custom events to synchronize read status across components
- New `/notifications` route added to the application router

---

### Chat System Logic

**Backend**
- Role-based chat visibility logic for citizens and operators
- Controlled chat initiation via operator actions
- Improved report and chat state consistency

**Frontend**
- Input blocking for citizens until operator initiates chat
- Real-time chat appearance for both roles
- Unified status color mapping across chat and report views
- Conditional UI logic for chat controls on the map page

---

### Real-Time Report Updates

- Dispatching global events on report status changes
- Automatic reloading of report lists for different operator roles

---

## Scope of Work

- ~1,100 lines of code added
- Full-stack development (frontend and backend)
- One new module implemented from scratch (Notifications page)
- 11+ existing components modified and extended
- Active participation in a team-based development process

---

## What This Demonstrates

- Full-stack development skills (frontend + backend)
- Ability to translate business requirements into technical solutions
- Experience with real-time systems (WebSockets)
- Focus on code quality, accessibility, and security
- Ability to work effectively with and extend an existing codebase
