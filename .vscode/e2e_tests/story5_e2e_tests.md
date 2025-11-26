# E2E Test Cases - Citizen submission of reports

**User Story:** As a citizen I want to provide details for my report so that the the problem is classified correctly.

**Requirements:**
- The report should have the following mandatory fields: title, description, category
- The report should also have from 1 up to 3 photos included
- Reports can only be submitted with all of the mandatory fields filled and the correct number of photos, or the citizen can cancel and go back to the map

---

## TC-RPT-001: Submit report with missing Title

**Preconditions:**
- Logged in as a citizen

**Steps:**
1. Navigate to the report submission page
2. Leave the **Title** field empty
3. Fill in all other mandatory fields
4. Attempt to submit the report

**Expected Result:**
- Pop-up appears indicating: "Please fill the 'Title' field"
- Report is not submitted

**Actual Result:** A pop-up appears indicating the 'Title' field needs to be filled
**Status:** [PASS]    

---

## TC-RPT-002: Submit report with missing Report Type

**Preconditions:**
- Logged in as a citizen

**Steps:**
1. Navigate to the report submission page
2. Leave the **Report Type** field unselected
3. Fill in all other mandatory fields
4. Attempt to submit the report

**Expected Result:**
- Pop-up appears indicating: "Please select an item in the list"
- Report is not submitted

**Actual Result:** Pop-up appears indicating: "Please select an item in the list"
**Status:** [PASS]  

---

## TC-RPT-003: Submit report with missing Description

**Preconditions:**
- Logged in as a citizen

**Steps:**
1. Navigate to the report submission page
2. Leave the **Description** field empty
3. Fill in all other mandatory fields
4. Attempt to submit the report

**Expected Result:**
- Pop-up appears indicating: "Please fill the 'Description' field"
- Report is not submitted

**Actual Result:** Pop-up appears indicating: "Please fill the 'Description' field"  
**Status:** [PASS]   

---

## TC-RPT-004: Submit report with more than 3 images

**Preconditions:**
- Logged in as a citizen

**Steps:**
1. Navigate to the report submission page
2. Fill all mandatory fields
3. Upload 4 or more images
4. Attempt to submit the report

**Expected Result:**
- Pop-up appears indicating: "You can only upload a maximum of 3 images"
- Report is not submitted

**Actual Result:** Pop-up appears indicating: "You can only upload a maximum of 3 images"
**Status:** [PASS]  

---

## TC-RPT-005: Submit report with no images

**Preconditions:**
- Logged in as a citizen

**Steps:**
1. Navigate to the report submission page
2. Fill all mandatory fields except images
3. Attempt to submit the report

**Expected Result:**
- Submit button is blocked
- Text message appears indicating: "At least one image is required"
- Report is not submitted

**Actual Result:** I cannot submit the report because the submit button is not active, and there is a text indicatig to insert at least one image
**Status:** [PASS]  

---

## TC-RPT-006: Cancel report submission

**Preconditions:**
- Logged in as a citizen

**Steps:**
1. Navigate to the report submission page
2. Click on the cancel button

**Expected Result:**
- I am redirected to the map page
- Report is not submitted

**Actual Result:** I am redirected to the map page
**Status:** [PASS]  
**Notes:** [The selected location is still pinpointed on the map, but the report is not submitted]  

---

**Testing Date:** 12/11/25

**Browser(s):** Firefox

**Device(s):** Desktop
