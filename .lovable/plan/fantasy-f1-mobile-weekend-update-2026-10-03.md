# Fantasy F1 Mobile & Weekend Update

## What will change

- Replace the current helmet with a completely new **FANTASY F1** motorsport identity: an original aerodynamic speed emblem, a responsive horizontal header version, and a compact icon for the app icon and favicon.
- Convert every user-facing message to English, with one deliberate exception: **👑 فحل الجولة**.
- Replace the mobile **Invite** tab with **Weekend** and keep the five-tab bar fast and reliable.
- Add a lightweight **Weekend** screen with four sections loaded only when opened: Schedule, Practice, Qualifying, and Race.
- Keep the existing **Paddock** page for locked group predictions and the post-race debrief.
- Remove navigation-blocking data refreshes so moving between Predict, Paddock, and Weekend responds immediately on mobile.
- Upgrade prediction sharing with direct PNG creation, native image sharing where supported, image download, and English text sharing as a fallback.

## Weekend screen

- **Schedule:** session names, local times, live/upcoming/completed status, and countdown to the next session.
- **Practice:** FP1/FP2/FP3 or sprint-practice classification, driver order, lap time, and laps completed when supplied by the source.
- **Qualifying:** Q1/Q2/Q3 classification and the confirmed starting grid.
- **Race:** live weekend state before results, then final classification, status/DNF, fastest lap, and race summary after results arrive.
- Fetch each detailed section only when selected, cache it locally, and show compact timing rows rather than heavy imagery.

## Mobile reliability

- Use only app navigation links in the bottom bar, enlarge touch targets, respect the phone safe area, and prevent the prediction drag surface from swallowing navigation taps.
- Move background F1 refresh work away from route entry; existing stored data renders first and refreshes without blocking navigation.
- Preserve all scoring, prediction locks, driver exclusions, team filters, reveal rules, and existing data protections.

## Technical details

- Extend the throttled F1 sync to store weekend sessions and classifications from the existing data source, while keeping paginated race-result retrieval.
- Add read-only public access for published session data and service access for syncing.
- Render the share image in the browser at a stable portrait size with the race, player, top 10, team colors, and bonus picks.
- Add unique title, description, Open Graph title/description, `og:type`, and Twitter card metadata to every content screen.
- Test navigation and the central prediction/share flows at desktop and phone widths, then verify the latest build and runtime logs.
