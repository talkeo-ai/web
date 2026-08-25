#!/usr/bin/env python3
"""Generates the tiling noise texture the hero artwork samples.

The shader reads one channel and wraps on both axes, so what it needs is
grayscale fractal noise that tiles seamlessly. Every octave here is a coarse
grid of random values resampled up to the full size; because each grid size
divides the output and the interpolation wraps around the edges, the result
repeats without a seam.

The seed is fixed, so re-running this reproduces the committed file byte for
byte. Regenerate with:

    python3 scripts/generate-noise-texture.py
"""

from __future__ import annotations

import pathlib

import numpy as np
from PIL import Image

SIZE = 256
OCTAVES = (4, 8, 16, 32, 64)
SEED = 20260825
OUTPUT = pathlib.Path(__file__).resolve().parent.parent / "public" / "noise.png"


def smoothstep(t: np.ndarray) -> np.ndarray:
    """Ease curve with zero first and second derivatives at both ends.

    Plain linear interpolation between grid points leaves visible creases along
    the grid lines; this removes them.
    """
    return t * t * t * (t * (t * 6 - 15) + 10)


def octave(frequency: int, rng: np.random.Generator) -> np.ndarray:
    """One layer of value noise, resampled from a `frequency` square grid."""
    grid = rng.random((frequency, frequency))

    # Where each output pixel falls on the grid, and how far it sits between
    # the two cells it lies across.
    coords = np.arange(SIZE) * frequency / SIZE
    low = np.floor(coords).astype(int) % frequency
    high = (low + 1) % frequency  # wraps, which is what makes it tile
    blend = smoothstep(coords - np.floor(coords))

    # Interpolate along one axis, then the other.
    top = grid[np.ix_(low, low)] * (1 - blend) + grid[np.ix_(low, high)] * blend
    bottom = grid[np.ix_(high, low)] * (1 - blend) + grid[np.ix_(high, high)] * blend
    return top * (1 - blend)[:, None] + bottom * blend[:, None]


def main() -> None:
    rng = np.random.default_rng(SEED)

    # Each octave doubles in frequency and halves in strength, which is what
    # gives the field both broad shapes and fine grain.
    field = np.zeros((SIZE, SIZE))
    total_amplitude = 0.0
    for index, frequency in enumerate(OCTAVES):
        amplitude = 0.5**index
        field += octave(frequency, rng) * amplitude
        total_amplitude += amplitude

    field /= total_amplitude
    field -= field.min()
    field /= field.max()

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray((field * 255).astype(np.uint8), mode="L").save(
        OUTPUT, optimize=True
    )
    print(f"wrote {OUTPUT} ({OUTPUT.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
