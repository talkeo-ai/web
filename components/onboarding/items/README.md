# items

One component per kind of exercise the service can serve.

Each one draws a single instrument and hands back the one response shape that instrument takes.
Nothing here decides what comes next, and nothing here says whether an answer was right: a
renderer reports the attempt and how long it took, and that is all it knows.

Adding one is three steps: write the component, add it to `registry.ts`, and nothing else. The
capability this client declares when a run opens is the keys of that map, so it updates itself and
cannot claim an exercise that has no renderer.

The registry is empty for now, which is why the service currently has nothing to serve.
