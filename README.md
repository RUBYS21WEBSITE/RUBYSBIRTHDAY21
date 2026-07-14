# Birthday Memory Site

A single-page birthday gift whose private content is encrypted before it is published to GitHub Pages.

## Privacy model

- `.private/` contains names, messages, original photos, audio, and the unencrypted preview. Git ignores this entire directory.
- `docs/index.html` is the only publishable page. It contains an encrypted payload and the password prompt.
- Photos are resized, re-encoded to remove camera/location metadata, embedded in the page, and encrypted with the rest of the site.
- Never force-add `.private/` or original photos to Git.

## Add your content

1. Copy `content.example.json` to `.private/content.json`.
2. Put photos in `.private/photos/` and optional audio in `.private/audio/`.
3. Reference them from `.private/content.json`, for example `"image": "photos/first-date.jpg"`.
4. Run `npm run preview` and open `http://localhost:4173`.

## Create the encrypted page

Run `npm run lock`. StatiCrypt asks for the password without placing it in shell history. Use a long, memorable passphrase rather than a name or date.

Only commit after `npm run lock` completes and its privacy check passes.

## Publish

Publish the `docs/` folder from the `main` branch in GitHub Pages settings. The standard GitHub Pages URL is public, but the names, writing, photos, and audio inside `docs/index.html` are encrypted.

