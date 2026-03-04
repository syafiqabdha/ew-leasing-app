# Project Management & Task Synchronization

This document outlines how the **Engwah Leasing Portal** syncs its repository issues, PRs, and milestones with external project management tools (e.g., Jira, Trello, Google Calendar).

## 1. Automated Sync (GitHub Actions)
We utilize GitHub Actions to catch webhook events from Issues and Pull Requests and forward them to external task boards.

### Example: Syncing Issues to Trello

```yaml
# .github/workflows/trello-sync.yml
name: Sync Issues to Trello Board

on:
  issues:
    types: [opened, edited, closed, reopened]

jobs:
  trello_sync:
    runs-on: ubuntu-latest
    steps:
      - name: Create or Update Trello Card
        uses: rematocorp/trello-integration-action@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          trello-api-key: ${{ secrets.TRELLO_API_KEY }}
          trello-api-token: ${{ secrets.TRELLO_API_TOKEN }}
          trello-board-id: 'YOUR_BOARD_ID'
          trello-list-id: 'YOUR_LIST_ID'
```

## 2. Milestone Calendar Integration
For keeping track of deployment deadlines:
- Milestones set in GitHub automatically map to **Google Calendar** events using Zapier or a custom webhook server.
- Webhook trigger on: `milestone.created`, `milestone.updated`, `milestone.deleted`.
- Target: A shared Team Calendar displaying the Milestone's `due_on` field as the deployment target date.

## 3. Workflow Rules
- **No PR Without Issue**: Every Pull Request must be linked to an Issue (`Fixes #123`) to ensure tracking on the project board.
- **Auto-Moving**: When an Issue is assigned to a PR, its corresponding task card automatically moves from `To Do` to `In Progress`. Upon PR merge, the card moves to `Done` or `QA`.
