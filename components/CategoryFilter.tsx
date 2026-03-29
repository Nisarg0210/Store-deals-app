'use client';

interface CategoryFilterProps {
  categories: string[];
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
}

export default function CategoryFilter({ categories, selectedCategory, onSelectCategory }: CategoryFilterProps) {
  return (
    <div className="deal-grid__categories">
      <button
        className={`category-chip ${selectedCategory === 'All' ? 'category-chip--active' : ''}`}
        onClick={() => onSelectCategory('All')}
      >
        All Deals
      </button>
      {categories.map((cat, idx) => (
        <button
          key={idx}
          className={`category-chip ${selectedCategory === cat ? 'category-chip--active' : ''}`}
          onClick={() => onSelectCategory(cat)}
        >
          {cat}
        </button>
      ))}
    </div>
  );
}
