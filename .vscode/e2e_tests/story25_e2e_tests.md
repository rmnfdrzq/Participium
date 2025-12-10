# E2E Test Cases - External Maintainer Status Updates

**User Story:** As an external maintainer
I want to update the status of a report assigned to me
So that I can updated citizens about the intervention.

## TC-EXT-001: External maintainer login and dashboard access

**Preconditions:**
- External maintainer account exists
- At least 1 report assigned to this external maintainer

**Steps:**
1. Navigate to login page
2. Login with external maintainer credentials
3. Navigate "My assigned reports" page

**Expected Result:**
- Login successful
- Dashboard shows reports assigned to this external maintainers
- Navigation limited to relevant sections (no access to all reports or approval functions)

**Actual Result:** Everything is shown correctly

**Status:** [PASS]

---

## TC-EXT-002: View assigned report full details

**Preconditions:**
- User authenticated as external maintainer
- Report assigned 

**Steps:**
1. Navigate assigned reports section
2. Click on report 
3. Review all report details
4. Identify available actions

**Expected Result:**
- Detail page shows complete information:
  - Current status: "Assigned"
  - Full title and description
  - Creation date
  - Address and coordinates
  - Reporter name 
  - Category 
  - All attached photos (viewable full size)
- Available actions:
  - "Update Status" buttons
  - "View comments" button
  - "Back" button

**Actual Result:** All information and buttons are displayed correctly 

**Status:** [PASS]

---

## TC-EXT-003: Update status from "Assigned" to "In Progress"

**Preconditions:**
- User authenticated as external maintainer
- Report with status "Assigned" exists

**Steps:**
1. Open report details
2. Click "Mark as In progress" button
3. Confirm status update
4. Verify update confirmation

**Expected Result:**
- Status successfully updated to "In Progress"
- Status badge updated in list view

**Actual Result:** Everything is correct as expected

**Status:** [PASS]

---

## TC-EXT-004: Update status from "In Progress" to "Resolved"

**Preconditions:**
- User authenticated as external maintainer
- Report with status "In Progress" exists 

**Steps:**
1. Open report details
2. Click "Mark as Resolved" button
3. Confirm status update
4. Verify completion

**Expected Result:**
- Status successfully updated to "Resolved"
- Status badge updated in list view
- Report no longer editable by external maintainer (locked status)

**Actual Result:** Report marked as "resolved" correctly, the maintainer cannot modify it 

**Status:** [PASS]

---

## TC-EXT-005: Update status to "Suspended"

**Preconditions:**
- User authenticated as external maintainer
- Report with status "In Progress" or "Assigned" exists 

**Steps:**
1. Open report details
2. Click "Mark as Suspended" button
3. Confirm status update
4. Verify status update

**Expected Result:**
- Status updated to "Suspended"
- Status badge updated in list view
- Can resume work by changing status back to "In Progress"

**Actual Result:** Report suspended succesfully and resumed by clicking on "Mark as In progress"

**Status:** [PASS]

---

## TC-EXT-006: Filter assigned reports by status

**Preconditions:**
- User authenticated as external maintainer
- Reports assigned: 1 "Assigned", 1 "In Progress", 1 "Suspended", 1 "Resolved"

**Steps:**
1. Navigate assigned reports section
2. Apply filter: "In Progress" only
3. Verify filtered results show 1 report
4. Apply filter: "Resolved" only
5. Verify filtered results show 1 report
6. Apply filter: "Assigned" only
7. Verify filtered results show 1 report
8. Apply filter: "Suspended" only
9. Verify filtered results show 1 report
10. Apply filter "Default (All)" to show all

**Expected Result:**
- Filter works correctly for each status
- With "In Progress" filter: only 1 report visible
- With "Resolved" filter: only 1 report visible
- With "Assigned" filter: only 1 report visible
- With "Suspended" filter: only 1 report visible
- With "All" filter: all 4 reports visible
- Reports maintain correct status badges

**Actual Result:** Filter works correctly, everything is shown in the right way

**Status:** [PASS]

---

## TC-EXT-007: Access control - Cannot access reports assigned to other maintainers

**Preconditions:**
- User authenticated as external maintainer 
- Reports exist assigned to different maintainer 

**Steps:**
1. Navigate "My assigned reports" section
2. Verify only own reports visible

**Expected Result:**
- Dashboard shows only reports assigned to the maintainer logged
- Reports from another maintainer not visible in the list
- No data leakage between maintainers

**Actual Result:** External maintainer cannot see reports assigned to others

**Status:** [PASS]

**Notes:** [observations]

---

## TC-EXT-008: Access control - Cannot reassign reports

**Preconditions:**
- User authenticated as external maintainer
- Report assigned to this maintainer exists

**Steps:**
1. Open report details
2. Look for reassignment or transfer functionality
3. Verify available actions

**Expected Result:**
- No "Reassign" or "Transfer" button visible
- Cannot change report assignment
- Only status update and comment button available
- Must contact technical office for reassignment

**Actual Result:** External maintainers can not reassign reports

**Status:** [PASS]

---

## TC-EXT-009: Mobile responsive interface for field work

**Preconditions:**
- User authenticated as external maintainer on mobile device
- Screen size: 375x667 (iPhone SE) or similar
- Report with status "Assigned" exists

**Steps:**
1. Login on mobile device
2. Navigate assigned reports section
3. Open report details
4. Update status to "In Progress"
5. Confirm status update
6. Verify status change

**Expected Result:**
- Interface fully responsive and mobile-friendly
- All functions accessible on small screen
- Buttons properly sized for touch 
- Forms easy to fill on mobile

**Actual Result:** Everything works an a mobile 

**Status:** [PASS]

---

**Testing Date:** 10/12/25

**Browser(s):** Google Chrome

**Device(s):** Desktop