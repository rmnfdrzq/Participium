RETROSPECTIVE (Team 01)
=====================================

The retrospective should include _at least_ the following
sections:

- [process measures](#process-measures)
- [quality measures](#quality-measures)
- [general assessment](#assessment)

## PROCESS MEASURES 

### Macro statistics

- Number of stories committed vs. done 
  > 5 vs 5 (stories)
- Total points committed vs. done 
  > 21 vs 21 (story points)
- Nr of hours planned vs. spent (as a team)
  > 96h vs 96h 25m

**Remember**
 a story is done ONLY if it fits the Definition of Done:
 
- Unit Tests passing
- Code review completed
- Code present on VCS
- End-to-End tests performed

### Detailed statistics

| Story  | # Tasks | Points | Hours est. | Hours actual |
|--------|---------|--------|------------|--------------|
| _Uncategorized_   |    4     |   -    |     25 h      |      26.25 h        |
| 1     |   9      |   3     |      11.75 h      |    11.5 h ca          | 
| 2     |    8     |    3    |     10 h       |      10.5 h        |  
| 3     |  8       |   2     |       9.25 h     |      9.25 h        | 
| 4    |    6     |   5     |   18.5 h         |      18.75 h        | 
| 5     |    9     |    8    |    21.5 h        |     20 h  ca         | 


- Hours per task average, standard deviation (estimate and actual)

|            | Mean | StDev |
|------------|------|-------|
| Estimation |  2.18 h    |  2.76 h     | 
| Actual     |  2.19 h    |  2.78 h     |

- Total estimation error ratio: sum of total hours spent / sum of total hours effort - 1 = **0.43%**

    $$\frac{\sum_i spent_{task_i}}{\sum_i estimation_{task_i}} - 1$$
    
- Absolute relative task estimation error: sum( abs( spent-task-i / estimation-task-i - 1))/n = **6.02%**

    $$\frac{1}{n}\sum_i^n \left| \frac{spent_{task_i}}{estimation_task_i}-1 \right| $$
  
## QUALITY MEASURES 

- Unit Testing:
  - Total hours estimated 
    > 6 h
  - Total hours spent
    > 6 h
  - Nr of automated unit test cases 
    > 31 tests
  - Coverage
    > 85 % lines coverage
- E2E testing:
  - Total hours estimated
    > 5 h
  - Total hours spent
    > 5 h
  - Nr of test cases
    > 21 user cases
- Code review 
  - Total hours estimated 
    > 22.5 h
  - Total hours spent
    > 21.8 h ca
  
## ASSESSMENT

- What did go wrong in the sprint?

  > Too many people and hours in documentation -> time spent ineffectively

- What caused your errors in estimation (if any)?

  > there were little estimation errors: the major cause was the difficult distribution of the hours that originates from inexperience, but we still managed to follow the planning well enough

- What lessons did you learn in this sprint?

  > We started to understand and know each other: now we know who is more apt than others at some specific task.
  That enables more efficient planning and the division of the task in shorter time with a better quality final product
  
  > To dedicate less hours to documentation and to give this task to only one person, as not all the team needs to know all about each element

- Which improvement goals set in the previous retrospective were you able to achieve? 

  > **achieved**: we did not have comunication or organizational problems and we comunicated effectively without dead-time

  > **achieved**: the planning was done effectively and precisely in short time
  
- There were no unachieved goals

- Improvement goals for the next sprint and how to achieve them 

  > Finish the code in the first week -> code review and automatic testing on the second one

  > Division of the code of diffrent sprint on diffrent files (BackEnd and testing) -> simpler to correct

- One thing you are proud of as a Team!!
  > We have solved all the problems of the previous sprint, so we are improving!!!

