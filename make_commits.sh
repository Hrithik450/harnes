#!/bin/bash

# Reset git
rm -rf .git
git init
git remote add origin https://github.com/Hrithik450/harnes.git

# 1. Dependencies
git add package.json pnpm-lock.yaml
git commit -m "chore: initialize dependencies and package configuration"

# 2. Base Configs
git add tsconfig.json components.json .eslintrc.json .gitignore .env.example
git commit -m "chore: add project configuration and environment templates"

# 3. Next & Tailwind Configs
git add next.config.ts tailwind.config.ts postcss.config.mjs
git commit -m "chore: configure Next.js, Tailwind CSS, and PostCSS"

# 4. Database Schema
git add src/lib/drizzle/
git commit -m "feat: configure Drizzle ORM and database schema"

# 5. Database Services
git add src/lib/services/
git commit -m "feat: add thread and message database services"

# 6. Server Actions
git add src/lib/actions/
git commit -m "feat: implement server actions for chat persistence"

# 7. Gemini Provider
git add src/lib/gemini/
git commit -m "feat: integrate Gemini AI provider and custom configurations"

# 8. State Management
git add src/store/
git commit -m "feat: implement Zustand state management for chat and agents"

# 9. Core UI Components
git add src/components/ui/ src/lib/utils.ts
git commit -m "feat: add reusable core UI components"

# 10. Chat Layout
git add src/components/layout/
git commit -m "feat: design app layout and sidebar structure"

# 11. Chat Components
git add src/components/chat/
git commit -m "feat: build chat interface and message components"

# 12. App Routes
git add src/app/
git rm -r --cached src/app/api/
git commit -m "feat: configure Next.js application routes and pages"

# 13. API Routes
git add src/app/api/
git commit -m "feat: build streaming chat API and tool execution routes"

# 14. Custom Hooks
git add src/hooks/
git commit -m "feat: create custom hooks for chat streaming and UI interactions"

# 15. Mock Data
git add src/lib/data/
git commit -m "chore: add static business categories and mock data"

# 16. AI Tools
git add src/lib/agent/tools/
git commit -m "feat: implement core AI tools (Search, Scrape, DataForSEO, Meta)"

# 17. AI Skills
git add src/lib/agent/skills/
git commit -m "feat: add specialized performance marketing AI skills (Markdown)"

# 18. AI Orchestrator
git add src/lib/agent/orchestrator.ts src/lib/agent/system.prompt.ts src/lib/agent/index.ts
git commit -m "feat: configure Chief AI orchestrator and system prompts"

# 19. Public Assets
git add public/
git commit -m "feat: add static assets and specialized brand SVGs"

# 20. Documentation (and anything left over)
git add .
git commit -m "docs: update project documentation and README features"

# Force push to overwrite the messy history
git branch -M main
git push -u origin main --force
