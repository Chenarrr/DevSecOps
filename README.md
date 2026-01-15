# 📝 Notes App

A full-stack notes application built with React, Express, and MongoDB. Containerized with Docker for easy deployment.

## 🛠️ Tech Stack

**Frontend:**
- React 19
- Vite
- Axios

**Backend:**
- Node.js
- Express.js
- MongoDB
- Mongoose

**DevOps:**
- Docker
- Docker Compose
- GitHub Actions CI/CD

## 📁 Project Structure

```
notes-app/
├── frontend/           # React frontend
│   ├── src/
│   ├── Dockerfile
│   └── nginx.conf
├── backend/            # Express API
│   ├── server.js
│   └── Dockerfile
├── docker-compose.yml  # Container orchestration
└── .github/
    └── workflows/
        └── ci.yml      # CI/CD pipeline
```

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- Git

### Run with Docker (Recommended)

```bash
# Clone the repository
git clone <your-repo-url>
cd notes-app

# Start all services
docker-compose up --build

# Access the app
# Frontend: http://localhost:3000
# Backend API: http://localhost:5000/api/notes
```

### Run Locally (Development)

**Backend:**
```bash
cd backend
npm install
npm run dev
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notes` | Get all notes |
| POST | `/api/notes` | Create a note |
| GET | `/api/notes/:id` | Get single note |
| PUT | `/api/notes/:id` | Update a note |
| DELETE | `/api/notes/:id` | Delete a note |

## 🐳 Docker Commands

```bash
# Build and start containers
docker-compose up --build

# Run in background
docker-compose up -d

# Stop containers
docker-compose down

# View logs
docker-compose logs -f

# Rebuild specific service
docker-compose build --no-cache frontend
```

## 🔄 CI/CD Pipeline

This project uses GitHub Actions for continuous integration:

- ✅ Triggers on push to main branch
- ✅ Installs dependencies
- ✅ Builds frontend
- ✅ Builds Docker images
- ✅ Verifies containers work

## 📝 Environment Variables

See `.env.example` for required environment variables.

## 👤 Author

Built as a DevOps portfolio project.
