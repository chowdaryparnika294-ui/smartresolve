# SmartResolve — AI-Powered Complaint Management System

## Project Overview

SmartResolve is a full-stack, AI-assisted civic complaint management platform that simplifies complaint registration, categorization, prioritization, department routing, and resolution tracking.

The platform is designed to improve transparency and accountability by connecting citizens with the departments responsible for handling reported issues.

## Key Features

- Citizen registration and secure login
- Complaint submission with location and issue details
- Machine-learning-based complaint classification
- Risk-based priority assessment
- Department-wise complaint routing and management
- Complaint status tracking and history
- Role-based access for citizens, staff, and administrators
- Dashboard analytics and complaint filtering
- Multilingual interface support with documented coverage limitations
- Human-review flags for uncertain or safety-sensitive cases

## Technology Stack

**Frontend:** React, Vite

**Backend:** Node.js, Express.js

**Database:** MongoDB Atlas, Mongoose

**AI Service:** Python, FastAPI, scikit-learn

**Authentication:** JWT and bcrypt

**Deployment:** Render

**Version Control:** GitHub

## AI Integration

SmartResolve uses a separately deployed Python FastAPI service containing a trained machine-learning classification model.

The AI service analyzes complaint descriptions and predicts relevant complaint categories. The backend integrates these predictions with complaint routing and risk-based prioritization.

Risk scoring and AI classification are separate processes. Safety-sensitive and uncertain cases can be flagged for human review.

The AI is intended to assist complaint management, not replace human oversight or emergency services.

## System Architecture

Citizen / Staff / Administrator

↓

React + Vite Frontend

↓

Node.js + Express REST API

↓

MongoDB Atlas Database

↔ Python FastAPI AI Classification Service

## Deployment

The frontend, backend, and AI classification service are deployed on Render.

The backend communicates with MongoDB Atlas for persistent data storage and with the AI service for complaint classification.

## Running Locally

Requirements:
- Node.js 20+
- npm
- MongoDB Atlas
- Python 3.10+ for the AI service

```bash
npm install
npm run setup
```

Configure `backend/.env` with the MongoDB connection URI and JWT secret.

```bash
npm run dev
```

The frontend runs locally at `http://localhost:5173` and the backend at `http://localhost:5000`.

The Python AI service can be started separately after installing its dependencies and configuring the trained model.

## Testing

The project includes backend logic tests and frontend build verification. The application has also been tested through its deployed complaint submission, filtering, department viewing, and AI classification workflows.

## Current Limitations

- AI predictions are not guaranteed to be correct.
- Some multilingual interface elements remain in English.
- Uploaded complaint images are validated but not persistently stored.
- Additional production security, monitoring, and end-to-end testing are recommended.

## Conclusion

SmartResolve demonstrates how machine learning, intelligent prioritization, and a centralized complaint management workflow can make civic issue reporting more organized, accessible, and transparent.
