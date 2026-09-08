# sounds

The interface's sounds, in the form the browser gets them. `lib/sound/` is what plays them.

Both are the same edit: downmixed to one channel, 44.1 kHz, 16-bit, and gained so each peaks at
−6 dBFS. They started at −9.0 dBFS and matched each other, and they still match — a pair where
one is louder than the other reads as two different controls rather than one being pressed and
released.

They are 18 and 21 milliseconds long, which is why they are uncompressed. At this length a
codec's own padding is a bigger file than the sound, and the frame it adds is audible as a
second click.

Adding one is a file here plus a line in the table in `lib/sound/index.ts`. What deserves a
sound is a decision about the surface, not about this folder.
