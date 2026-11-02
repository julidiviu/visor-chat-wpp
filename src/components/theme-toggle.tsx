"use client";

import { useEffect, useState } from "react";
import { MonitorIcon, MoonIcon, SunIcon } from "./icons";

type Theme = "system" | "light" | "dark";

const NEXT: Record<Theme, Theme> = {
  system: "light",
  light: "dark",
  dark: "system",
};

const LABEL: Record<Theme, string> = {
  system: "Tema del sistema",
  light: "Tema claro",
  dark: "Tema oscuro",
};

function isDark(theme: Theme): boolean {
  return (
    theme === "dark" ||
    (theme === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches)
  );
}

function apply(theme: Theme) {
  document.documentElement.classList.toggle("dark", isDark(theme));
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    const stored = localStorage.getItem("wpp-theme") as Theme | null;
    if (stored === "light" || stored === "dark" || stored === "system") {
      // Lectura única de la preferencia guardada; no hay estado externo que suscribir.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTheme(stored);
    }
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => {
      if (theme === "system") apply(theme);
    };
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, [theme]);

  function cycle() {
    const next = NEXT[theme];
    setTheme(next);
    localStorage.setItem("wpp-theme", next);
    apply(next);
  }

  const Icon = theme === "light" ? SunIcon : theme === "dark" ? MoonIcon : MonitorIcon;

  return (
    <button
      type="button"
      onClick={cycle}
      title={LABEL[theme]}
      aria-label={`${LABEL[theme]}. Cambiar tema`}
      className="grid size-10 place-items-center rounded-full text-muted transition-colors hover:bg-panel-soft hover:text-ink"
    >
      <Icon className="size-[18px]" />
    </button>
  );
}
