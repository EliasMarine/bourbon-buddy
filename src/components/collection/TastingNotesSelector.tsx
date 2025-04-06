import React, { useState, useEffect } from 'react';
import { X, Sliders } from 'lucide-react';

// Default tasting notes categories
const DEFAULT_TASTING_NOTES = {
  nose: [
    'Baking Spices', 'Caramel', 'Chocolate', 'Citrus', 'Coffee', 'Dried Fruit',
    'Floral', 'Fruit', 'Grain', 'Herbs', 'Honey', 'Leather', 'Malt', 'Mint',
    'Nuts', 'Oak', 'Peat', 'Smoke', 'Spice', 'Vanilla'
  ],
  palate: [
    'Balanced', 'Bold', 'Buttery', 'Chocolate', 'Citrus', 'Complex', 'Creamy',
    'Dry', 'Fruity', 'Herbal', 'Minty', 'Nutty', 'Oaky', 'Peppery', 'Rich',
    'Smoky', 'Smooth', 'Spicy', 'Sweet'
  ],
  finish: [
    'Bitter', 'Bold', 'Burning', 'Clean', 'Complex', 'Dry', 'Fruity',
    'Herbal', 'Long', 'Minty', 'Oaky', 'Peppery', 'Short', 'Smooth',
    'Spicy', 'Sweet', 'Warm'
  ]
};

// Storage keys
const CUSTOM_NOTES_STORAGE_KEY = 'customTastingNotes';
const HIDDEN_NOTES_STORAGE_KEY = 'hiddenTastingNotes';

export type TastingNoteCategory = 'nose' | 'palate' | 'finish';

interface TastingNotesSelectorProps {
  category: TastingNoteCategory;
  selectedNotes: string[];
  onNotesChange: (notes: string[]) => void;
  label?: string;
}

export default function TastingNotesSelector({
  category,
  selectedNotes,
  onNotesChange,
  label
}: TastingNotesSelectorProps) {
  const [customNotes, setCustomNotes] = useState<{
    nose: string[];
    palate: string[];
    finish: string[];
  }>({
    nose: [],
    palate: [],
    finish: []
  });
  
  const [hiddenNotes, setHiddenNotes] = useState<{
    nose: string[];
    palate: string[];
    finish: string[];
  }>({
    nose: [],
    palate: [],
    finish: []
  });
  
  const [customNoteInput, setCustomNoteInput] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [managingCustomNotes, setManagingCustomNotes] = useState(false);
  const [managingDefaultNotes, setManagingDefaultNotes] = useState(false);

  // Load custom and hidden notes from local storage
  useEffect(() => {
    // Load custom notes
    const savedCustomNotes = localStorage.getItem(`${CUSTOM_NOTES_STORAGE_KEY}_${category}`);
    if (savedCustomNotes) {
      try {
        const parsed = JSON.parse(savedCustomNotes);
        setCustomNotes(prev => ({
          ...prev,
          [category]: Array.isArray(parsed) ? parsed : []
        }));
      } catch (error) {
        console.error(`Error parsing custom notes for ${category}:`, error);
        // Reset to empty array if parsing fails
        setCustomNotes(prev => ({
          ...prev,
          [category]: []
        }));
        // Clean up invalid data
        localStorage.removeItem(`${CUSTOM_NOTES_STORAGE_KEY}_${category}`);
      }
    }
    
    // Load hidden notes
    const savedHiddenNotes = localStorage.getItem(`hidden_notes_${category}`);
    if (savedHiddenNotes) {
      try {
        const parsed = JSON.parse(savedHiddenNotes);
        setHiddenNotes(prev => ({
          ...prev,
          [category]: Array.isArray(parsed) ? parsed : []
        }));
      } catch (error) {
        console.error(`Error parsing hidden notes for ${category}:`, error);
        // Reset to empty array if parsing fails
        setHiddenNotes(prev => ({
          ...prev,
          [category]: []
        }));
        // Clean up invalid data
        localStorage.removeItem(`hidden_notes_${category}`);
      }
    } else {
      // Ensure this category is initialized in hiddenNotes
      setHiddenNotes(prev => ({
        ...prev,
        [category]: prev[category] || []
      }));
    }
  }, [category]);

  // Save custom notes to localStorage whenever they change
  useEffect(() => {
    if (customNotes[category] && Array.isArray(customNotes[category])) {
      localStorage.setItem(`${CUSTOM_NOTES_STORAGE_KEY}_${category}`, JSON.stringify(customNotes[category]));
    }
  }, [customNotes, category]);
  
  // Save hidden notes to localStorage whenever they change
  useEffect(() => {
    if (hiddenNotes[category]) {
      localStorage.setItem(`hidden_notes_${category}`, JSON.stringify(hiddenNotes[category]));
    }
  }, [hiddenNotes, category]);

  // Toggle a note selection
  const handleNoteToggle = (note: string) => {
    const newSelectedNotes = selectedNotes.includes(note)
      ? selectedNotes.filter(n => n !== note)
      : [...selectedNotes, note];
    
    onNotesChange(newSelectedNotes);
  };

  // Add a custom note
  const handleAddCustomNote = () => {
    const trimmedNote = customNoteInput.trim();
    
    if (!trimmedNote) return;
    
    // Don't add if the note already exists in either default or custom notes (excluding hidden defaults)
    const visibleDefaultNotes = DEFAULT_TASTING_NOTES[category].filter(
      note => !hiddenNotes[category]?.includes(note)
    );
    
    if (visibleDefaultNotes.includes(trimmedNote) || 
        customNotes[category]?.includes(trimmedNote) ||
        selectedNotes.includes(trimmedNote)) {
      return;
    }
    
    // Add to custom notes
    const newCustomNotes = {
      ...customNotes,
      [category]: [...(customNotes[category] || []), trimmedNote]
    };
    
    setCustomNotes(newCustomNotes);
    
    // Save to localStorage
    localStorage.setItem(`${CUSTOM_NOTES_STORAGE_KEY}_${category}`, JSON.stringify(newCustomNotes[category]));
    
    // Also select the newly added note
    onNotesChange([...selectedNotes, trimmedNote]);
    
    // Reset input and hide it
    setCustomNoteInput('');
    setShowCustomInput(false);
  };

  // Delete a custom note
  const handleDeleteCustomNote = (note: string) => {
    // Skip if there are no custom notes for this category
    if (!customNotes[category] || !Array.isArray(customNotes[category])) {
      return;
    }
    
    // Remove from custom notes
    const newCustomNotes = {
      ...customNotes,
      [category]: customNotes[category].filter(n => n !== note)
    };
    
    setCustomNotes(newCustomNotes);
    
    // Update localStorage
    localStorage.setItem(`${CUSTOM_NOTES_STORAGE_KEY}_${category}`, JSON.stringify(newCustomNotes[category]));
    
    // Also remove from selected notes if it's selected
    if (selectedNotes.includes(note)) {
      onNotesChange(selectedNotes.filter(n => n !== note));
    }
  };
  
  // Hide a default note
  const handleHideDefaultNote = (note: string) => {
    // Add to hidden notes
    const newHiddenNotes = {
      ...hiddenNotes,
      [category]: [...(hiddenNotes[category] || []), note]
    };
    
    setHiddenNotes(newHiddenNotes);
    
    // Also remove from selected notes if it's selected
    if (selectedNotes.includes(note)) {
      onNotesChange(selectedNotes.filter(n => n !== note));
    }
  };
  
  // Restore a hidden default note
  const restoreAllHiddenNotes = () => {
    // Reset hidden notes for this category
    setHiddenNotes(prev => ({
      ...prev,
      [category]: []
    }));
    
    // Remove from localStorage as well
    localStorage.removeItem(`hidden_notes_${category}`);
  };

  // Get filtered default notes (excluding hidden ones)
  const visibleDefaultNotes = DEFAULT_TASTING_NOTES[category].filter(
    note => !hiddenNotes[category]?.includes(note)
  );

  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-2">
        <label className="block text-sm font-medium text-gray-300">
          {label || category.charAt(0).toUpperCase() + category.slice(1)}
        </label>
        <div className="flex gap-2">
          {/* Manage Default Notes button */}
          <button
            type="button"
            onClick={() => {
              setManagingDefaultNotes(!managingDefaultNotes);
              setManagingCustomNotes(false);
            }}
            className="text-xs text-amber-500 hover:text-amber-400 flex items-center gap-1"
            title="Customize default notes"
          >
            <Sliders size={14} />
            {managingDefaultNotes ? 'Done' : 'Customize'}
          </button>
          
          {/* Manage Custom Notes button */}
          {customNotes[category]?.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setManagingCustomNotes(!managingCustomNotes);
                setManagingDefaultNotes(false);
              }}
              className="text-xs text-amber-500 hover:text-amber-400"
            >
              {managingCustomNotes ? 'Done' : 'Manage Custom'}
            </button>
          )}
        </div>
      </div>
      
      {/* Hidden Notes Restoration Section */}
      {hiddenNotes[category]?.length > 0 && managingDefaultNotes && (
        <div className="mb-2 p-2 bg-gray-700/50 rounded-md">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-gray-300">
              Hidden notes: {hiddenNotes[category]?.length || 0}
            </span>
            <button
              type="button"
              onClick={restoreAllHiddenNotes}
              className="text-xs text-amber-500 hover:text-amber-400"
            >
              Restore All
            </button>
          </div>
          <div className="flex flex-wrap gap-1">
            {hiddenNotes[category]?.map((note) => (
              <span
                key={`hidden-${category}-${note}`}
                className="px-2 py-0.5 rounded-full text-xs bg-gray-600 text-gray-400 flex items-center"
              >
                {note}
              </span>
            ))}
          </div>
        </div>
      )}
      
      <div className="flex flex-wrap gap-2">
        {/* Default notes */}
        {visibleDefaultNotes.map((note) => (
          <button
            key={`${category}-${note}`}
            type="button"
            onClick={() => managingDefaultNotes ? null : handleNoteToggle(note)}
            className={`px-3 py-1 rounded-full text-sm cursor-pointer transition-colors flex items-center ${
              selectedNotes.includes(note)
                ? 'bg-amber-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            } ${managingDefaultNotes ? 'pr-1' : ''}`}
          >
            {note}
            {managingDefaultNotes && (
              <span 
                onClick={(e) => {
                  e.stopPropagation();
                  handleHideDefaultNote(note);
                }}
                className="ml-1 bg-red-500 hover:bg-red-600 rounded-full w-5 h-5 flex items-center justify-center"
                title="Hide this note"
              >
                <X size={12} />
              </span>
            )}
          </button>
        ))}
        
        {/* Custom notes */}
        {customNotes[category]?.map((note) => (
          <button
            key={`${category}-custom-${note}`}
            type="button"
            onClick={() => managingCustomNotes ? null : handleNoteToggle(note)}
            className={`px-3 py-1 rounded-full text-sm cursor-pointer transition-colors flex items-center gap-1 ${
              selectedNotes.includes(note)
                ? 'bg-amber-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            } ${managingCustomNotes ? 'pr-1' : ''}`}
          >
            {note}
            {managingCustomNotes && (
              <span 
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteCustomNote(note);
                }}
                className="ml-1 bg-red-500 hover:bg-red-600 rounded-full w-5 h-5 flex items-center justify-center"
                title="Delete this custom note"
              >
                <X size={12} />
              </span>
            )}
          </button>
        ))}
        
        {/* Custom note input */}
        {showCustomInput ? (
          <div className="flex gap-2 items-center">
            <input
              type="text"
              value={customNoteInput}
              onChange={(e) => setCustomNoteInput(e.target.value)}
              placeholder="Enter custom note"
              className="px-3 py-1 rounded-full text-sm bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-amber-500 focus:border-amber-500"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAddCustomNote();
                }
              }}
            />
            <button
              type="button"
              onClick={handleAddCustomNote}
              className="px-3 py-1 rounded-full text-sm bg-amber-600 text-white hover:bg-amber-700"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => {
                setShowCustomInput(false);
                setCustomNoteInput('');
              }}
              className="px-3 py-1 rounded-full text-sm bg-gray-700 text-gray-300 hover:bg-gray-600"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowCustomInput(true)}
            className="px-3 py-1 rounded-full text-sm bg-gray-700 text-gray-300 hover:bg-gray-600"
          >
            + Custom
          </button>
        )}
      </div>
    </div>
  );
}