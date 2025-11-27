# E2E Test Cases - Report Review and Approval

**User story:** As a municipal public relations officer
I want to review and approve or reject reports 
So that only valid reports are processed further.

**Requirements:**
- Rejected reports must include an explanation

---

## TC-REV-001: Display list of reports

**Preconditions:**
- User authenticated as "municipal public relations officer"
- At least 2 reports with status "Pending" exist in DB
- Reports have different categories

**Steps:**
1. Login as municipal public relations officer
2. Verify the list of reports

**Expected Result:**
- List shows all reports 
- For each report visible:
  - Report title
  - Creation date
  - Status
- Reports sorted by date (most recent first)

**Actual Result:** All the reports are present on the list with the expected info

**Status:** [PASS]

---

## TC-REV-002: Approve a report

**Preconditions:**
- User authenticated as "municipal public relations officer"
- Report with status "Pending" exists in DB 

**Steps:**
1. Navigate reports list
2. Click on report to view detail and accept/reject report
3. Assign it to a technical officer
4. Approve report

**Expected Result:**
- Report status updated to "Approved" 

**Actual Result:** Report status changed to "Approved"

**Status:** [PASS]

---

## TC-REV-003: Reject a report with reason

**Preconditions:**
- User authenticated as "municipal public relations officer"
- Report with status "Pending" exists in DB 

**Steps:**
1. Navigate reports list
2. Click on report to view detail and accept/reject report
3. Click "Reject Report" button
4. Enter rejection reason in text field 
5. Confirm rejection

**Expected Result:**
- Form to enter reason appears
- Report status updated to "Rejected"
- Reason saved and associated with report

**Actual Result:** Form appears, report updated to "Rejected" with rejection reason

**Status:** [PASS]

---

## TC-REV-004: View report details before approve/reject

**Preconditions:**
- User authenticated as "municipal public relations officer"
- Report with status "Pending" exists in DB with photos and full description

**Steps:**
1. Navigate reports list
2. Click on report
3. Examine all report details

**Expected Result:**
- Detail page shows:
    - Status
    - Full title
    - Detailed description
    - Creation date and time
    - Coordinates
    - Reporter name
    - Category
    - All attached photos (viewable at full size)
- "Approve Report" and "Reject Report" buttons visible in detail view

**Actual Result:** Detail page shows all the expected info

**Status:** [PASS]

---

## TC-REV-005: Attempt to reject without reason

**Preconditions:**
- User authenticated as "municipal public relations officer"
- Report with status "Pending" exists in DB

**Steps:**
1. Navigate reports list
2. Click on a report to open the detail page
3. Click "Reject" button 
4. Leave reason field empty
5. Attempt to confirm rejection

**Expected Result:**
- System prevents rejection
- Button "Submit" not clickable
- Report remains in "Pending" status

**Actual Result:** Not possible to reject with rejection reason empty

**Status:** [PASS]

---

## TC-REV-06: View details of assigned report (read-only)

**Preconditions:**
- User authenticated as "municipal public relations officer"
- Report with status "Assigned" exists in DB 

**Steps:**
1. Navigate Reports list
2. Click on the assigned report
3. Examine all report details
4. Verify action buttons availability

**Expected Result:**
- Detail page shows all report information:
    - Status: "Assigned"
    - Title
    - Description
    - Creation date
    - Coordinates
    - Reporter name
    - Category
    - Photos
- "Approve" and "Reject" buttons NOT visible
- No edit functionality available

**Actual Result:** The page shows all the infos, buttons are not visible and there is no edit funcionality

**Status:** [PASS]

---

## TC-REV-07: View details of rejected report (read-only)

**Preconditions:**
- User authenticated as "municipal public relations officer"
- Report with status "Rejected" exists in DB 

**Steps:**
1. Navigate Reports list
2. Click on the rejected report
3. Examine all report details including rejection reason
4. Verify action buttons availability

**Expected Result:**
- Detail page shows all report information:
    - Status: "Rejected"
    - Rejection reason
    - Title
    - Description
    - Creation date
    - Coordinates
    - Reporter name
    - Category
    - Photos
- "Approve" and "Reject" buttons NOT visible or disabled
- No ability to change rejection reason or status

**Actual Result:** Detail page shows all the expected infos, buttons are not visible and there is no possibility to change rejection reason or status

**Status:** [PASS]


**Testing Date:** 26/11/25

**Browser(s):** Google Chrome

**Device(s):** Desktop