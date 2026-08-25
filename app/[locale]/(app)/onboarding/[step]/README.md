# onboarding/[step]

The step lives in the URL, not in client state. That is what makes the browser's back button
work and lets a half-finished run be resumed later.

The sequence is decided server-side and can branch, so this route renders whatever step it is
handed and posts the answer back. Which steps exist is defined outside this repository.
