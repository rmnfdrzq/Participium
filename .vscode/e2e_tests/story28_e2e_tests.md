# E2E Test Cases – Public Access for Unregistered User

**User Story:**  
As an unregistered user I want to see approved reports on an interactive map so that I can know about issues in my area and beyond.

**Requirements:**
- Unregistered users can access the main page
- Public reports are visible on the map
- Private reports (pending approval, rejected, resolved) are hidden
- Unregistered users must log in to submit reports

---

## TC-GUEST-001: Unregistered user can access main page and view map

**Preconditions:**
- User is NOT registered
- User is NOT logged in

**Steps:**
1. Open the application main URL
2. Observe the landing page

**Expected Result:**
- Main page loads successfully
- Map is visible
- Public reports are displayed on the map

**Actual Result:**  
The main page loads correctly, the map is displayed, and public reports are visible.

**Status:** [PASS]

---

## TC-GUEST-002: Unregistered user can browse public reports

**Preconditions:**
- User is NOT logged in
- Public reports exist in the system

**Steps:**
1. Open the main page
2. Click on different report pins on the map
3. View report details

**Expected Result:**
- User can open and read public report details
- No authentication prompt appears while browsing

**Actual Result:**  
The user can view all public report details without being prompted to log in.

**Status:** [PASS]

---

## TC-GUEST-003: Unregistered user cannot view private reports

**Preconditions:**
- User is NOT logged in
- Reports with private statuses exist:
  - Pending approval
  - Rejected
  - Resolved

**Steps:**
1. Open the main page
2. Inspect the map for available reports

**Expected Result:**
- Reports with private statuses are NOT visible
- Only public reports appear on the map

**Actual Result:**  
Only public reports are visible. Reports with private statuses do not appear on the map.

**Status:** [PASS]

---

## TC-GUEST-004: Unregistered user can place a pin on the map

**Preconditions:**
- User is NOT logged in

**Steps:**
1. Open the main page
2. Click on the map to place a pin

**Expected Result:**
- Pin placement interaction is allowed
- A button with "Submit Report" is shown to the user

**Actual Result:**  
The user can place a pin on the map and proceed to the report submission attempt.

**Status:** [PASS]

---

## TC-GUEST-005: Unregistered user is redirected to login when submitting a report

**Preconditions:**
- User is NOT logged in
- User has placed a pin on the map

**Steps:**
1. Click on the map to place a pin
2. Attempt to submit a report
3. User is redirected to login page

**Expected Result:**
- User is redirected to the login page

**Actual Result:**  
The user is redirected to the login page when attempting to submit a report.

**Status:** [PASS]

---

## TC-GUEST-006: Unregistered user cannot bypass authentication via direct URL

**Preconditions:**
- User is NOT logged in

**Steps:**
1. Manually enter the report submission URL
2. Press Enter

**Expected Result:**
- User is redirected to the login page
- Access to report submission is denied

**Actual Result:**  
The system redirects the user to the login page and prevents access to the submission form.

**Status:** [PASS]

---

**Testing Date:** 03/01/2026

**Browser(s):** Firefox

**Device(s):** Desktop  
