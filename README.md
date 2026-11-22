# Beat the Time

A browser demo of the personal goal and habit tracker. You can add goals and
linked to-dos, create daily or weekly habits, save check-ins, and see points,
streaks, and goal progress update. Demo Settings switches between Gentle and
Strict motivation and lets you restore the sample data.

## Run locally

Run `python3 -m http.server 8000` from the repository root, then open
`http://localhost:8000/docs/`.

The demo runs entirely in the browser and stores changes in local storage on
the current device. It uses the device timezone and Monday-start weeks.
The static preview uses sample rewards of 10 points for Done, 5 for Partial,
and 50 for completing a goal. Real accounts, syncing, and private data need the
production Supabase backend, which would own all business rules.

## Publish to GitHub Pages

In the repository's Pages settings, select **Deploy from a branch** and set
the source to `main` and `/docs`. All assets use paths relative to the page
so the demo works at the project's GitHub Pages URL.
