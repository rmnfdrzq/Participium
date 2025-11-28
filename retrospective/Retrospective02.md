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
  > 4 vs 4 (stories)
- Total points committed vs. done 
  > 19 vs 19 (story points)
- Nr of hours planned vs. spent (as a team)
  > 95h 30m vs 96h 5m

**Remember**
 a story is done ONLY if it fits the Definition of Done:
 
- Unit Tests passing
- Code review completed
- Code present on VCS
- End-to-End tests performed

### Detailed statistics

| Story  | # Tasks | Points | Hours est. | Hours actual |
|--------|---------|--------|------------|--------------|
| _Uncategorized_   |    15    |   -    | 52 h 45 m        |    52 h 15 m         |
| 6    |   10     |   5     | 11 h 30 m      |    12 h       | 
| 7    |    7    |    8   |  9 h 15 m    |   9 h 50 m       |  
| 8   |  9      |   3    |  10 h     |    10 h       | 
| 9   |    10    |   3    |   12 h       |   12 h        | 


- Hours per task average, standard deviation (estimate and actual)

|            | Mean | StDev |
|------------|------|-------|
| Estimation |  1.88  |  2.77    | 
| Actual     |  1.88 |  2.70   |

- Total estimation error ratio: sum of total hours spent / sum of total hours effort - 1 = **0.61%**

    $$\frac{\sum_i spent_{task_i}}{\sum_i estimation_{task_i}} - 1$$
    
- Absolute relative task estimation error: sum( abs( spent-task-i / estimation-task-i - 1))/n = **11%**

    $$\frac{1}{n}\sum_i^n \left| \frac{spent_{task_i}}{estimation_task_i}-1 \right| $$
  
## QUALITY MEASURES 

- Unit Testing and Integration Testing:
  - Total hours estimated 
    > 9 h
  - Total hours spent
    > 9 h
  - Nr of automated unit test cases 
    > 153 tests (sum of those of this sprint and the previous one)
  - Coverage
    > 96 % lines coverage
- E2E testing:
  - Total hours estimated
    > 3 h 15 m
  - Total hours spent
    > 3 h 50 m
  - Nr of test cases
    > 33 test cases (only counted those of the current sprint)
- Code review 
  - Total hours estimated 
    > 18 h
  - Total hours spent
    > 18 h
  
## ASSESSMENT
- What did go wrong in the sprint?

  > We finished the front end the night before the demo

- What caused your errors in estimation (if any)?

  > The estimation error is due to the fact that estimates are discussed and decided by majority vote before being assigned, and the skill level of the person who will actually work on the task is not taken into account

- What lessons did you learn in this sprint?

  > We need to establish stricter internal deadlines before the final delivery, especially for the backend and frontend development work

- Which improvement goals set in the previous retrospective were you able to achieve? 

  > **achieved**:We reorganized the code to make it clearer, splitting overly large files into smaller ones so that we can more easily locate and update our code when needed.

  > **achived**: We avoided collective tasks (related to documentation or shared knowledge) by turning them into tasks where one person would research the topic and then briefly explain to the group how that part worked in the project.
  
- Which ones you were not able to achieve? Why?

  > Improve allocation of hours: We definitely improved compared to the first sprint, but we still didn’t take into account the skills of the people assigned to each task.

- Improvement goals for the next sprint and how to achieve them 

  > Improve task estimation by reviewing task duration during sprint planning after the assignment, so that the person assigned can adjust the estimated time based on their skill set
  
  > Set intermediate deadlines for both the front end and back end, and complete them a few days before the end of the sprint so that the person in charge of testing has more time available

- One thing you are proud of as a Team!!

  > Despite the difficulties encountered during this sprint, we managed to complete what was planned