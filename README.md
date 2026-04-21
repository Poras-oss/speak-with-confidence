# VoxMind

VoxMind is an AI-powered public speaking trainer for people who freeze, spiral, or lose their train of thought while speaking. It gives you a private place to practice, transcribes your speech in real time, and turns each session into structured feedback you can use for the next rep.

The product is built around a simple belief from the landing page: your voice is a muscle, and it can be trained.

## What the Product Does

VoxMind helps users rebuild speaking confidence through short, repeatable practice sessions:

- Pick a mode like Extempore, Technical Explainer, or Group Discussion
- Get an AI-generated prompt or question
- Speak your answer out loud in the browser
- See your words appear in real time
- Receive feedback on structure, clarity, and completeness

The app is designed for students, professionals, interview candidates, and anyone who has ever gone blank mid-sentence.

## Core Practice Modes

- `Extempore`: random topics for thinking on your feet
- `Technical Explainer`: interview-style technical speaking practice
- `Group Discussion`: argument-building and structured opinion practice

The codebase also includes upcoming modes like Debate, Story Narration, and Sales Pitch.

## Product Philosophy

VoxMind presents itself as more than a speech tool. The landing page frames it as confidence training based on:

- Graduated exposure therapy
- Cognitive behavioral therapy principles
- Deliberate practice with high-feedback repetition

Each session is meant to be one more rep toward calmer, clearer speaking.

## Key Features

- Real-time speech transcription
- AI-generated prompts and feedback
- Session history and streak tracking
- Resume-aware technical interview support
- Browser-based experience with optional authentication
- First-session flow that can work without a required account

## Tech Stack

- `React 19`
- `TypeScript`
- `Vite`
- `TanStack Router`
- `TanStack Start`
- `Tailwind CSS`
- `Clerk` for authentication
- `NVIDIA NIM` for question generation and feedback

## Local Development

Install dependencies and start the app:

```bash
npm install
npm run dev
```

## Environment

The project currently includes a placeholder Clerk key in `.env`:

```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_REPLACE_ME
```

Authentication is optional in the current landing flow. If Clerk is not configured, the primary CTA still routes users into the app.

For AI features, VoxMind expects access to NVIDIA NIM. If a server-side key is not available, the app asks the user to paste their own NVIDIA API key and keeps it on the device.

## Why This Project Exists

The landing page centers the founder story around presentation anxiety, blanking out mid-talk, and the lack of a safe place to practice every day. VoxMind exists to make speaking practice private, repeatable, and honest, so improvement comes from reps instead of pressure.

## Status

This is an active browser app with a polished landing page, a guided speaking workflow, and feedback-driven practice loops already in place.
