"use client";

import { useCallback, useEffect, useId, useRef } from "react";
import Script from "next/script";

interface GoogleCredentialResponse {
  credential: string;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: GoogleCredentialResponse) => void;
          }) => void;
          renderButton: (
            container: HTMLElement,
            options: {
              type: "standard";
              theme: "outline" | "filled_blue" | "filled_black";
              size: "large" | "medium" | "small";
              shape: "pill" | "rectangular";
              text: "signin_with" | "signup_with" | "continue_with";
              width?: number;
            },
          ) => void;
        };
      };
    };
  }
}

interface GoogleSignInButtonProps {
  onCredential: (idToken: string) => void;
  text?: "signin_with" | "signup_with";
}

export function GoogleSignInButton({ onCredential, text = "signin_with" }: GoogleSignInButtonProps) {
  const containerId = `google-signin-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const onCredentialRef = useRef(onCredential);
  useEffect(() => {
    onCredentialRef.current = onCredential;
  });

  const render = useCallback(() => {
    const container = document.getElementById(containerId);
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!window.google || !container || !clientId || container.childElementCount > 0) return;

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: (response) => onCredentialRef.current(response.credential),
    });
    window.google.accounts.id.renderButton(container, {
      type: "standard",
      theme: "outline",
      size: "large",
      shape: "pill",
      text,
      width: 360,
    });
  }, [containerId, text]);

  useEffect(() => {
    render();
  }, [render]);

  return (
    <>
      <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" onReady={render} onLoad={render} />
      <div id={containerId} className="flex justify-center" />
    </>
  );
}
