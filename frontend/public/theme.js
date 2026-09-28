// Applied before the first paint so a dark user never sees a white flash.
// Kept as a separate file, not inline, because the Content-Security-Policy
// allows scripts only from this origin. Keep in sync with src/shared/lib/theme.ts.
(function () {
  try {
    var theme = localStorage.getItem("crm-theme") === "dark" ? "dark" : "light";
    if (theme === "dark") document.documentElement.classList.add("dark");
    document.documentElement.style.colorScheme = theme;
  } catch {
    document.documentElement.style.colorScheme = "light";
  }
})();
