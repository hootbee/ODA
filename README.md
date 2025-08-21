ODA: AI 기반 공공 데이터 활용 플랫폼
🚀 시작하기
이 가이드는 ODA(Open Data Assistant) 프로젝트를 로컬 환경에서 설정하고 실행하는 전체 과정을 안내합니다. 프로젝트는 Backend (Spring), Frontend (React), Agentica (Node.js) 세 가지 서비스로 구성되어 있습니다.

📋 사전 준비 (Prerequisites)
애플리케이션을 실행하기 전에, 아래 API 키들을 미리 발급받아 준비해주세요.

Google Gemini API Key: 데이터 분석 및 AI 추론을 위해 필요합니다.

Google OAuth 2.0 Client ID & Secret: 사용자 로그인을 위해 필요합니다.

Supabase 데이터베이스 비밀번호: 프로젝트의 데이터베이스 접속에 필요합니다.

⚙️ 1. 환경 설정 (Environment Setup)
가장 먼저, 프로젝트의 각 서비스가 API 키와 설정 값을 인식할 수 있도록 환경 변수 파일을 설정해야 합니다.

1. 백엔드 (Backend) 설정
backend/src/main/resources/application.properties 파일을 열고, 아래 내용으로 전체를 교체한 뒤 < >로 표시된 부분을 실제 값으로 채워주세요.

# Spring Application
spring.application.name=oda

# Database Configuration (PostgreSQL on Supabase)
spring.datasource.url=jdbc:postgresql://aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres?sslmode=require
spring.datasource.username=postgres.hjxpeyuebcofzlbnwzse
spring.datasource.password=<YOUR_SUPABASE_DATABASE_PASSWORD>
spring.datasource.driver-class-name=org.postgresql.Driver

# JPA & Hibernate Configuration
spring.jpa.hibernate.ddl-auto=update
spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.PostgreSQLDialect
spring.jpa.show-sql=true
spring.jpa.properties.hibernate.format_sql=true

# Spring Security & OAuth2 (Google) Configuration
spring.security.oauth2.client.registration.google.client-id=${GOOGLE_CLIENT_ID:<YOUR_GOOGLE_CLIENT_ID>}
spring.security.oauth2.client.registration.google.client-secret=${GOOGLE_CLIENT_SECRET:<YOUR_GOOGLE_CLIENT_SECRET>}
spring.security.oauth2.client.registration.google.scope=email,profile
spring.security.oauth2.client.registration.google.redirect-uri=http://localhost:8080/login/oauth2/code/google
spring.security.oauth2.client.provider.google.authorization-uri=https://accounts.google.com/o/oauth2/v2/auth
spring.security.oauth2.client.provider.google.token-uri=https://oauth2.googleapis.com/token
spring.security.oauth2.client.provider.google.user-info-uri=https://www.googleapis.com/oauth2/v2/userinfo
spring.security.oauth2.client.provider.google.user-name-attribute=email

# JWT Configuration
jwt.secret=${JWT_SECRET:your-super-secret-jwt-key-here-make-it-long-and-secure}

# HikariCP Connection Pool Configuration (for Supabase/PgBouncer)
spring.datasource.hikari.maximum-pool-size=5
jwt.expiration=86400000

2. 에이전트 (Agentica) 설정
my-agentica-project/.env 파일을 열고, 아래 내용으로 전체를 교체한 뒤 < >로 표시된 부분을 실제 값으로 채워주세요.

GEMINI_API_KEY=<YOUR_GEMINI_API_KEY>
GOOGLE_API_KEY=

▶️ 2. 애플리케이션 실행
환경 설정이 완료되었다면, 각 서비스를 순서대로 실행합니다.

1. 백엔드 (Backend)
backend 디렉토리의 터미널에서 실행합니다.

./gradlew build
./gradlew bootRun

ℹ️ 백엔드 서버는 localhost:8080에서 실행됩니다.

2. 프론트엔드 (Frontend)
frontend 디렉토리의 터미널에서 실행합니다.

npm install
npm start

ℹ️ 프론트엔드 앱은 localhost:3000에서 실행됩니다.

3. 에이전트 (Agentica)
my-agentica-project 디렉토리의 터미널에서 실행합니다.

npm install
npm run build
npm start

ℹ️ 에이전트 서버는 localhost:3001에서 실행됩니다.

✨ 3. 실행 확인
모든 서버가 정상적으로 실행되었다면, 웹 브라우저에서 http://localhost:3000 주소로 접속하여 Google 로그인 후 서비스를 이용할 수 있습니다.
