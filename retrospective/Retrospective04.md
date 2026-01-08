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
  > 5 vs 5 (stories)
- Total points committed vs done 
  > 21 vs 21 (story points)
- Nr of hours planned vs spent (as a team) 
  > 94h 45m vs 91h 35m

**Remember**  a story is done ONLY if it fits the Definition of Done:
 
- Unit Tests passing
- Code review completed
- Code present on VCS
- End-to-End tests performed

> Please refine your DoD 

### Detailed statistics

| Story  | # Tasks | Points | Hours est. | Hours actual |
|--------|---------|--------|------------|--------------|
| _#0_  |   20     |    -   |   60h 15m        |    57h 30m        |
| 28    |    5     |   2 |     5h       |    5h 20m          |
| 15    |   4    |    1    |    4h 45m        |     4h 45m         |
| 30   |    3     |    2    |    2h 15m        |      2h 15m        |
| 10   |    11     |    3   |  12h          |     12h 30m        |
| 11   |    13    |    9    |  10h 30m          |   10h 45m        |

- Hours per task average, standard deviation (estimate and actual)

|            | Mean | StDev |
|------------|------|-------|
| Estimation |  1.82h   | 2.22   | 
| Actual     | 1.76h  | 1.91  |

- Total estimation error ratio: sum of total hours spent / sum of total hours effort - 1 = **-3.34%**

    $$\frac{\sum_i spent_{task_i}}{\sum_i estimation_{task_i}} - 1$$
    
- Absolute relative task estimation error: sum( abs( spent-task-i / estimation-task-i - 1))/n = **9.62%**

    $$\frac{1}{n}\sum_i^n \left| \frac{spent_{task_i}}{estimation_task_i}-1 \right| $$

  
## QUALITY MEASURES 

- Unit Testing:
  - Total hours estimated
    > 3h
  - Total hours spent
    > 3h
  - Nr of automated test cases 
    > 337 tests (sum of those of this sprint and the previous one - without differentiating between unit and integration tests)
  - Coverage 
    > 93 % lines coverage (only related for the back-end)
- Integration testing:
  - Total hours estimated
    > 2h
  - Total hours spent
    > 2h
- E2E testing:
  - Total hours estimated
    > 3h 30m
  - Total hours spent
    > 3h 45m
  - Nr of test cases
    > 37 test cases (only counted those of the current sprint)
- Code review: 
  - Total hours estimated 
    > 16h 30m
  - Total hours spent
    > 16h 30m
- Technical Debt management:
  - Strategy adopted
    > Highest severity, shortest time
  - Total hours estimated estimated at sprint planning
    > 2h + ( 23h refactoring )
  - Total hours spent
    > 2h + ( 23h refactoring )

## ASSESSMENT

- What caused your errors in estimation (if any)?

  > We did not have sufficient time to hold all the planned meetings, mainly due to the increased difficulty of aligning six different schedules and accommodating both work commitments and study hours in preparation for the upcoming exam session.

- What lessons did you learn (both positive and negative) in this sprint?

  > We learned that having complete freedom in organizing personal time is not always efficient when deadlines or exams are approaching. Since different people have different schedules, coordination becomes more challenging when tasks depend on others.

- Which improvement goals set in the previous retrospective were you able to achieve? 

  > **achieved**: We managed to assign more hours to refactoring.

  > **achieved**: We finished writing the code early enough to allow more time for testing and review.

- There were no unachieved goals

- Improvement goals for the next sprint and how to achieve them 

  > We should try to organize our personal agenda to let a more fluid coordination with our work (on youtrack)

- One thing you are proud of as a Team!!

  > We managed to finish the project !