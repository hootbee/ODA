# 🧪 ODA Test 환경 설정 가이드
(최적의 테스트 환경 구현을 위해 상세하게 작성)

---

## □ 1) 사전 준비 (필수)

### 🖥️ 운영체제 (OS)
- Windows 10/11 + **WSL2 (Ubuntu 22.04 권장)**
- Linux (**Ubuntu 22.04 이상**)
- macOS (**Ventura 13 이상 권장**)

---

### 🐳 Docker (20.10 이상 권장)
- **Windows**: Docker Desktop 설치 후 *WSL 통합* 활성화
- **Linux**: `docker` + `docker compose` 설치
- **macOS**: Docker Desktop 설치 (또는 `brew install --cask docker`)

---

### 🔧 Git 설치 (소스 코드 다운로드용)
- **Windows**: Git for Windows 설치
- **Linux/macOS**: 패키지 매니저 또는 Homebrew(`brew install git`) 이용

---

### 🌐 네트워크
- 외부 인터넷 접근 가능해야 함
- 특히 [서울 열린데이터 광장 (https://data.seoul.go.kr/)](https://data.seoul.go.kr/) 접속 가능해야 함

---

## □ 2) 소스 코드 다운로드

```bash
# (Windows PowerShell에서 WSL 진입)
$ wsl

# (WSL 또는 Linux/macOS 환경에서 실행)
$ git clone https://github.com/hootbee/ODA.git
$ cd ODA
```
## □ 3) 환경 변수 설정 (필수)
프로젝트 루트(ODA/)에 .env 파일을 생성하고 아래 내용을 작성합니다.
```
# ===========================
# AI / Gemini API
# ===========================
GEMINI_API_KEY=

# ===========================
# Google OAuth2 로그인
# ===========================
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
OAUTH_REDIRECT_URI=

# ===========================
# JWT (토큰 암호화)
# ===========================
JWT_SECRET=

# ===========================
# Database 연결정보
# ===========================
DB_URL=
DB_USERNAME=
DB_PASSWORD=
```
## □ 4) 실행 방법
```
# Docker 빌드 및 실행
$ docker compose up --build
```
✅ 실행 확인
•	프론트엔드 (웹 UI) → http://localhost:3000
•	브라우저에 접속하여 웹 애플리케이션을 이용할 수 있습니다.

⸻

📘 요약
1.	.env 파일 생성 및 필수 키 입력
2.	docker compose up --build 실행
3.	http://localhost:3000 접속하여 서비스 확인