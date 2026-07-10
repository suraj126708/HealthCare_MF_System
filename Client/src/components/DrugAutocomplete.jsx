import { useEffect, useId, useRef, useState } from "react";
import { searchRxNormDrugs } from "../services/rxnorm";
import { inputInline } from "../constants/ui";

export default function DrugAutocomplete({
  value,
  onChange,
  onBlur,
  placeholder = "Search drug (RxNorm)",
  disabled = false,
  error,
}) {
  const listId = useId();
  const rootRef = useRef(null);
  const debounceRef = useRef(null);
  const abortRef = useRef(null);

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    const onDocMouseDown = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  const runSearch = (term) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (abortRef.current) abortRef.current.abort();

    const trimmed = String(term || "").trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setLoading(false);
      setActiveIndex(-1);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const results = await searchRxNormDrugs(trimmed, { signal: controller.signal });
        setSuggestions(results);
        setActiveIndex(results.length ? 0 : -1);
      } catch (err) {
        if (err?.name !== "AbortError") {
          setSuggestions([]);
        }
      } finally {
        setLoading(false);
      }
    }, 300);
  };

  const pick = (name) => {
    onChange(name);
    setOpen(false);
    setSuggestions([]);
    setActiveIndex(-1);
  };

  const onKeyDown = (e) => {
    if (!open || !suggestions.length) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      pick(suggestions[activeIndex].name);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <input
        type="text"
        value={value || ""}
        disabled={disabled}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        className={[
          inputInline,
          error ? "border-red-400 dark:border-red-500" : "",
        ].join(" ")}
        onChange={(e) => {
          const next = e.target.value;
          onChange(next);
          setOpen(true);
          runSearch(next);
        }}
        onFocus={() => {
          setOpen(true);
          runSearch(value);
        }}
        onBlur={() => {
          onBlur?.();
          setTimeout(() => setOpen(false), 120);
        }}
        onKeyDown={onKeyDown}
      />

      {open && (loading || suggestions.length > 0) && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-xl border border-border bg-surface py-1 shadow-lg"
        >
          {loading && (
            <li className="px-3 py-2 text-xs text-text-muted">Searching RxNorm…</li>
          )}
          {!loading &&
            suggestions.map((item, idx) => (
              <li key={`${item.rxcui || item.name}-${idx}`}>
                <button
                  type="button"
                  role="option"
                  aria-selected={idx === activeIndex}
                  className={[
                    "w-full px-3 py-2 text-left text-sm transition-colors",
                    idx === activeIndex
                      ? "bg-surface-muted text-text"
                      : "text-text hover:bg-surface-muted",
                  ].join(" ")}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(item.name)}
                >
                  {item.name}
                </button>
              </li>
            ))}
        </ul>
      )}

      {error && <div className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</div>}
    </div>
  );
}
