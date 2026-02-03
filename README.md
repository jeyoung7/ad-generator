# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

## Remotion Word-By-Word Captions (TikTok Template)

This app now supports a caption mode from the UI:
- `Caption Mode` -> `Add Remotion animated word-by-word captions`
- Styles: `impact`, `clean`, `kinetic`

The server will call a Remotion project after rendering the reel.
Captioning is now the default for both `/api/generate` and `/api/generate-from-plan`.
To disable for a request, send `captionMode: "none"`.

### 1) Create Remotion TikTok project

```bash
npx create-video@latest --tiktok
```

Set `REMOTION_TIKTOK_DIR` to that project path (or place it at `./remotion-template-tiktok`).

### 2) Add a bridge script in the Remotion project

In the Remotion project's `package.json`, add:

```json
{
  "scripts": {
    "caption:video": "node scripts/caption-video.mjs"
  }
}
```

That script must accept CLI args:
- `--input <path>`
- `--output <path>`
- `--style impact|clean|kinetic`

### 3) Run this app

When `/api/generate-from-plan` receives `captionMode: "remotion-word"`, it will run:

```bash
npm --prefix <REMOTION_TIKTOK_DIR> run caption:video -- --input ... --output ... --style ...
```

If Remotion is not configured, generation still succeeds and returns the non-captioned reel.
