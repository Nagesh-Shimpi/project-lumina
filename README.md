# 🌟 Project Lumina — AI Tutor App

An intelligent, adaptive AI tutoring application built with React, Vite, Supabase, and TypeScript.

## 🚀 Live Demo

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Click%20Here-brightgreen?style=for-the-badge)](https://nagesh-shimpi.github.io/project-lumina/)

> **Live URL:** [https://nagesh-shimpi.github.io/project-lumina/](https://nagesh-shimpi.github.io/project-lumina/)

---

## ✨ Features

- 🤖 AI-powered adaptive tutoring via Supabase Edge Functions
- 🧠 Smart learning engine with memory and proactive agent
- 📊 Progress tracking and quiz generation
- 💬 Real-time chat with the AI tutor
- 🎨 Beautiful, responsive mobile-first UI
- 🔒 Supabase authentication and database

---

## 🛠️ Tech Stack

- **Frontend:** React 18, TypeScript, Vite
- **UI:** Tailwind CSS, Radix UI, shadcn/ui
- **Backend:** Supabase (Auth, Database, Edge Functions)
- **AI:** Gemini API via Supabase Edge Functions

---

## 📦 Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

---

## 🚢 Deployment

This project is deployed to GitHub Pages using the `gh-pages` package.

```bash
# Deploy to GitHub Pages
npm run deploy
```

---

## 📁 Project Structure

```
src/
├── components/       # Reusable UI components
│   ├── screens/      # App screen components
│   └── tutor/        # Tutor-specific components
├── lib/tutor/        # AI tutor logic (engine, memory, adaptive)
├── integrations/     # Supabase client & types
└── pages/            # Route pages

supabase/
├── functions/        # Edge Functions (chat, quiz, adaptive, etc.)
└── migrations/       # Database migrations
```
