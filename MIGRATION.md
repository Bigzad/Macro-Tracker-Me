# Auth Refactor — Minimal Migration Guide

This bundle gives you a single, stable auth system.

## Load order
```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="./supabase-config.js"></script>
<script src="./auth-manager.js"></script>
```

## Login page
```js
await authWrapper.init();
authWrapper.redirectIfAuthed("app.html");
authWrapper.on("login", () => location.href = "app.html");
```

## Protected page
```js
await authWrapper.init();
await authWrapper.requireAuthOrRedirect("index.html");
authWrapper.on("logout", () => location.href = "index.html");
```

All other legacy auth files can be deleted or ignored.
