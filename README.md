# commands
terminal BE : cd server;npm i;nodemon index.mjs
terminal FE : cd client;npm i;npm run dev 
connection to db: (docker-desktop open and running) docker compose up -d
test: cd server; npm test (node --experimental-test-coverage --test)

# mail - password
admin@participium.local -  participium



# DB

citizens( citizen_id, email, username, first_name, last_name, password_hash, salt, email_notifications, created_at )

offices( office_id, name, description )

categories( category_id, name, office_id )

statuses( status_id, name )

reports( report_id, citizen_id, category_id, office_id, status_id, title, description, latitude, longitude, anonymous rejection_reason, created_at, updated_at )

photos( photo_id, report_id, image_url, uploaded_at )

roles( role_id, name, description )

operators(operator_id, email, username, password_hash, salt, office_id, role_id)

comments( comment_id, report_id, operator_id, content, created_at)

messages(message_id, report_id, sender_type, sender_id, content, sent_at)

notifications (notification_id, citizen_id, report_id, message,sent_at, seen)

-- (opzionale/commentata)
telegram_users(
    telegram_user_id, citizen_id, chat_id, linked_at
)



# PROBLEMS (or not) for the report

- better division of task and stories (not to only one)
- Fedor -> map and graphics (he is good at it)
- Giulia -> not good at graphics, but loves BE
- Gabriel -> leaves too much work to the end of the sprint
- Too many people and hours in documentation
- Attention to tasks with the duration more thant 2h
- no more than 5 stories (it's already caotic as it is)
- 4 stories are too easy and the 5th one is too much
- achieved: we did not have comunication or organizational problems and we comunicated effectively without dead-time
- achieved: the planning was done effectively and precisely in short time
- achieved: we did not have much error in estimation (budget correctly)
- achieved: we assigned a task to not more than two people -> less coordination problems

- better: finish the code in the first week -> code review and automatic testing on the second one

