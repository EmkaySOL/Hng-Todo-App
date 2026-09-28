# Replit run instructions

The app uses the `Start application` workflow:

```bash
uvicorn main:app --host 0.0.0.0 --port $PORT
```

The workflow sets `PORT=5000` for the Replit web preview. The app is served at `/`, with the API under `/api/todos`.