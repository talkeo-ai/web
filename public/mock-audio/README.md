# mock-audio

Placeholder audio for the fixture adapter. Every file here is silence, generated locally by
`scripts/mock-audio.mjs`, so the URLs the recorded fixtures point at resolve while the screens
are being built.

They exist so the parts that sync what is on screen with what is heard (`word_timings`, `marks`)
can be built and tested against a real `<audio>` element. Nothing in them is a recording of the
service, and nothing in them should ship past the mock: the real service serves its own URLs.

**A turn's file lasts as long as its own `word_timings` imply**, tail included — a second of
silence under a nine-second turn would hand the clock back to the fallback three words in, and
the sync would go untested exactly where it matters. The rest have no words to time and stay at
one second. Regenerate them with `node scripts/mock-audio.mjs` whenever a fixture's text or
timings change.
