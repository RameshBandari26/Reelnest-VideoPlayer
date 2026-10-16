# Reelnest release guide

How to put Reelnest in front of real users: a website people can find, and installers they can download.

```
 Person searches "free video player"
              |
              v
   Your website (Netlify, free)  ---- plays videos in the browser
              |
              +-- Download for Windows / macOS / Linux  -->  GitHub Release  (built by GitHub Actions)
              +-- Download for Android                  -->  GitHub Release  (APK built by EAS)
```

Everything below uses free tiers except the optional items in "Costs".
I wrote the build files and tested the web app, but I could not run the GitHub workflow or the installers
myself, so expect to fix small things on the first run. Send me any error text.

---

## 0. Before you publish anything

1. **The name is Reelnest.** Before you launch, do these four checks once (a search is not a legal clearance):
   - Search `"Reelnest"` in quotes on Google and in the Google Play Store.
   - Check the domain you want (for example `reelnest.com` or `reelnest.app`) at any registrar.
   - Search your country's trademark register. India: IP India public search.
   - Check that the GitHub repository name `reelnest` is free on your account (it will be, it is your account).
   If a check turns up a conflict, tell me and I will rename the project in one pass.
2. **Do not use the word "PLAYit" in your site text, keywords or descriptions.** Using a competitor's trademark
   to attract searches can get your site or app listing taken down.
3. **App icon.** The icon pack already has every size you need.
   - Use the icon pack (`reelnest-icons.zip`). Its `PLACEMENT.txt` lists where each file goes (mobile `assets`, desktop `build`, web `public`).
4. **Privacy policy.** `apps/web/public/privacy.html` is a template. Replace `REPLACE-WITH-DATE` and
   `REPLACE-WITH-YOUR-EMAIL`. The Play Store requires a privacy policy link for apps like this.
5. **Screenshots.** Take 3 or 4 screenshots (desktop, mobile). You need them for the website and the Play Store.

---

## 1. Put the code on GitHub

1. Create a free account at github.com and click **New repository**. Name it `reelnest`.
2. Choose **Public**. This matters: the download links on the website only work for anonymous visitors if the
   repository is public. (A private repository would need a different file host.)
3. In the project folder (`Lumo2`):
   ```
   git remote add origin https://github.com/YOUR-USERNAME/reelnest.git
   git branch -M main
   git add .
   git commit -m "first release"
   git push -u origin main
   ```
   If Git asks you to sign in, use the browser sign-in it offers.
4. Open `apps/web/src/config.js` and set your repository:
   ```js
   export const REPO = 'YOUR-USERNAME/reelnest';
   ```
   Commit and push again. Do this now; the buttons stay inactive until the release in step 3 exists.

---

## 2. Deploy the website (Netlify, free)

The repo root already has `netlify.toml` with the right build settings.

1. Sign up at netlify.com with your GitHub account.
2. **Add new site > Import an existing project > GitHub >** pick `reelnest`.
3. Netlify reads `netlify.toml`. Leave the settings as they are and click **Deploy**.
   Build commands used: `npm install -w @lumo/web && npm run build -w @lumo/web`, publishing `apps/web/dist`.
4. After 1 to 3 minutes you get an address like `something.netlify.app`. Open it and test:
   - choose a video file and play it, drag the seek bar
   - let a video end: the 30 second "what next?" card should appear
5. **Custom domain** (recommended, it looks trustworthy and helps search): buy a domain from any registrar,
   then in Netlify go to **Domain management > Add a domain** and follow the DNS instructions.
   HTTPS is set up automatically.
6. Replace the placeholder `YOUR-DOMAIN` with your real domain in three files, then commit and push:
   - `apps/web/index.html` (canonical link and `og:url`)
   - `apps/web/public/robots.txt`
   - `apps/web/public/sitemap.xml`

Every later `git push` to `main` redeploys the site automatically.
Cloudflare Pages and Vercel work too with the same two commands.

---

## 3. Build the desktop installers (GitHub Actions)

The file `.github/workflows/release.yml` builds Windows, macOS and Linux installers on GitHub's own machines,
so you do not need a Mac or Linux computer.

1. The tag must match the desktop version. `apps/desktop/package.json` says `"version": "0.1.0"`, so use tag `v0.1.0`:
   ```
   git tag v0.1.0
   git push origin v0.1.0
   ```
2. On GitHub open the **Actions** tab and watch **Release desktop apps**. It takes about 10 to 20 minutes.
   Three jobs run (Windows, macOS, Ubuntu). A green tick on all three means success.
3. Open **Releases** (right side of the repo page). You will see a **draft** release `v0.1.0` containing:
   `Reelnest-Setup.exe`, `Reelnest-mac.dmg`, `Reelnest-linux.AppImage`.
   **Do not publish yet.** First add the Android file (step 4), then publish.

If a job fails, open it, expand the red step and send me the last 30 lines.

Build on your own Windows PC instead (only gives you the Windows installer):
`npm run dist -w @lumo/desktop`, result in `apps/desktop/release`.

**What your users will see (because the installers are not code-signed):**

| System | Warning | What the user does |
|---|---|---|
| Windows | "Windows protected your PC" (SmartScreen) | More info, then Run anyway |
| macOS | "cannot be opened because the developer cannot be verified" | Right-click the app, Open. Or System Settings, Privacy and Security, Open Anyway |
| Linux | none | `chmod +x Reelnest-linux.AppImage`, then run it |

Warnings disappear only with paid code-signing (a Windows certificate; the Apple Developer Program for macOS).
Put a short "first run" note under the download buttons on the site so users are not scared off.

---

## 4. Build the Android APK

1. In `apps\mobile` run:
   ```
   eas build -p android --profile preview
   ```
2. When it finishes, open the build page and download the `.apk`.
3. Rename it exactly `Reelnest.apk` (the website button expects this name).
4. On GitHub open the **draft release** from step 3, click **Edit**, drag `Reelnest.apk` into the files area, and save.
5. Now click **Publish release**.

Users installing the APK outside the Play Store must allow "Install unknown apps" for their browser once.
Say this on the site, e.g. "After downloading, tap the file and allow installs from this source."

---

## 5. Check the website buttons

Reload your site (`https://YOUR-DOMAIN/`). The download section shows the visitor's own system first, then the rest.
Click each button on a device that matches and make sure the file downloads:
Windows `.exe`, macOS `.dmg`, Linux `.AppImage`, Android `.apk`. iPhone stays "coming soon".

If a button 404s, the file name in the release does not match `apps/web/src/config.js`. Names must be exactly
`Reelnest-Setup.exe`, `Reelnest-mac.dmg`, `Reelnest-linux.AppImage`, `Reelnest.apk`.

---

## 6. Help people find it

People discover software three ways: search, other websites, and word of mouth.

1. **Google Search Console** (search.google.com/search-console): add your domain, verify it (a DNS record from
   your registrar), then submit `https://YOUR-DOMAIN/sitemap.xml`. Do the same on Bing Webmaster Tools.
2. **Write for real searches.** People type things like "free video player for Windows" or "video player with
   subtitles". Your page title and description already say this. Add a short text section under the app with
   those phrases and your real features.
3. **Be realistic about timing.** A new site usually takes weeks to appear in results and months to rank for
   competitive phrases like "video player". Expect most early visitors to come from places you post, not from search.
4. **Create places to link from:** a short demo video on YouTube (link to the site in the description), a post in
   relevant communities (Reddit, Product Hunt, Indian developer groups, Telegram or WhatsApp groups), and your
   GitHub README (add a link to the site and screenshots).
5. **Speed and mobile.** The page is small and mobile friendly already; keep it that way.

---

## 7. Releasing updates later

- **Website:** edit, commit, push. Netlify redeploys in minutes.
- **Desktop:** raise `version` in `apps/desktop/package.json` (e.g. 0.1.1), commit, then tag `v0.1.1` and push the tag.
  Desktop apps do not auto-update yet; users download the new installer. (Auto-update with `electron-updater` is a good next feature.)
- **Android:** raise `version` and `android.versionCode` in `apps/mobile/app.json`, rebuild with EAS, replace
  `Reelnest.apk` on the new release.
- GitHub's `releases/latest/download/...` links always point at the newest published release, so the website
  buttons need no change.

---

## 8. Later: Google Play Store (recommended for trust and easy installs)

1. Create a Google Play developer account (one-time registration fee).
2. Build the store format: `eas build -p android --profile production` (creates an `.aab`).
3. Prepare: app icon, screenshots, short and full description, privacy policy link (`.../privacy.html`).
4. Fill in Play Console's **Data safety** form (Reelnest collects no data) and the **photo and video permissions**
   declaration: explain that video and music playback is the app's core purpose.
5. New personal developer accounts may be required to run a closed test with a number of testers for a couple of
   weeks before they can publish. Check Google's current rules when you register, because they change.
6. Once live, add the Play Store link to `DOWNLOADS.android` in `config.js`.

iPhone: needs the Apple Developer Program (yearly fee) and an iOS build through EAS. Until then it stays "coming soon".

---

## Costs

| Item | Cost |
|---|---|
| GitHub (public repo, Actions, Releases), Netlify | Free tiers |
| EAS cloud builds | Free tier has a monthly build limit |
| Domain name | Small yearly fee |
| Google Play developer account | One-time fee |
| Apple Developer Program | Yearly fee |
| Code-signing certificates | Optional, paid; removes install warnings |

---

## Launch checklist

- [ ] Name checked (or renamed)
- [ ] Icon added (mobile and desktop)
- [ ] `privacy.html` filled in
- [ ] Code on a public GitHub repo
- [ ] `REPO` set in `config.js`
- [ ] Site deployed on Netlify, custom domain connected
- [ ] `YOUR-DOMAIN` replaced in `index.html`, `robots.txt`, `sitemap.xml`
- [ ] Tag `v0.1.0` pushed, all three Actions jobs green
- [ ] `Reelnest.apk` added to the draft release, release published
- [ ] Every download button tested
- [ ] Sitemap submitted to Google Search Console
- [ ] Demo video and first posts shared