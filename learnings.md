# 📘 Learnings on sat 21 march 2026 

## useRouter

In Next.js (App Router), the application is automatically wrapped with an internal router context at runtime.

The `useRouter` hook (from `next/navigation`) reads from this context to access navigation functionality.

### Key points

- `useRouter` depends on **App Router context**
- This context is **automatically provided by Next.js** when the app runs
- Any component using `useRouter` must be rendered **within the Next.js app tree**

### Testing implications

- When a component using `useRouter` is rendered in isolation (e.g. in unit tests), the router context is **not present**
- This causes the error:

  > "invariant expected app router to be mounted"

- To fix this, you must:
  - **mock `next/navigation`**, or
  - wrap the component with a custom provider (advanced)

### Mental model

> `useRouter` is not standalone — it consumes router state from a context provided by Next.js

```
import { vi } from 'vitest'
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push,
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/campaign-builder',
  useSearchParams: () => new URLSearchParams(),
}))

describe('CampaignBuilderPage', () => {
  it('renders active session state', () => {
    render(<CampaignBuilderPage />)
    // assertions...
  })
})
```

# persist

`persist` in Zustand is a middleware that abstracts the process of 
saving, loading (rehydration), and syncing state with a storage layer 
(e.g. localStorage).

Instead of manually managing storage (setItem, getItem, JSON parsing, etc.),
`persist` handles it automatically.

### Key points

- Persists state across page reloads (refresh-safe)
- Automatically rehydrates state when the app loads
- Keeps Zustand state in sync with storage
- Uses `localStorage` by default
- Can be configured to use other storage (e.g. sessionStorage, AsyncStorage)

### Mental model

persist = state persistence logic  
storage = where the data is stored (localStorage, etc.)


## partialize

because in zustand we do not want to persist the entire store hence we use `partialize` to compartmentalize 
the store to inform zustand which part of the store we want to persist or not 


## merge

merge is useful to inform zustand when the page reload on how to sync the state

```
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<CampaignStore>;

        return {
          ...currentState,
          ...persisted,
          ui: {
            ...currentState.ui,
            ...persisted.ui,
          },
        };
      },
``` 


