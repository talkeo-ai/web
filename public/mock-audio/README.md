# mock-audio

Placeholder audio for the fixture adapter. Every file here is one second of silence, generated
locally, so the URLs the recorded fixtures point at resolve while the screens are being built.

They exist so the parts that sync what is on screen with what is heard (`word_timings`, `marks`)
can be built and tested against a real `<audio>` element. Nothing in them is a recording of the
service, and nothing in them should ship past the mock: the real service serves its own URLs.
