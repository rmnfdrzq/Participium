# E2E Test Cases - Interactive Map with Approved Reports

**User Story:** As a citizen, I want to see approved reports on an interactive map so that I can know about issues in my area and beyond.

**Requirements:**
- Map should be zoomable
- When zooming out, reports can be grouped into cumulative reports (clustering)
- When zooming in, reports are shown separated with title and reporter name

---

## TC-MAP-001: Report with Pending Approval status not visible

**Preconditions:**
- Login as Citizen
- 1 report with status "Pending Approval" exists in DB
- 1 report with status "Assigned" exists in DB

**Steps:**
1. Navigate to public map
2. Search for the just-created report on the map

**Expected Result:**
- "Pending Approval" report does NOT appear on map
- Only "Assigned" report is visible

**Actual Result:** Only the assigned report is shown on the map

**Status:** [PASS]

---

## TC-MAP-002: Assigned report visible on map

**Preconditions:**
- Login as Citizen
- Report with status "Assigned" exists in DB 

**Steps:**
1. Navigate to map
2. Zoom to report area
3. Click on report marker

**Expected Result:**
- Marker visible at correct position
- Popup shows:
  - Report title
  - Category
  - Status: "Assigned"
- Report photos visible

**Actual Result:** The report pin is visible on the map

**Status:** [PASS]


---

## TC-MAP-003: In Progress report visible on map

**Preconditions:**
- Login as Citizen
- Report with status "Assigned" exists in DB

**Steps:**
1. Login as Citizen
4. Navigate to public map

**Expected Result:**
- "In Progress" report visible on map
- Marker shows updated status

**Actual Result:** The report pin is visible on the map

**Status:** [PASS]

---

## TC-MAP-004: Suspended report visible on map

**Preconditions:**
- Login as Citizen
- Report with status "Suspended" exists in DB

**Steps:**
1. Navigate to public map

**Expected Result:**
- "Suspended" report visible on map
- Popup shows status: "Suspended"

**Actual Result:** The report pin is visible on the map

**Status:** [PASS]


---

## TC-MAP-005: Rejected report not visible

**Preconditions:**
- Login as Citizen
- Report with status "Rejected" exists in DB

**Steps:**
1. Navigate to map

**Expected Result:**
- "Rejected" report does NOT appear on map

**Actual Result:** The report pin is not visible on the map

**Status:** [PASS]


---

## TC-MAP-006: Resolved report not visible

**Preconditions:**
- Login as Citizen
- Report with status "Resolved" exists in DB

**Steps:**
1. Navigate to map

**Expected Result:**
- "Resolved" report does NOT appear on map

**Actual Result:** The report pin is not visible on the map

**Status:** [PASS] 



---

## TC-MAP-007: Zoom in - Separate reports visible

**Preconditions:**
- Login as Citizen
- At least 3 approved reports in nearby areas of Turin exist in DB
- Reports form a cluster on the map

**Steps:**
1. Navigate to map
2. Zoom in on an area with multiple nearby reports
3. Increase zoom to maximum level

**Expected Result:**
- Each report has its own individual marker
- Markers not overlapping
- Each clickable marker shows title 

**Actual Result:** When zooming in, the cluster splits into the individual reports that compose it

**Status:** [PASS]

**Notes:** [observations]

---

## TC-MAP-08: Zoom out - Clustered reports

**Preconditions:**
- Login as Citizen
- At least 3 approved reports in nearby areas of Turin exist in DB

**Steps:**
1. Navigate to map
2. Zoom out to see all of Turin
3. Observe markers

**Expected Result:**
- Nearby reports grouped in clusters
- Cluster shows total number of reports (e.g., "3")
- Clicking cluster zooms in to show individual reports

**Actual Result:** When zooming out, clusters are formed from nearby reports

**Status:** [PASS]

**Notes:** [observations]

---

## TC-MAP-09: Popup shows complete report data

**Preconditions:**
- Login as Citizen
- Report with title, description, photo, category exists

**Steps:**
1. Navigate to map
2. Click on a report marker (the pin on the map)
3. A popup appears with report summary and a "Details" button
4. Click the "Details" button

**Expected Result:**
- Popup contains all report fields

**Actual Result:** The popup displays all report fields including the photo

**Status:** [PASS]


---

**Testing Date:** 26/11/25

**Browser(s):** Edge

**Device(s):** Desktop