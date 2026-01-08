# E2E Test Cases – Admin Role Management for Municipality Users

## User Story
As a system administrator I want to modify roles to municipality users so that the staff can be more flexible. 

## Requirements
- Admin can create municipality users with one or multiple roles
- Admin can add and delete roles from an existing user
- Admin can remove all roles from a user
- Admin can add roles to a user who currently has no roles
- Reports tied to previous roles remain visible under a dedicated “Old Reports” section
- Assignable reports update immediately based on current roles
- Reports related to removed roles are no longer assignable

---

## TC-ADMIN-ROLE-001: Admin creates a municipality user with a single role

### Preconditions
- Admin is logged in
- Admin has access to the Operator Management panel

### Steps
1. Navigate to Operator Management
2. Click “Create Municipal User”
3. Enter valid municipality user details
4. Assign exactly one role
5. Save the user

### Expected Result
- User is successfully created
- Assigned role is visible in the user profile
- User has access only to reports related to the assigned role

### Actual Result
The municipality user is created successfully with one role and has access only to reports relevant to that role.

**Status:** [PASS]

---

## TC-ADMIN-ROLE-002: Admin creates a municipality user with multiple roles

### Preconditions
- Admin is logged in
- Admin has access to the Operator Management panel

### Steps
1. Navigate to Operator Management
2. Click “Create Municipality User”
3. Enter valid municipality user details
4. Assign two or more roles
5. Save the user

### Expected Result
- User is successfully created
- All assigned roles are visible in the user profile
- User can be assigned to reports from all roles that he has

### Actual Result
The municipality user is created with multiple roles and has access to reports associated with each role.

**Status:** [PASS]

---

## TC-ADMIN-ROLE-003: Admin adds a new role to an existing municipality user

### Preconditions
- Admin is logged in
- Municipality user exists with at least one role

### Steps
1. Navigate to Operator Management
2. Select an existing municipality user
3. Click “Edit”
4. Add a new role
5. Save changes

### Expected Result
- New role is added successfully
- User immediately can be assigned to reports belonging to the new role

### Actual Result
The role is added successfully and reports related to the new role are available for assignment.

**Status:** [PASS]

---

## TC-ADMIN-ROLE-004: Admin deletes a role from a municipality user

### Preconditions
- Admin is logged in
- Municipality user exists with multiple roles

### Steps
1. Navigate to Operator Management
2. Select a municipality user
3. Click “Edit”
4. Remove one role
5. Save changes

### Expected Result
- Role is removed successfully
- User is no longer assignable to reports belonging to the removed role
- Reports from the removed role move to a “Old Reports” section

### Actual Result
The role is removed, assignable reports update correctly, and old reports appear under the historical section.

**Status:** [PASS]

---

## TC-ADMIN-ROLE-005: Admin deletes all roles from a municipality user

### Preconditions
- Admin is logged in
- Municipality user exists with one or more roles

### Steps
1. Navigate to Operator Management
2. Select a municipality user
3. Remove all assigned roles
4. Save changes

### Expected Result
- User has Organization Role
- User is treated as Participium organization member

### Actual Result
All roles are removed successfully, reports can't be assigned anymore to the user

**Status:** [PASS]

---

## TC-ADMIN-ROLE-006: Admin adds a role to a municipality user with zero roles

### Preconditions
- Admin is logged in
- Municipality user exists with no assigned roles

### Steps
1. Navigate to Operator Management
2. Select the municipality user
3. Add a single role
4. Save changes

### Expected Result
- Role is successfully assigned
- User regains access to assignable reports related to the new role
- No access to reports from previously removed roles unless reassigned

### Actual Result
The role is added successfully and only reports related to the new role are assignable.

**Status:** [PASS]

---

## TC-ADMIN-ROLE-007: Old reports from removed roles are visible under a new section

### Preconditions
- Municipality user previously had a role that was removed
- User has historical reports linked to the old role

### Steps
1. Log in as the municipality user
2. Navigate to the reports dashboard
3. Locate the “Old Reports” section

### Expected Result
- Reports associated with removed roles are visible under a new tab


### Actual Result
Old reports are visible under a dedicated section.

**Status:** [PASS]

---

## TC-ADMIN-ROLE-008: Assignable reports reflect newly added role

### Preconditions
- Municipality user has a newly added role
- Reports exist that match the new role

### Steps
1. Log in as the municipality user
2. Navigate to the assignable reports view

### Expected Result
- Reports related to the new role are visible and assignable
- No reports from removed roles appear in the assignable list

### Actual Result
Assignable reports correctly reflect the user’s new role.

**Status:** [PASS]

---

## TC-ADMIN-ROLE-009: Reports from removed roles cannot be assigned

### Preconditions
- Municipality user previously had a role that has been removed
- Reports exist related to the removed role

### Steps
1. Log in as the municipality user
2. Navigate to the assignable reports section
3. Attempt to assign a report of the old role to the user 

### Expected Result
- Reports related to the removed role are not assignable


### Actual Result
Reports related to the old role are not available for assignment.

**Status:** [PASS]

---

## Test Metadata

- **Testing Date:** 06/01/2026  
- **Browser(s):** Firefox  
- **Device(s):** Desktop  
