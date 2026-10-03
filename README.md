# Amendola Studios

Company website for Amendola Studios. Static site with no build step: plain HTML, CSS and JavaScript.

## Structure

```
index.html        Page markup (Italian copy inline, used before JS runs and for SEO)
css/styles.css    All styles, design tokens at the top (:root)
js/content.js     Every string in Italian and English, plus apps, services, lab, photos, timeline
js/main.js        Language switch, carousels, accordions, loop, scroll reveal, contact form
assets/           App icons and screenshots, photos, book cover, favicon, social image
```

## Edit content

All text lives in `js/content.js`. Each entry has an `it` and an `en` version. To add an app, add an object to `apps` and put `<slug>-icon.png` and `<slug>-shot.jpg` in `assets/apps/`.

## Language

The site starts in Italian when the browser language is Italian, otherwise in English. The IT/EN switch in the header remembers the choice in `localStorage`.

## Contact form

There is no backend. Submitting the form opens the visitor's mail app with the message addressed to checcofran717@gmail.com. To receive messages directly, point the form at a service such as Formspree or Netlify Forms.

## Run locally

```bash
npx serve .
```

## Deploy

Any static host works. For GitHub Pages: push this folder to a repository, then Settings > Pages > Deploy from branch `main`, folder `/`.
