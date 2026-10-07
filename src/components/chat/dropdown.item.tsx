import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Search, Building2 } from "lucide-react";
import { BUSINESS_CATEGORIES } from "@/lib/data/business.categories";

interface DropdownItemProps {
  listId: string;
  message: string;
  onSelect: (value: string) => void;
}

export function DropdownItem({ listId, message, onSelect }: DropdownItemProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Determine list
  let items: { id: string; name: string }[] = [];
  if (listId === "business_categories") {
    items = BUSINESS_CATEGORIES;
  }

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="absolute bottom-full left-0 mb-3 px-2 z-50" ref={dropdownRef}>
      <div className="relative min-w-[240px] max-w-[320px]">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex items-center justify-between w-full gap-2.5 bg-[#1e1e1e] border border-zinc-700/60 hover:bg-[#2a2a2a] hover:border-zinc-500 transition-colors px-3 py-2.5 rounded-xl text-[13px] text-zinc-300"
        >
          <span className="flex items-center gap-2.5 truncate">
            <Building2 size={15} className="text-zinc-400 flex-shrink-0" />
            <span className="truncate">{message || "Select a category..."}</span>
          </span>
          <ChevronDown size={15} className={`transition-transform text-zinc-400 flex-shrink-0 ${open ? "rotate-180" : ""}`} />
        </button>

        {open && (
          <div className="absolute bottom-full left-0 mb-2 w-full bg-[#2a2a2a] border border-zinc-700/80 rounded-2xl overflow-hidden flex flex-col z-50">
            <div className="p-1.5 border-b border-zinc-800/80">
              <div className="flex items-center bg-[#1e1e1e] rounded-lg px-2.5 py-2 border border-zinc-700/60 focus-within:border-zinc-500 transition-colors">
                <Search size={14} className="text-zinc-400 mr-2 flex-shrink-0" />
                <input
                  type="text"
                  className="bg-transparent border-none outline-none text-[13px] text-zinc-200 w-full placeholder:text-zinc-500"
                  placeholder="Search categories..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  autoFocus
                />
              </div>
            </div>
            
            <div className="max-h-[220px] overflow-y-auto p-1 custom-scrollbar">
              {filteredItems.length === 0 ? (
                <div className="px-3 py-4 text-center text-[13px] text-zinc-500">No results found.</div>
              ) : (
                filteredItems.map(item => (
                  <button
                    key={item.id}
                    type="button"
                    className="w-full flex items-center justify-between px-3 py-2 text-[13px] text-zinc-300 hover:bg-[#333] hover:text-zinc-100 rounded-lg transition-colors text-left font-gothic"
                    onClick={() => {
                      onSelect(item.name);
                      setOpen(false);
                    }}
                  >
                    {item.name}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

