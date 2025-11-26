# commands
terminal BE : cd server;npm i;nodemon index.mjs
terminal FE : cd client;npm i;npm run dev 
connection to db: (docker-desktop open and running) docker compose up -d
test: cd server; npm test ( cd server; npm run test:coverage) (npm test name_file)
retrospective: cd retrospective; node calculate.mjs

commads to reset and restart postgreSQL db : docker compose down; Remove-Item -Recurse -Force .\db_data; docker compose up -d
commands to remove a container named participium_db: docker rm -f participium_db


# Docker compose using participium image exampl

```yaml
version: "3.9"

services:
  postgres:
    image: postgres:15
    container_name: participium_db
    environment:
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: changeme
      POSTGRES_DB: participium
    ports:
      - "5432:5432"
    volumes:
      - ./db_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    networks:
      - participium_network
    restart: unless-stopped
  
  participium:
    image: participium:1.0.0
    container_name: participium_app
    environment:
      DB_HOST: postgres
      DB_PORT: 5432
      DB_USER: admin
      DB_PASSWORD: changeme
      DB_NAME: participium
      SUPABASE_URL: https://your-supabase-url.supabase.co
      SUPABASE_SERVICE_ROLE_KEY: your-supabase-service-role-key
      SUPABASE_BUCKET_NAME: your-bucket-name
    ports:
      - "3001:3001"
      - "5173:5173"
    depends_on:
      - postgres
    networks:
      - participium_network
    restart: unless-stopped

networks:
  participium_network:
    driver: bridge
```

# mail - password
admin@participium.local -  participium

-- Citizen
melo@participium.local - password

-- Organization Office
off.org@participium.local - participium

-- Water Department
off.water@participium.local - participium
tec.water@participium.local - participium

-- Accessibility Office
off.accessibility@participium.local - participium
tec.accessibility@participium.local - participium

-- Sewage Department
off.sewage@participium.local - participium
tec.sewage@participium.local - participium

-- Lighting Department
off.lighting@participium.local - participium
tec.lighting@participium.local - participium

-- Waste Management
off.waste@participium.local - participium
tec.waste@participium.local - participium

-- Traffic Department
off.traffic@participium.local - participium
tec.traffic@participium.local - participium

-- Public Works
off.publicworks@participium.local - participium
tec.publicworks@participium.local - participium

-- Parks Department
off.parks@participium.local - participium
tec.parks@participium.local - participium

-- General Services
off.general@participium.local - participium
tec.general@participium.local - participium

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

telegram_users(telegram_user_id, citizen_id, chat_id, linked_at)

