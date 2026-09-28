import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Boot } from "@/app/Boot";
import { ErrorBoundary } from "@/app/ErrorBoundary";
import { Providers } from "@/app/providers";
import { AppRouter } from "@/app/router";
import "@/index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <Providers>
        <Boot>
          <AppRouter />
        </Boot>
      </Providers>
    </ErrorBoundary>
  </StrictMode>,
);
