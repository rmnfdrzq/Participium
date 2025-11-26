# E2E Test Cases - Map interactions for report submission

**User Story:** As a citizen I want to select a location on the city map so that my report is geolocated with latitude and longitude

**Requirements:**
- Map allows zooming in/out and panning (with some geographical limits)
- Citizens can select a point to submit a report
- Citizens can search for a location using the search bar
- Report submission should respect the location boundaries (e.g., cannot submit far outside Turin)

---

## TC-MAP-001: Zoom in on the map

**Preconditions:**
- Logged in as a citizen
- Map page is open

**Steps:**
1. Click the zoom-in button multiple times
2. Observe map behavior

**Expected Result:**
- Map zooms in incrementally
- User can see more details of the area
- Map does not exceed maximum zoom level

**Actual Result:** Map is zoomed in correctly until the maximum level is reached
**Status:** [PASS] 

---

## TC-MAP-002: Zoom out on the map

**Preconditions:**
- Logged in as a citizen
- Map page is open

**Steps:**
1. Click the zoom-out button multiple times
2. Observe map behavior

**Expected Result:**
- Map zooms out incrementally
- User can see a broader area around Turin
- Map does not exceed minimum zoom level

**Actual Result:** Map is zoomed out correctly 
**Status:** [PASS]

---

## TC-MAP-003: Pan/move the map within allowed boundaries

**Preconditions:**
- Logged in as a citizen
- Map page is open

**Steps:**
1. Click and drag the map in various directions
2. Try to move far outside the Turin boundaries

**Expected Result:**
- Map moves according to user drag
- Map restricts panning beyond set boundaries around Turin

**Actual Result:** Citizens are allowed to move the map around whitin the boundaries of the city of Turin
**Status:** [PASS] 

---

## TC-MAP-004: Select a point on the map within boundaries

**Preconditions:**
- Logged in as a citizen
- Map page is open

**Steps:**
1. Click a location inside Turin on the map
2. Initiate new report submission from this point

**Expected Result:**
- Selected location is registered correctly
- Report submission page redirect button opens with the location pre-filled

**Actual Result:** A button appears for citizens to submit a report, with the location already saved
**Status:** [PASS]

---

## TC-MAP-005: Attempt to select a point outside allowed boundaries

**Preconditions:**
- Logged in as a citizen
- Map page is open

**Steps:**
1. Try to click a location far outside Turin
2. Attempt to submit a report

**Expected Result:**
- Map prevents selecting a location outside allowed boundaries

**Actual Result:** No redirect button is showed on the map
**Status:** [PASS]  

---

## TC-MAP-006: Search for a location using the search bar

**Preconditions:**
- Logged in as a citizen
- Map page is open

**Steps:**
1. Enter a valid location name/address in the search bar
2. Select a search result

**Expected Result:**
- Map pans/zooms to the searched location
- Location appears with a button to submit a report

**Actual Result:** A pin appears on the map with the button to submit a report
**Status:** [PASS]

---

## TC-MAP-007: Search for a location outside Turin boundaries

**Preconditions:**
- Logged in as a citizen
- Map page is open

**Steps:**
1. Enter a location far outside Turin in the search bar
2. Attempt to select it for report submission

**Expected Result:**
- Map pans to the edge of the city but doesn't select the point outside of the boundaries
- No button is showed

**Actual Result:** The map moves to the boundary of the city but there is no button to submit invalid location
**Status:** [PASS] 


---

**Testing Date:** 12/11/25

**Browser(s):** Firefox

**Device(s):** Desktop
