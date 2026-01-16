# Notes App

A simple notes app to practice Docker and DevOps.

## What I Used

- React (frontend)
- Express + MongoDB (backend)
- Docker + Docker Compose
- GitHub Actions for CI/CD

## How to Run

Make sure you have Docker installed, then:

```bash
docker-compose up --build
```

Open http://localhost:3000 in your browser.

## API Routes

- `GET /api/notes` - get all notes
- `POST /api/notes` - create a note
- `DELETE /api/notes/:id` - delete a note

## Useful Commands

```bash
# start the app
docker-compose up

# stop the app
docker-compose down

# rebuild after changes
docker-compose build --no-cache
```

