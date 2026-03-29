'use client';

interface SearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export default function SearchBar({ searchQuery, onSearchChange }: SearchBarProps) {
  return (
    <div className="search-bar-wrapper" style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
      <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>
        🔍
      </span>
      <input
        type="text"
        placeholder="Search deals..."
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        className="form-input"
        style={{ paddingLeft: '2.5rem' }}
      />
    </div>
  );
}
