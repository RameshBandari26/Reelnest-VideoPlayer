// ONE setting to change before launch: your GitHub repository, as "username/repo".
// The download buttons point at the newest GitHub Release of that repository.
// Leave it empty and the buttons show "coming soon".
export const REPO = "RameshBandari26/Reelnest-VideoPlayer"; // e.g. 'ramesh/Reelnest'

const base = REPO ? `https://github.com/${REPO}/releases/latest/download/` : "";

// File names must match what the release contains (the desktop build workflow names the
// first three; you upload Reelnest.apk yourself). Paste a full URL instead to host a file elsewhere.
export const DOWNLOADS = {
  windows: base && `${base}Reelnest-Setup.exe`,
  mac: base && `${base}Reelnest-mac.dmg`,
  linux: base && `${base}Reelnest-linux.AppImage`,
  android: base && `${base}Reelnest.apk`,
  ios: "", // needs an Apple developer account; shown as "coming soon"
};
