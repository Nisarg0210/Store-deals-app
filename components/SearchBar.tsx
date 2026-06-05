'use client';

interface SearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export default function SearchBar({ searchQuery, onSearchChange }: SearchBarProps) {
  return (
    <div className="search-bar-wrapper">
      <span className="search-bar-wrapper__icon" aria-hidden>
        🔍
      </span>
      <input
        type="search"
        enterKeyHint="search"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        placeholder="Search deals..."
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        className="form-input"
      />
    </div>
  );
}
