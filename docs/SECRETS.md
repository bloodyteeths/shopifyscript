Google Gemini (AI drafts)

- Create a key in Google AI Studio
- In `.env` set:
  - AI_PROVIDER=google
  - GOOGLE_API_KEY=your_key
  - AI_MODEL=gemini-1.5-flash
  - AI_TEMPERATURE=0.4
  - AI_MAX_CALLS_PER_RUN=20

Notes
- Keep `.env` out of source control; use a secret manager in production.
- If `GOOGLE_API_KEY` is missing, AI drafts are disabled with a single actionable message.




