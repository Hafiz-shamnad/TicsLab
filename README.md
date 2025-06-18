# 🛠️ TICS — Team Integrated Collaborative System

TICS is a modern, full-stack collaborative development platform tailored for teams working on projects involving code, design, and file sharing. Think GitHub meets real-time collaboration, powered by secure APIs and a clean Next.js frontend.

## 🚀 Features

* 🧑‍💻 **Repository Management**: Create, manage, and collaborate on repositories
* 📁 **File Upload & Sharing**: Upload files to repos securely, with role-based access control
* 👥 **Collaborators System**: Add members with `read`, `write`, or `admin` roles
* 🔒 **JWT Auth System**: Secure login and protected routes using FastAPI + Auth tokens
* 🌐 **Cross-Origin Enabled**: CORS setup for frontend-backend integration
* ⚙️ **Rate Limiting**: API protection with `slowapi`

## 🧱 Tech Stack

| Frontend          | Backend        | Auth                    | Dev Tools          |
| ----------------- | -------------- | ----------------------- | ------------------ |
| Next.js (App Dir) | FastAPI        | JWT Bearer Tokens       | Docker-ready (WIP) |
| Tailwind CSS      | SQLAlchemy ORM | OAuth Support (Planned) | RESTful APIs       |

---

## 📂 Project Structure

```
ticslab/
├── backend/
│   ├── auth/                # Authentication system (login, JWT, models)
│   ├── repos/               # Repositories and files logic
│   ├── storage/             # Uploaded files stored per repo
│   ├── main.py              # FastAPI app entry
│   └── config.py            # CORS + DB configs
├── frontend/
│   ├── app/
│   │   ├── repos/[repoId]/files/page.tsx   # Files listing UI
│   │   └── context/AuthContext.tsx         # Auth token context
│   └── next.config.js       # Rewrites to backend API
└── README.md
```

---

## ⚙️ Getting Started

### 🔧 Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

### 💻 Frontend

```bash
cd frontend
npm install
npm run dev
```

Make sure your `.env` and `config.py` are correctly configured.

---

## 🔐 Auth Flow

* On login, a JWT token is issued and stored in frontend context
* All protected endpoints require `Authorization: Bearer <token>`
* User roles (`read`, `write`, `admin`) define repo access levels

---

## 📦 API Overview

| Method | Endpoint                       | Description                    |
| ------ | ------------------------------ | ------------------------------ |
| GET    | `/api/repos/{id}/files/`       | List files in a repo           |
| POST   | `/api/repos/{id}/files/upload` | Upload file (admin/write only) |
| GET    | `/api/repos/{id}/files/{file}` | Download specific file         |
| POST   | `/api/auth/login`              | Login and get token            |
| GET    | `/api/auth/me`                 | Verify token and fetch user    |

---

## 🧪 Known Issues

* Double requests in dev mode due to React Strict Mode
* No real-time collaboration yet (planned via WebSockets)
* Minimal error handling for file overwrite/duplicate logic

---

## 🤝 Contribution

Want to contribute or test TICS for your team? Feel free to fork and submit a PR — or [start a discussion](#) with your idea.

---

## 📜 License

MIT © Hafiz Shamnad
