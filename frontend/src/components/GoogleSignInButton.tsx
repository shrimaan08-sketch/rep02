"use client";

import { useEffect, useRef, useState } from "react";
import api from "@/lib/api";
import { useAuth } from "@/lib/auth";

declare global {
  interface Window {
    google?: any;
  }
}

const GSI_SRC = "https://accounts.google.com/gsi/client";

function loadGsiScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return reject();
    if (window.google?.accounts?.id) return resolve();
    const existing = document.querySelector(`script[src="${GSI_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject());
      return;
    }
    const script = document.createElement("script");
    script.src = GSI_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject();
    document.head.appendChild(script);
  });
}

/**
 * Renders the official "Sign in with Google" button, but only when the backend
 * reports a configured Google client id (GET /auth/config). Until then — or if
 * the API is unreachable — it renders nothing, so the surrounding form still
 * works with email/password.
 */
export default function GoogleSignInButton({ onError }: { onError?: (msg: string) => void }) {
  const { loginWithGoogle } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const [clientId, setClientId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get("/auth/config")
      .then((res) => {
        if (!cancelled) setClientId(res.data?.googleClientId ?? null);
      })
      .catch(() => {
        /* API unreachable or Google not configured — stay hidden. */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!clientId || !containerRef.current) return;
    let cancelled = false;
    loadGsiScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.google?.accounts?.id) return;
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async (response: { credential?: string }) => {
            if (!response.credential) return;
            try {
              await loginWithGoogle(response.credential);
            } catch (err: any) {
              onError?.(err?.message || "Google sign-in failed.");
            }
          },
        });
        containerRef.current.innerHTML = "";
        window.google.accounts.id.renderButton(containerRef.current, {
          theme: "outline",
          size: "large",
          width: 320,
          text: "continue_with",
          shape: "rectangular",
          logo_alignment: "center",
        });
      })
      .catch(() => {
        /* Script blocked/offline — stay hidden. */
      });
    return () => {
      cancelled = true;
    };
  }, [clientId, loginWithGoogle, onError]);

  if (!clientId) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-hairline" />
        <span className="text-2xs uppercase tracking-wider text-ink-400">or</span>
        <span className="h-px flex-1 bg-hairline" />
      </div>
      <div ref={containerRef} className="flex justify-center" />
    </div>
  );
}
