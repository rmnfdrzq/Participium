# E2E Test Cases - Technical Office Assignment to External Maintainers

**User Story:** As a technical office staff member
I want to assign reports to external maintainers
So that specialized maintainers can handle and update the intervention.

## TC-TECH-001: Technical office login and report list access

**Preconditions:**
- Choose a technical office account (credential example: "tec_accessibility","participium" )
- At least 1 report exists with status "Assigned", done previously by a relation officer account (for example : "off_organization")

**Steps:**
1. Navigate to login page
2. Login with the given credentials : "tec_accessibility","participium"
3. Verify redirect to reports list page
4. Try to see every one of the different filtered visualization of the reports

**Expected Result:**
- Login successful
- Reports list page displays correctly
- Reports with status "Assigned" are visible
- Each report shows: ID,	Title,	Created At,	Status and it is possible to filter the reports by status

**Actual Result:**  The reports are visualized correctly

**Status:** [PASS]

---

## TC-TECH-002: Navigate to report inspection page

**Preconditions:**
- User authenticated as a technical office account (credential example: "tec_accessibility","participium" )
- At least 1 report exists with status "Assigned", done previously by a relation officer account (for example : "off_organization")

**Steps:**
1. From reports list page
2. Click on first report in the list
3. Verify navigation to inspect report page

**Expected Result:**
- Successfully redirected to inspect report page
- URL contains report ID
- Page loads without errors 

**Actual Result:** The page doesn't print any errors on console browser

**Status:** [PASS]

---

## TC-TECH-003: View report details before assignment

**Preconditions:**
- User authenticated as a technical office account (credential example: "tec_accessibility","participium" )
- At least 1 report exists with status "Assigned", done previously by a relation officer account (for example : "off_organization")
- On inspect report page for unassigned report

**Steps:**
1. Review all visible report information
2. Identify all available buttons and controls
3. Check assignment dropdown menu state

**Expected Result:**
- Complete report information displayed:
  - Title
  - Description
  - Status badge: "Assigned"
  - Creation date
  - Category
  - Office
  - Address 
  - Coordinates
  - Citizen
  - Creation date
  - All attached photos
- Assignment dropdown menu visible with list of external maintainers (not empty)
- "Assign Maintainer" button visible
- "View comments" button visible but DISABLED
- "Back" button visible and enabled

**Actual Result:** The page is visualized correctly.

**Status:** [PASS]

---

## TC-TECH-004: Assign report to external maintainer

**Preconditions:**
- User authenticated as a technical office account (credential example: "tec_accessibility","participium" )
- At least 1 report exists with status "Assigned", done previously by a relation officer account (for example : "off_organization")
- On inspect report page for unassigned report
- External maintainer accounts exist for that office_id

**Steps:**
1. Click on assignment dropdown menu
2. Select an external maintainer from the list
3. Click "Assign Maintainer" button
4. Redirected to the page with the list of the reports
5. Click again on the same report 
6. Verify assignment confirmation in the field named "Assigned Maintainer"

**Expected Result:**
- Dropdown displays list of available external maintainers
- Selected first maintainer in dropdown
- After clicking "Assign Maintainer":
  - Question for confirmation displayed and redirected on the previeous page
- Situation updated on the report page: 
  - "View comments" button becomes ENABLED
  - Assignment information shows selected external maintainer

**Actual Result:** The page function as expected

**Status:** [PASS]

---

## TC-TECH-005: View comments button state - Before assignment

**Preconditions:**
- User authenticated as a technical office account (credential example: "tec_accessibility","participium" )
- At least 1 report exists with status "Assigned", done previously by a relation officer account (for example : "off_organization")
- On inspect report page for unassigned report

**Steps:**
1. Locate "View comments" button
2. Verify button state
3. Attempt to click button

**Expected Result:**
- "View comments" button is DISABLED (grayed out or visually inactive)
- Button cannot be clicked
- No comments interface accessible

**Actual Result:** The button is not clickable

**Status:** [PASS]

---

## TC-TECH-006: View comments button state - After assignment

**Preconditions:**
- User authenticated as a technical office account (credential example: "tec_accessibility","participium" )
- At least 1 report exists with status "Assigned", done previously by a relation officer account (for example : "off_organization")
- On inspect report page of a report successfully assigned to external maintainer

**Steps:**
1. Verify "View comments" button state after assignment
2. Click "View comments" button
3. Verify the redirection on comments page

**Expected Result:**
- "View comments" button becomes ENABLED after assignment
- Button is clickable
- Clicking opens internal comments page
- Can view and add internal comments

**Actual Result:** The button is now clickable and does a redirection to the report comments page

**Status:** [PASS]

---

## TC-TECH-007: Back button navigation

**Preconditions:**
- User authenticated as a technical office account (credential example: "tec_accessibility","participium" )
- At least 1 report exists with status "Assigned", done previously by a relation officer account (for example : "off_organization")
- On inspect report page

**Steps:**
1. Click "Back" button
2. Verify navigation

**Expected Result:**
- Successfully navigated back to reports list page
- Previous list state preserved (filters, sorting)
- No data loss

**Actual Result:** The redirection works as expected

**Status:** [PASS]

---


