"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { ThemeProvider as StyledThemeProvider, createGlobalStyle } from "styled-components";

export type Theme = "light" | "dark";

interface ThemeContextProps {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextProps | undefined>(undefined);

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
};

const lightTheme = {
  colors: {
    background: "#F0F2F5",
    foreground: "#1A202C",
  },
};

const darkTheme = {
  colors: {
    background: "#1A202C",
    foreground: "#F0F2F5",
  },
};

const GlobalStyle = createGlobalStyle`
  body {
    transition: background-color 0.3s ease, color 0.3s ease;
  }
`;

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    if (stored === "light" || stored === "dark") {
      setTheme(stored);
      document.documentElement.classList.toggle("dark", stored === "dark");
      return;
    }

    const hour = new Date().getHours();
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const night = hour >= 18 || hour < 6;
    const initial = prefersDark || night ? "dark" : "light";
    setTheme(initial);
    document.documentElement.classList.toggle("dark", initial === "dark");
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === "light" ? "dark" : "light";
      localStorage.setItem("theme", next);
      document.documentElement.classList.toggle("dark", next === "dark");
      return next;
    });
  };

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <StyledThemeProvider theme={theme === "light" ? lightTheme : darkTheme}>
        <GlobalStyle />
        {children}
      </StyledThemeProvider>
    </ThemeContext.Provider>
  );
}
