import React, { useState, useRef, useEffect } from "react";
import { useTheme } from "../contexts/ThemeContext.jsx";
import { PALETTES } from "../config/themeTokens.js";

export default function PaletteSwitcher() {
  const { palette, setPalette } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef(null);
  const toggleRef = useRef(null);

  // Close the panel when clicking outside
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target) &&
        toggleRef.current && !toggleRef.current.contains(e.target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const burstConfetti = (e) => {
    const target = e.currentTarget;
    const colors = ['#7D53DE', '#d97706', '#e64980', '#0f9f8e', '#f5c518', '#f43f5e', '#c19bff'];
    const rect = target.getBoundingClientRect();
    const xOrigin = rect.left + rect.width / 2 + window.scrollX;
    const yOrigin = rect.top + rect.height / 2 + window.scrollY;

    for (let i = 0; i < 24; i++) {
      const el = document.createElement('div');
      el.className = 'confetti';
      
      const color = colors[Math.floor(Math.random() * colors.length)];
      el.style.backgroundColor = color;
      
      const angle = Math.random() * Math.PI * 2;
      const velocity = 30 + Math.random() * 80;
      const xTarget = Math.cos(angle) * velocity;
      const yTarget = Math.sin(angle) * velocity - (20 + Math.random() * 40);
      const rotation = Math.random() * 360;

      el.style.left = `${xOrigin}px`;
      el.style.top = `${yOrigin}px`;
      el.style.setProperty('--x', `${xTarget}px`);
      el.style.setProperty('--y', `${yTarget}px`);
      el.style.setProperty('--r', `${rotation}deg`);

      document.body.appendChild(el);

      setTimeout(() => {
        el.remove();
      }, 800);
    }
  };

  const handleSelect = (key, e) => {
    setPalette(key);
    burstConfetti(e);
  };

  return (
    <>
      {/* Floating Theme Palette Toggle */}
      <button
        ref={toggleRef}
        className="theme-controller-toggle"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle theme settings"
        title="Pilih Tema"
      >
        🎨
      </button>

      {/* Theme Selection Panel */}
      {isOpen && (
        <div 
          ref={panelRef}
          className="theme-controller" 
          role="radiogroup" 
          aria-label="Theme Controller"
        >
          <div className="theme-controller-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Pilih Tema &amp; Mode</span>
            <button 
              onClick={() => setIsOpen(false)}
              className="theme-controller-close"
              aria-label="Close theme settings"
              style={{
                background: 'none',
                border: 'none',
                fontSize: '18px',
                cursor: 'pointer',
                padding: '4px',
                color: 'var(--color-fg-faint)',
                lineHeight: 1,
              }}
            >
              &times;
            </button>
          </div>
          
          <div className="theme-group-title">Malam (Glow Vibe)</div>
          <div className="theme-buttons">
            <button
              className={`btn-theme-select ${palette === "cosmicDark" ? "active" : ""}`}
              onClick={(e) => handleSelect("cosmicDark", e)}
            >
              Plum
            </button>
            <button
              className={`btn-theme-select ${palette === "nebulaDark" ? "active" : ""}`}
              onClick={(e) => handleSelect("nebulaDark", e)}
            >
              Gold
            </button>
            <button
              className={`btn-theme-select ${palette === "roseDark" ? "active" : ""}`}
              onClick={(e) => handleSelect("roseDark", e)}
            >
              Rosewood
            </button>
            <button
              className={`btn-theme-select ${palette === "emeraldDark" ? "active" : ""}`}
              onClick={(e) => handleSelect("emeraldDark", e)}
            >
              Emerald
            </button>
          </div>

          <div className="theme-group-title" style={{ marginTop: 6 }}>Terang (Paper Vibe)</div>
          <div className="theme-buttons">
            <button
              className={`btn-theme-select ${palette === "lavenderLight" ? "active" : ""}`}
              onClick={(e) => handleSelect("lavenderLight", e)}
            >
              Lavender
            </button>
            <button
              className={`btn-theme-select ${palette === "sunburstLight" ? "active" : ""}`}
              onClick={(e) => handleSelect("sunburstLight", e)}
            >
              Champagne
            </button>
            <button
              className={`btn-theme-select ${palette === "roseLight" ? "active" : ""}`}
              onClick={(e) => handleSelect("roseLight", e)}
            >
              Blush
            </button>
            <button
              className={`btn-theme-select ${palette === "botanicalLight" ? "active" : ""}`}
              onClick={(e) => handleSelect("botanicalLight", e)}
            >
              Sage
            </button>
          </div>
        </div>
      )}
    </>
  );
}
