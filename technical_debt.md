# Technical Debt Management

## Code Quality Checks Within The Sprint Activities

* To maintain high code quality, we will use SonarQube Server's integration with GitHub, incorporating the analysis process into our pipeline. SonarScanners running on GitHub Actions will automatically monitor the main and dev branches. Analysis will be performed every time changes are introduced into these branches.

* Team members will review SonarQube results for each PR and decide how to act (e.g., fix immediately, create a Technical Debt task, or accept the issue with justification).

## Flow of Paying Back Technical Debt

### Priorities

* The decision to address technical debt will depend on **impact** and **effort** required for resolution:

  1. **Impact** – The degree to which the issue affects system stability, performance, maintainability, or user experience.
  2. **Effort** – The estimated amount of work required to resolve the issue.

* Issues with **high impact and low effort** will be prioritized, as they provide the greatest return on investment in the shortest time. This approach reduces the most critical technical risks early while ensuring efficient use of development resources.

* Remaining issues will be addressed later based on available time and emerging priorities.

### Workflow

* Technical Debt items will be identified through automated detection and evaluated by the team according to the defined priority criteria.

* During each sprint planning, time will be allocated to address Technical Debt .

* A dedicated tasks such as 'Code review' and 'Code refactoring' will be created to track and manage identified items.

### Internal Organisation

* Technical Debt issues will be resolved by the original implementers.

* The Technical Debt management strategy will be reviewed at every retrospective.

* If the original implementer is unavailable, the task will be reassigned to another team member familiar with the relevant code area.


