# SmartResolve — full-stack complaint platform

## Requirements
Node.js 20+, npm, MongoDB Atlas. Python 3.10+ optional for trained AI. React + Vite frontend, Express API, MongoDB/Mongoose, JWT, role permissions, risk scoring, routing, complaint tracking, analytics, demo seed, language selector, optional FastAPI classifier.

## Quick start (VS Code terminal, project root)
```bash
npm install
npm run setup
```
Copy `backend/.env.example` to `backend/.env`. Set `MONGODB_URI` to your MongoDB Atlas SRV URL and `JWT_SECRET` to a long random secret. Atlas: create database user, allow your current IP in Network Access, copy driver connection URI; URL-encode special characters in password. Then:
```bash
npm run dev
```
Visit http://localhost:5173. Express listens on http://localhost:5000. For fictional demonstration accounts and complaints, in a second terminal run:
```bash
npm run seed --prefix backend
```
Demo login: `citizen@smartresolve.test`, `staff@smartresolve.test`, `admin@smartresolve.test`, all with password `DemoPass123!`. **Change/delete these accounts before any public deployment.** Do not publish the seeded passwords to production.

## AI training (optional)
The app works without the Python AI service, using a transparent, uncertain rule-based classifier and human-review flags. No trained model is shipped. See `datasets/README.md` for official sources and limitations. Provide an approved, manually mapped `text,category` CSV, then:
```bash
cd ai-service
python -m venv .venv
# activate .venv for your OS
pip install -r requirements.txt
python train.py --data ../datasets/approved_labeled.csv
uvicorn main:app --host 0.0.0.0 --port 8000
```
Set `AI_SERVICE_URL=http://localhost:8000` in backend `.env`; restart backend. For unsupported languages, the classifier falls back and requests human review. Translation coverage includes six Indian languages plus English; UI dictionary covers core navigation/forms, but some advanced action messages remain English.

## GitHub
```bash
git init
git add .
git commit -m "Initial SmartResolve project"
git branch -M main
git remote add origin YOUR_GITHUB_REPOSITORY_URL
git push -u origin main
```
Never commit `.env` or dataset containing personal information.

## Render
Connect GitHub repository, create Blueprint from `render.yaml` or create backend Node Web Service (root `backend`, build `npm install`, start `npm start`) and frontend Static Site (root `frontend`, build `npm install && npm run build`, publish `dist`). Set backend `MONGODB_URI`, `JWT_SECRET`, `FRONTEND_URL` (exact deployed frontend origin) and optional `AI_SERVICE_URL`. Set frontend `VITE_API_URL` to `https://YOUR-BACKEND.onrender.com/api` before build. Enable SPA rewrite `/*` → `/index.html`. Optional Python Web Service root `ai-service`, build `pip install -r requirements.txt`, start `uvicorn main:app --host 0.0.0.0 --port $PORT`; supply your independently trained model artifact securely. Check Render pricing, instance sleep, service quotas and MongoDB Atlas access before deployment. Do not assume free tier or uptime guarantees.

## Important scope notes
- Submitted images are MIME/size validated but **not retained**. Add private object storage and authenticated download endpoints before enabling durable image evidence.
- Dashboard data is from MongoDB, never mock counters. Demo seed is fictional and marked with `DEMO-` IDs.
- Duplicate suggestions use category/location/time and text overlap, not embeddings. Human confirmation required.
- Security includes backend role checks, bcrypt, JWT, basic rate limiting, validation, CORS and Helmet. For production, add email verification, password reset, richer audit/abuse monitoring, HTTPS-only cookie strategy, retention policy, antivirus/image validation, pagination and end-to-end tests.
- A submitted safety flag triggers critical priority and human review. Never rely on this site for emergency dispatch.
- The optional classifier must be trained with real curated data; no claimed accuracy until evaluation is run.

## Tests
`npm test` runs backend logic tests. `npm run build` checks frontend compilation.

Run the database-backed API/security regression suite against a local MongoDB:
```bash
TEST_MONGODB_URI=mongodb://127.0.0.1:27017 npm run test:integration
```
The suite requires an explicit local database URI, creates a uniquely named test database, and deletes only that database afterward. It does not need Atlas credentials or demo seeding. It tests registration/login, complaint submission and resolution, role changes, access restrictions, duplicate reports, search validation, uploads, and SLA reporting.

See [the backend audit](BACKEND_AUDIT.md) for findings, fixes, and remaining production work.
