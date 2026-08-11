# ChatGPT Ads Bulk Builder — Cowork Working Folder

This folder is a Claude Cowork agent that builds a ready-to-launch ChatGPT Ads campaign for real estate agents.

**Full setup instructions are in the AiM guide:** https://aimarketingacademy.com/library/

## Quick start

1. Open a fresh Claude chat at claude.ai
2. Paste the intake prompt from the guide
3. Answer the five rounds of questions
4. Copy Claude's final output into `market-config.md` (replacing everything in that file)
5. Drop 3-6 square images into the `images/` folder (1:1 ratio, 640-1200px, PNG or JPG)
6. Open this folder in Claude Cowork
7. Tell the agent: "Build my ChatGPT Ads campaign"

The agent will produce three files in `outputs/` — a spreadsheet you upload to ads.openai.com, a Word document with context hints to paste in Ads Manager, and a setup checklist for everything else.

## What's in this folder

- `CLAUDE.md` — agent instructions (don't edit unless you know what you're doing)
- `market-config.md` — your personalized business config (you'll populate this)
- `images/` — drop your square images here before running
- `outputs/` — agent writes deliverables here
- `skills/` — the agent's capabilities (don't edit)

## Re-running

After your first campaign, your `market-config.md` is saved. To build another campaign, just swap images and tell the agent to build again. No need to redo the intake.
