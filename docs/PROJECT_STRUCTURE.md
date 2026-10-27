# Project Structure

```text
Bhaktipath/
├── App.tsx
├── app.json
├── eas.json
├── package.json
├── tsconfig.json
├── jest.config.js
├── README.md
├── .gitignore
├── .github/
│   └── workflows/
│       └── android.yml
├── src/
│   ├── domain/
│   │   ├── lrc.ts
│   │   ├── lyrics.ts
│   │   ├── repetition.ts
│   │   └── __tests__/
│   │       ├── lrc.test.ts
│   │       ├── lyrics.test.ts
│   │       └── repetition.test.ts
│   ├── services/
│   │   └── AudioPlaybackService.ts
│   └── types/
└── docs/
    ├── PRD.md
    ├── ARCHITECTURE.md
    ├── IMPLEMENTATION_PLAN.md
    ├── PROJECT_STRUCTURE.md
    ├── TEST_PLAN.md
    ├── ANDROID_APK_BUILD.md
    └── PHONE_ONLY_BUILD.md
```

## Conventions
- Keep reusable business rules in `src/domain`.
- Keep platform integrations in services/adapters rather than domain logic.
- Store tests beside the domain package under `__tests__`.
- Never commit generated `android/` or `ios/` folders unless native project management becomes intentional.
- Never commit secrets, keystores or signing credentials.