# StormView Rewrite
A rewritten version of stormview to be faster, lighter, and have less info but that info given to you in a better and faster way.

## Weather Info Providers
### Weather Info:
- OpenMeteo: Defualt provider, works the best with the app
- NWS: Alternative provider, missing a bunch of stuff, not reccomended to use
### Radar:
- OpenMeteo Maps: Defualt provider, fast and snappy, low-ish quality data
- LibreWXR: Alternative Provider, slow to use, high quality data

## Layouts
The app picks a layout automatically:
- **Desktop** — full map + weather sidebar
- **Mobile** — phones get a dedicated scrollable weather page (toggle off in Settings → Display to use the classic map + bottom sheet)
- **Watch** — open with `?watch` (or on a Wear OS browser) for a stripped-down layout tuned for smartwatch screens