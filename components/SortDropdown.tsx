'use client';

export type SortOption = 'newest' | 'price-asc' | 'price-desc' | 'discount-desc';

interface SortDropdownProps {
  sortOption: SortOption;
  onSortChange: (option: SortOption) => void;
}

export default function SortDropdown({ sortOption, onSortChange }: SortDropdownProps) {
  return (
    <div className="sort-dropdown">
      <select
        value={sortOption}
        onChange={(e) => onSortChange(e.target.value as SortOption)}
        className="form-input sort-dropdown__select"
      >
        <option value="newest">Newest First</option>
        <option value="price-asc">Price: Low to High</option>
        <option value="price-desc">Price: High to Low</option>
        <option value="discount-desc">Biggest Discount</option>
      </select>
    </div>
  );
}
