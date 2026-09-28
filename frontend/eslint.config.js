import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { ignores: ["dist"] },
  {
    // Plain browser script served as-is from public/, linted like the rest.
    files: ["public/**/*.js"],
    languageOptions: {
      globals: {
        document: "readonly",
        localStorage: "readonly",
        window: "readonly",
      },
    },
  },
);
