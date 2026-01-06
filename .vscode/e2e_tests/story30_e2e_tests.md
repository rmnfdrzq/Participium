# E2E Test Cases – Search Bar Functionality for Unregistered User

## User Story
As a citizen/unregistered user I want to search for reports in a specific area by typing in an address so that I can easily explore and analyze existing reports in that specific area

## Requirements
- Unregistered users can use the map search bar
- Valid addresses within city boundaries zoom the map and allow pin placement
- Invalid addresses return an error message
- Addresses outside city boundaries are blocked with a clear message
- No unintended map movement occurs for invalid searches

---

## TC-GUEST-SEARCH-001: Unregistered user searches for a valid address within city boundaries

### Preconditions
- User is NOT logged in
- Search bar is visible on the main page
- Address exists within supported city boundaries

### Steps
1. Open the application main URL
2. Click on the search bar
3. Enter a valid address within city boundaries
4. Submit the search

### Expected Result
- Map zooms to the searched address
- Map pans smoothly to the location
- A pin is placed on the map at the searched address
- Standard report submission flow is initiated and “Submit Report” button is shown

### Actual Result
The map zooms and pans to the searched address, a pin is placed, and the report submission flow is displayed.

**Status:** [PASS]

---

## TC-GUEST-SEARCH-002: Unregistered user searches for an invalid address

### Preconditions
- User is NOT logged in
- Search bar is visible on the main page

### Steps
1. Open the application main URL
2. Click on the search bar
3. Enter an invalid or non-existent address
4. Submit the search

### Expected Result
- Error message appears stating the address could not be found
- No pin is placed on the map
- Map does NOT zoom, pan, or change camera position

### Actual Result
An error message is displayed indicating the address could not be found, no pin appears, and the map remains unchanged.

**Status:** [PASS]
---

## TC-GUEST-SEARCH-003: Unregistered user searches for a valid address outside city boundaries

### Preconditions
- User is NOT logged in
- Search bar is visible on the main page
- Address exists but is outside supported city boundaries

### Steps
1. Open the application main URL
2. Click on the search bar
3. Enter a valid address outside the city boundaries
4. Submit the search

### Expected Result
- Message appears stating the address is outside city boundaries
- No pin is placed on the map
- Map does NOT zoom or pan to the searched location

### Actual Result
The system displays an out-of-boundaries message, no pin is shown, and the map view remains unchanged.

**Status:** [PASS]

---

## TC-GUEST-SEARCH-004: Unregistered user attempts report submission after searching a valid address

### Preconditions
- User is NOT logged in
- Valid address within city boundaries has been searched
- Pin is visible on the map

### Steps
1. Search for a valid address within city boundaries
2. Click on “Submit Report”
3. Observe system behavior

### Expected Result
- User is redirected to the login page
- Report submission is not allowed without authentication

### Actual Result
The user is redirected to the login page when attempting to submit a report.

**Status:** [PASS]

---

## Test Metadata

- **Testing Date:** 04/01/2026  
- **Browser(s):** Firefox  
- **Device(s):** Desktop  
