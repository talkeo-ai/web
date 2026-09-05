# onboarding/[screen]

The screen lives in the URL, not in client state. That is what makes the browser's back button
work and lets a half-finished run be picked up later.

There are two levels of navigation here, and only one of them belongs to this app:

- The **step** is the service's. It decides where a run is, and every write it answers says so.
  This route renders the step it is handed and never predicts the next one.
- The **screen** is ours, because some steps are more than one thing to look at. The opening step
  asks three questions and arrives as a single step.

The mapping is `lib/onboarding/screens.ts` and nothing else derives it. A screen whose step is not
the one the service reports redirects to where the run actually is, so a stale link is a
correction rather than an error.
