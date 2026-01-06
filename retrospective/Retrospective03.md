RETROSPECTIVE (Team 01)
=====================================

The retrospective should include _at least_ the following
sections:

- [process measures](#process-measures)
- [quality measures](#quality-measures)
- [general assessment](#assessment)

## PROCESS MEASURES 

### Macro statistics

- Number of stories committed vs done 
  > 4 vs 4 (stories)
- Total points committed vs done 
  > 22 vs 22 (story points)
- Nr of hours planned vs spent (as a team) 
  > 95h 15m vs 91h 30m

**Remember**  a story is done ONLY if it fits the Definition of Done:
 
- Unit Tests passing
- Code review completed
- Code present on VCS
- End-to-End tests performed

> Please refine your DoD 

### Detailed statistics

| Story  | # Tasks | Points | Hours est. | Hours actual |
|--------|---------|--------|------------|--------------|
| _#0_  |   17      |    -   |      48h 15m      |    44h 5m          |
| 24    |    9     |   3   |     11h       |    11h          |
| 25    |    8     |    3    |    10h        |     10h         |
| 26    |    9     |    8    |    11h 45m        |      12h        |
| 27    |    10     |    8    |  14h 15m          |    14h 25m          |
   

- Hours per task average, standard deviation (estimate and actual)

|            | Mean | StDev |
|------------|------|-------|
| Estimation |  1.80  |  3.06    | 
| Actual     |  1.73 |  2.89   |

- Total estimation error ratio: sum of total hours spent / sum of total hours effort - 1 = **-3.96%**

    $$\frac{\sum_i spent_{task_i}}{\sum_i estimation_{task_i}} - 1$$
    
- Absolute relative task estimation error: sum( abs( spent-task-i / estimation-task-i - 1))/n = **6.92%**

    $$\frac{1}{n}\sum_i^n \left| \frac{spent_{task_i}}{estimation_task_i}-1 \right| $$

  
## QUALITY MEASURES 

- Unit Testing:
  - Total hours estimated
    > 4h 30m
  - Total hours spent
    > 4h 30m
  - Nr of automated test cases 
    > 138 tests (sum of those of this sprint and the previous one - without differentiating between unit and integration tests)
  - Coverage 
    > 93.5 % lines coverage (only related for the back-end)
- Integration testing:
  - Total hours estimated
    > 6h 45m
  - Total hours spent
    > 6h 45m
- E2E testing:
  - Total hours estimated
    > 3h 45m
  - Total hours spent
    > 3h 55m
  - Nr of test cases
    > 33 test cases (only counted those of the current sprint)
- Code review: 
  - Total hours estimated 
    > 18h
  - Total hours spent
    > 17h 45m
- Technical Debt management:
  - Strategy adopted
    > Highest severity, shortest time
  - Total hours estimated estimated at sprint planning
    > 2 h + (2 h refactoring)
  - Total hours spent
    > 2 h + (2 h refactoring)

## ASSESSMENT

- What caused your errors in estimation (if any)?

  > We did not have enough time to hold all the planned meetings. The reason could be the difficulty of aligning six different schedules and working around both working hours and study hours.

- What lessons did you learn (both positive and negative) in this sprint?

  > Our model for explaining new technologies worked well: doing a meeting with the person that took the task to implement new things instead of having individual study hours. 

- Which improvement goals set in the previous retrospective were you able to achieve? 

  > **achieved**: We managed to set deadlines to end the code part a few days before the demo, leaving more time for testing and code review.

  > **achieved**: We estimated better times for each task taking into account who would execute it

- There were no unachieved goals

- Improvement goals for the next sprint and how to achieve them 

  > We need to assign more hours to refactoring beacause we underestimated the size and complexity of the code and the impact of new changes

  > We should try to keep working with deadlines in mind to ensure code is finished early to allow more time for testing and review

- One thing you are proud of as a Team!!

  > We managed to follow the established deadlines in time and finished all the stories 