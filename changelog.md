# Changelog

## v26.11.14
Games from a Steam Family library in your play log, Steam icons that load again, ten more games that can be beaten, and template updates as a pull request

### Steam

- fix: **Icons** for newer games and achievements load again
  Steam stopped serving newer icons from the address the site used; every Steam icon now comes from Steam's current one.
- fix: **Steam Family games** show up in your play log and recently played
  Games you play from someone else's library never appeared, because Steam leaves them out of your own games. Their session times are approximate, to the half hour, because Steam doesn't say when they were last played.
- new: **Beaten markers** for ten more games
  Terraria, Raft, Stardew Valley, Far Cry 3, Monster Hunter Rise, Sekiro, Left 4 Dead 2, Shining Resonance Refrain, TBH: Task Bar Hero and Metro: Last Light (the original release; Redux already had one).

### Structure

- new: **Template updates** arrive as a pull request every Monday
  Merge it to update your site. Your config, series, art picks and avatar are kept. See Getting updates in the README.

## v26.11.11
Your Savepoint hub, ready to fill with your own games.

### Structure

- new: **Savepoint** hub for RetroAchievements, Steam and Xbox
  The hub, a profile page per platform, Activity, Completions, Analytics, Series and this changelog, fed by your own data every hour.
- new: **Admin panel** for series, art, config and data runs
  Runs on your computer with `npm run admin`; never deployed.
- new: **Top bar** starts with the Savepoint wordmark, then your name
- new: **Posters** for your README from your own site: `npm run posters`
