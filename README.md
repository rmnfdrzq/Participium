# commands
terminal BE : cd server;npm i;nodemon index.mjs
terminal FE : cd client;npm i;npm run dev 
connection to db: (docker-desktop open and running) docker compose up -d

# mail - password
admin@participium.local -  participium


aaaaaaaa@aaaaaaaaaaaa.com - password

# DB

citizens
( citizen_id, email, username, first_name, last_name, password_hash, salt, email_notifications, created_at )

offices
( office_id, name, description )

operators
( operator_id, email, username, password_hash, salt, office_id )

categories
( category_id, name, office_id )

statuses
( status_id, name )

reports
( report_id, citizen_id, category_id, office_id, status_id, title, description, latitude, longitude, anonymous, rejection_reason, created_at, updated_at )

photos
( photo_id, report_id, image_url, uploaded_at )

comments
( comment_id, report_id, operator_id, content, created_at )

messages
( message_id, report_id, sender_type, sender_id, content, sent_at )

notifications
( notification_id, citizen_id, report_id, message, sent_at, seen )
