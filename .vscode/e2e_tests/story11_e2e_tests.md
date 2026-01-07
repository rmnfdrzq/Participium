As a technical office staff member 
I want to update report statuses 
So that citizens are informed of the problem resolution process.



# E2E Test Cases – Messaging & Notifications (Citizen & Municipality Users)

## User Story
As a citizen or municipality user, I want to send and receive messages related to reports so that communication is clear and timely, and notifications reflect the correct state and navigation behavior.

## Requirements
- Either citizen or municipality user is logged in
- User can navigate to the Messages tab
- Messages can be sent by both citizen and municipality users
- Notifications are triggered based on state changes
- Unauthenticated users cannot access messages
- Notifications count is accurate
- Notifications redirect users to the correct context (chat or map pin)

---

## TC-MSG-001: Logged-in user can access the Messages tab

### Preconditions
- Citizen or municipality user is logged in

### Steps
1. Log in to the system
2. Navigate to the main menu
3. Click on the **Messages** tab

### Expected Result
- Messages tab is accessible  
- User can view existing conversations (if any)

### Actual Result
The logged-in user can successfully access the Messages tab.

**Status:** PASS

---

## TC-MSG-002: Unauthenticated user cannot access messages

### Preconditions
- User is not logged in

### Steps
1. Open the application
2. Attempt to access the Messages tab directly via URL or UI

### Expected Result
- Access is denied  
- User is redirected to the login page

### Actual Result
Unauthenticated users cannot view or access messages and are redirected to login.

**Status:** PASS

---

## TC-MSG-003: Citizen sends a message with no status change (no notification)

### Preconditions
- Citizen user is logged in
- A report with an active chat exists

### Steps
1. Navigate to the report chat
2. No notification should be shown

### Expected Result
- No notification is triggered

### Actual Result
Until some action is taken no notification is generated.

**Status:** PASS

---

## TC-MSG-004: Citizen sends a message with status changes to Assigned (notification sent)

### Preconditions
- Citizen user is logged in
- Report is in a state that allows status change

### Steps
1. Navigate to the report chat
2. Send a message
3. Change report status to **Assigned**

### Expected Result
- Message is sent successfully  
- Notification is generated for the municipality user

### Actual Result
The message is delivered and a notification is sent due to status change.

**Status:** PASS

---

## TC-MSG-005: Citizen sends a message with status change Suspended, Resolved, or In Progress (notification sent)

### Preconditions
- Citizen user is logged in
- Report exists with chat enabled

### Steps
1. Navigate to the report chat
3. Change report status to:
   - Suspended
   - Resolved 
   - In Progress 

### Expected Result 
- Notification is generated for each status change

### Actual Result
Notifications are triggered correctly for all defined status changes.

**Status:** PASS

---

## TC-MSG-006: Citizen sends a message and officer receives it with notification

### Preconditions
- Citizen user is logged in
- Officer (municipality user) is associated with the report

### Steps
1. Citizen navigates to the report chat
2. Citizen sends a message

### Expected Result
- Officer receives the message  
- Officer receives a notification

### Actual Result
The officer receives the message and a notification is shown.

**Status:** PASS

---

## TC-MSG-007: Officer sends a message and citizen receives it with notification

### Preconditions
- Municipality user (officer) is logged in
- Citizen is associated with the report

### Steps
1. Officer navigates to the report chat
2. Officer sends a message

### Expected Result
- Citizen receives the message  
- Citizen receives a notification

### Actual Result
The citizen receives the message with a notification.

**Status:** PASS

---

## TC-MSG-008: Notification counter shows the correct number of unread messages

### Preconditions
- User has multiple unread messages

### Steps
1. Log in as citizen or municipality user
2. Observe the notification badge count
3. Open one or more message notifications

### Expected Result
- Notification counter reflects the correct number of unread items  
- Counter decreases as messages are read

### Actual Result
Notification count updates correctly based on read/unread messages.

**Status:** PASS

---

## TC-MSG-009: Clicking a notification as a citizen opens the map and related pin chat

### Preconditions
- Citizen user has received a message notification related to a report

### Steps
1. Click on the notification
2. Observe navigation behavior

### Expected Result
- User is redirected to the map  
- Correct pin is highlighted  
- Chat for the related report is opened

### Actual Result
Clicking the notification opens the map with the correct pin and chat.

**Status:** PASS

---

## TC-MSG-010: Clicking a notification as a municipality user opens the chat tab

### Preconditions
- Municipality user has received a message notification

### Steps
1. Click on the notification

### Expected Result
- User is redirected to the Messages / Chat tab  
- Correct conversation is opened

### Actual Result
The notification redirects the municipality user to the correct chat.

**Status:** PASS

---

## TC-MSG-011: Clicking the pin icon opens the map with the correct report details

### Preconditions
- User is logged in
- A report with a pin and chat exists

### Steps
1. Click the pin icon from the chat or report view

### Expected Result
- User is redirected to the map  
- Correct pin is centered  
- Report details are displayed

### Actual Result
The map opens with the correct pin and associated report details.

**Status:** PASS

---

## Test Metadata

- **Testing Date:** 06/01/2026  
- **Browser(s):** Firefox  
- **Device(s):** Desktop  
