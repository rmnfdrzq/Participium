# E2E Test Cases - Citizen Account Configuration

**User story:** As a citizen 
I want to configure my account
So that I can better manage notifications and my virtual presence.

## TC-ACC-001: Access account configuration panel

**Preconditions:**
- User authenticated as "citizen"
- User has active account 

**Steps:**
1. Login as citizen
2. Navigate to user profile settings
3. Verify available configuration options

**Expected Result:**
- Configuration panel accessible from user menu
- Panel displays current user information
- Configuration options visible:
  - Profile photo upload section
  - Telegram username field
  - Email notifications checkbox
- Current settings displayed correctly
- "Save" button visible

**Actual Result:** Everything is available as expected

**Status:** [PASS]

---

## TC-ACC-002: Upload profile photo (valid image)

**Preconditions:**
- User authenticated as "citizen"
- User currently has no profile photo
- Valid image file prepared

**Steps:**
1. Navigate to edit profile panel
2. Click profile photo to update
3. Select file from device
4. Confirm upload
5. Save changes
6. Navigate away and return

**Expected Result:**
- File selection dialog opens
- After selection, preview of uploaded photo appears
- Success message: "Avatar updated successfully"
- Photo saved and displayed in user profile

**Actual Result:** Avatar can be updated succefully and it appears in user menu across the apllication

**Status:** [PASS]

---

## TC-ACC-003: Upload profile photo (invalid file type)

**Preconditions:**
- User authenticated as "citizen"
- Invalid file prepared: document.pdf (not an image)

**Steps:**
1. Navigate to edit profile panel
2. Click on the photo to update it
3. Attempt to select document.pdf
4. Try to upload

**Expected Result:**
- System prevents upload of non-image file
- Error message: "Please select an image file"
- No changes made to current profile photo
- File selector may filter to show only image types
- User remains on configuration page

**Actual Result:** Not possible to change the profile photo with a pdf file, error shows correctly.The file selector filter to show only image types

**Status:** [PASS]

---

## TC-ACC-004: Add Telegram username

**Preconditions:**
- User authenticated as "citizen"
- User does not have Telegram username configured
- Valid Telegram username

**Steps:**
1. Navigate to edit profile panel
2. Locate "Telegram Username" field
3. Enter username in the field
4. Save changes
5. Verify saved username

**Expected Result:**
- Username accepted and saved
- Success message: "Change saved successfully"

**Actual Result:** Username saved successfuly in user page 

**Status:** [PASS]

---

## TC-ACC-005: Update existing Telegram username

**Preconditions:**
- User authenticated as "citizen"
- User has existing Telegram username

**Steps:**
1. Navigate to edit profile panel
2. Verify current username is displayed
3. Change username
4. Save changes
5. Refresh page

**Expected Result:**
- Username updated successfully
- Success message: "Change saved successfully"
- New username displayed in configuration
- Old username replaced
- Change reflected immediately in user profile

**Actual Result:** Username updated successfuly, old username not visible, change reflected immediately

**Status:** [PASS]

---

## TC-ACC-006: Disable email notifications

**Preconditions:**
- User authenticated as "citizen"
- Email notifications currently abled

**Steps:**
1. Navigate to edit profile panel
2. Locate "Email Notifications" checkbox
3. Verify current state is checked
4. Click checkbox to disable notifications
5. Save changes

**Expected Result:**
- Checkbox switches to disabled state
- Success message: "Changes saved successfuly"
- Setting saved in user preferences
- User can re-enable at any time

**Actual Result:** Email notifications disabled correctly, changes saved

**Status:** [PASS]

---

## TC-ACC-007: Enable email notifications

**Preconditions:**
- User authenticated as "citizen"
- Email notifications currently disabled

**Steps:**
1. Navigate to edit profile panel
2. Locate "Email Notifications" checkbox
3. Verify current state is disabled
4. Click checkbox to enable notifications
5. Save changes

**Expected Result:**
- Checkbox switches to enabled state
- Success message: "Changes saved successfuly"
- Setting saved in user preferences

**Actual Result:** email notifications enabled correctly, changes saved

**Status:** [PASS]

---

## TC-ACC-008: Update all configuration options simultaneously

**Preconditions:**
- User authenticated as "citizen"
- User has no profile photo, no Telegram username, notifications disabled

**Steps:**
1. Navigate to edit profile panel
2. Upload profile photo
3. Add Telegram username
4. Enable email notifications
5. Save all changes with "Save" button
6. Refresh page and verify all changes

**Expected Result:**
- All three changes saved successfully
- Success message: "Changes saved successfully"
- After refresh, configuration panel shows:
  - Uploaded profile photo displayed
  - Telegram username
  - Email notifications: enabled
- User profile complete and functional

**Actual Result:** everything works as expected

**Status:** [PASS]

---

## TC-ACC-009: Cancel configuration changes before saving

**Preconditions:**
- User authenticated as "citizen"
- User has existing configuration: telegram username, notifications enabled

**Steps:**
1. Navigate to edit profile panel
2. Change Telegram username
3. Disable email notifications
4. Click navigate away without saving
5. Return to configuration panel

**Expected Result:**
- Unsaved changes discarded
- Configuration reverts to previous state:
  - Telegram username
  - Email notifications: enabled
- User can make changes again

**Actual Result:** the changes are not saved if I don't click 'Save', user can make changes again

**Status:** [PASS]


**Testing Date:** 27/11/25

**Browser(s):** Google Chrome

**Device(s):** Desktop
