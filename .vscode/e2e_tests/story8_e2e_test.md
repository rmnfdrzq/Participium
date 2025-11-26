# E2E Test Cases – Technical Officer Report List & Inspection

**User Story:**  As a technical office staff member I want to see the list of reports assigned to me so that I can get an overview of the maintenance to be done

**Requirements:**  
- User must be logged in as a **Technical Officer**  
- The list shows only the reports **assigned** to the technical officer  
- The following **statuses must be visible**:  
  - **Resolved**  
  - **Suspended**  
  - **In Progress**  
  - **Assigned**  
- The following statuses **must NOT be visible**:  
  - **Rejected**  
  - **Pending**  
- Technical officer can select a report to view its details
- A **Back** button allows returning to the list  

---

## TC-TRO-001: View assigned reports with status “Resolved”

**Preconditions:**
- Logged in as a **technical officer**
- At least one report with status **Resolved** assigned to the logged-in user

**Steps:**
1. Navigate to the “My Reports” page  
2. Look at the list of reports  

**Expected Result:**
- Reports with status **Resolved** are displayed in the list  
- Only reports assigned to the user are shown  

**Actual Result:**  Report is shown correctly in the page
**Status:** [PASS]

---

## TC-TRO-002: View assigned reports with status “Suspended”

**Preconditions:**
- Logged in as a **technical officer**
- At least one assigned report with status **Suspended**

**Steps:**
1. Navigate to the “My Reports” page  
2. Look at the list of reports  

**Expected Result:**
- Reports with status **Suspended** are displayed  
- Only reports assigned to the user appear  

**Actual Result:**  Reports are shown in the page
**Status:** [PASS]

---

## TC-TRO-003: View assigned reports with status “In Progress”

**Preconditions:**
- Logged in as a **technical officer**
- At least one assigned report with status **In Progress**

**Steps:**
1. Navigate to the “My Reports” page  
2. Review the list  

**Expected Result:**
- Reports with **In Progress** status appear in the list  

**Actual Result:**  Reports are shown in the page
**Status:** [PASS]

---

## TC-TRO-004: View assigned reports with status “Assigned”

**Preconditions:**
- Logged in as a **technical officer**
- At least one report with status **Assigned**

**Steps:**
1. Navigate to the “My Reports” page  

**Expected Result:**
- Reports with status **Assigned** are displayed  

**Actual Result:**  Reports are shown in the page
**Status:** [PASS]

---

## TC-TRO-005: Reports with status “Rejected” do NOT appear

**Preconditions:**
- Logged in as a **technical officer**
- At least one report assigned to the user has status **Rejected**

**Steps:**
1. Navigate to the “My Reports” page  

**Expected Result:**
- Reports with status **Rejected** are **not visible** in the list  

**Actual Result:**  Reports are not shown in the page
**Status:** [PASS]

---

## TC-TRO-006: Reports with status “Pending” do NOT appear

**Preconditions:**
- Logged in as a **technical officer**
- At least one report assigned to the user has status **Pending**

**Steps:**
1. Navigate to the “My Reports” page  

**Expected Result:**
- Reports with status **Pending** are **not visible** in the list  

**Actual Result:**  Reports are not shown in the page
**Status:** [PASS]

---

## TC-TRO-007: Open a report to inspect details

**Preconditions:**
- Logged in as a **technical officer**
- At least one report assigned to the user

**Steps:**
1. Navigate to “My Reports”  
2. Click on a report entry  

**Expected Result:**
- The system opens the **Inspect Report** view  
- All details of the selected report are visible  

**Actual Result:** The inspect report page is opened
**Status:** [PASS]

---

## TC-TRO-008: Use Back button to return to the report list

**Preconditions:**
- Logged in as a **technical officer**
- Currently viewing **Report Details** of a selected report

**Steps:**
1. Click on the **Back** button  

**Expected Result:**
- User is returned to the assigned report list  

**Actual Result:**  I am sent back to the assigned report 
**Status:** [PASS]

