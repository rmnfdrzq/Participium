# E2E Test Cases – Anonymous Report Submission

**User Story:**  
As a citizen I want to choose whether to make my report anonymous so that my name is not shown in the public list of reports.

**Requirements:**  
- Citizen must be logged in to create a report
- User can select a location on the map
- User can choose to make the report anonymous via checkbox
- Anonymous reports do not display the citizen's username in public lists
- Non-anonymous reports display the citizen's username
- Organization office staff can approve reports
- Approved reports appear on the public map

---

## TC-ANON-001: Create anonymous report successfully

**Preconditions:**  
- User is logged in as a citizen
- User is on the map page

**Steps:**  
1. Click on a valid location on the map
2. Click **Create Report** button in the marker popup
3. Fill in the report form:
   - Title: "Test Anonymous Report"
   - Report Type: Select any category
   - Description: "This is a test anonymous report"
   - Upload 1-3 images
4. Check the **"Make this report anonymous"** checkbox
5. Click **Submit** button

**Expected Result:**  
- Report is created successfully
- Summary page shows "Anonymous: Yes"
- User is redirected to the report summary page

**Actual Result:** Report created with anonymous flag set to true  
**Status:** [PASS]

---

## TC-ANON-002: Create non-anonymous report successfully

**Preconditions:**  
- User is logged in as a citizen
- User is on the map page

**Steps:**  
1. Click on a location on the map
2. Click **Create Report** button in the marker popup
3. Fill in the report form:
   - Title: "Test Public Report"
   - Report Type: Select any category
   - Description: "This is a test public report"
   - Upload 1-3 images
4. Leave the **"Make this report anonymous"** checkbox **unchecked**
5. Click **Submit** button

**Expected Result:**  
- Report is created successfully
- Summary page shows "Anonymous: No"
- Summary page displays user information

**Actual Result:** Report created with anonymous flag set to false and user info displayed  
**Status:** [PASS]

---

## TC-ANON-003: Anonymous checkbox is visible and unchecked by default

**Preconditions:**  
- User is logged in as a citizen
- User has clicked on a map location and then on the create report button
- User is on the Insert Report page

**Steps:**  
1. Observe the form fields

**Expected Result:**  
- The checkbox "Make this report anonymous" is visible
- The checkbox is **unchecked** by default

**Actual Result:** Checkbox is visible and unchecked by default  
**Status:** [PASS]

---

## TC-ANON-004: Report summary displays anonymous status correctly

**Preconditions:**  
- User has just created a report (anonymous or not)
- User is on the report summary page

**Steps:**  
1. Review the "Report Details" section

**Expected Result:**  
- The summary shows "Anonymous: Yes" or "Anonymous: No" based on the checkbox selection
- If anonymous = No, user information section is displayed
- If anonymous = Yes, user information section is NOT displayed

**Actual Result:** Anonymous status and user info visibility are correct  
**Status:** [PASS]

---

## TC-ANON-005: Organization office can approve anonymous report

**Preconditions:**  
- A citizen has created an anonymous report
- User logs out from citizen account
- User logs in with organization office credentials:
  - Email: `off.org@participium.local`
  - Password: `participium`

**Steps:**  
1. Navigate to the pending reports list
2. Select the anonymous report created in TC-ANON-001
3. Review report details and check if it is anonymous
4. Approve the report

**Expected Result:**  
- Organization office user can view the report
- The report shows anonymous citizen username 
- The report can be approved successfully
- Report status changes to "Approved" or "Assigned"

**Actual Result:** Report is approved successfully by organization office  
**Status:** [PASS]

---

## TC-ANON-006: Approved anonymous report appears on public map without username

**Preconditions:**  
- An anonymous report has been approved by organization office
- User views the public map (no login required or logged in as any user)

**Steps:**  
1. Navigate to the home page and view the map
3. Locate the approved anonymous report marker
4. Click on the marker to view the popup
5. Click **Details** to view full report information

**Expected Result:**  
- The approved anonymous report is visible on the map
- The popup shows "Reported by: Anonymous" 
- The report details modal shows "Reported by: Anonymous"
- The citizen's actual username is NOT displayed anywhere in the public view

**Actual Result:** Anonymous report displays "Anonymous" instead of username  
**Status:** [PASS]

---

## TC-ANON-007: Approved non-anonymous report shows username on public map

**Preconditions:**  
- A non-anonymous report has been approved by organization office
- User views the public map

**Steps:**  
1. Navigate to the home page or map page
2. Locate the approved non-anonymous report marker
3. Click on the marker popup
4. Click **Details** to view full report

**Expected Result:**  
- The report popup shows "Reported by: [actual username]"
- The report details modal shows "Reported by: [actual username]"
- The citizen's username is clearly visible

**Actual Result:** Non-anonymous report displays the citizen's username  
**Status:** [PASS]

