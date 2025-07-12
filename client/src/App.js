import React, { useState, useContext, createContext, useEffect, useRef } from 'react';
import { apiService } from './services/api';
import './App.css';

// Enhanced Agent Context Protocol
const AgentContext = createContext();

function AgentProvider({ children }) {
  const [lastSearch, setLastSearch] = useState('');
  const [preferences, setPreferences] = useState({ 
    price: 'low',
    interactions: [],
    searchHistory: [],
    favoriteDrugs: [],
    priceAlerts: [],
    userPreferences: {
      preferredManufacturers: [],
      preferredCategories: [],
      notifications: true
    }
  });

  // Smart suggestion system
  const getSmartSuggestions = (currentSearch, searchResults) => {
    const searchHistory = preferences.searchHistory;
    const favoriteDrugs = preferences.favoriteDrugs;
    const safeResults = Array.isArray(searchResults) ? searchResults : [];

    // Get frequently searched drugs
    const frequentSearches = searchHistory.reduce((acc, search) => {
      acc[search] = (acc[search] || 0) + 1;
      return acc;
    }, {});

    // Get related drugs based on category and manufacturer preferences
    const relatedDrugs = safeResults.filter(drug => 
      preferences.userPreferences.preferredCategories.includes(drug.category) ||
      preferences.userPreferences.preferredManufacturers.includes(drug.manufacturer)
    );

    return {
      frequentSearches: Object.entries(frequentSearches)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([drug]) => drug),
      favoriteDrugs,
      relatedDrugs: relatedDrugs.slice(0, 3)
    };
  };

  // Price alert system
  const checkPriceAlerts = (drug) => {
    const alerts = preferences.priceAlerts.filter(alert => 
      alert.drugName === drug.name && 
      drug.price <= alert.targetPrice
    );
    
    if (alerts.length > 0) {
      return {
        hasAlert: true,
        message: `Price alert: ${drug.name} is now available at ₹${drug.price}`
      };
    }
    return { hasAlert: false };
  };

  // Proactive notifications
  const getProactiveNotifications = () => {
    // This needs to be reimplemented with the backend API.
    // For now, return an empty array to avoid errors.
    return [];
  };

  const updatePreferences = (newPreferences) => {
    setPreferences(prev => ({
      ...prev,
      ...newPreferences
    }));
  };

  return (
    <AgentContext.Provider value={{ 
      lastSearch, 
      setLastSearch, 
      preferences, 
      updatePreferences,
      getSmartSuggestions,
      checkPriceAlerts,
      getProactiveNotifications
    }}>
      {children}
    </AgentContext.Provider>
  );
}

// Custom hook to use the agent context
const useAgent = () => {
  const context = useContext(AgentContext);
  if (!context) {
    throw new Error('useAgent must be used within an AgentProvider');
  }
  return context;
};

function App() {
  const { preferences, updatePreferences, getSmartSuggestions, getProactiveNotifications, setLastSearch } = useAgent();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedDrug, setSelectedDrug] = useState(null);
  const [showInteractionModal, setShowInteractionModal] = useState(false);
  const [interactionDrug, setInteractionDrug] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [trendingDrugs, setTrendingDrugs] = useState([]);
  const [categoryStats, setCategoryStats] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const suggestionsRef = useRef(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedDrugDetails, setSelectedDrugDetails] = useState(null);
  const [categories, setCategories] = useState(['all']);
  const [latestInteractionId, setLatestInteractionId] = useState(null);
  const interactionsRef = useRef(null);

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [trending, stats, cats] = await Promise.all([
          apiService.getTrendingDrugs(),
          apiService.getCategoryStats(),
          apiService.getCategories()
        ]);
        setTrendingDrugs(trending.data || trending);
        setCategoryStats(stats.data || stats);
        setCategories(Array.isArray(cats.data) ? cats.data : Array.isArray(cats) ? cats : ['all']);
      } catch (error) {
        console.error('Error loading initial data:', error);
      }
    };
    loadInitialData();
  }, []);

  // Add useEffect to load drugs when category changes
  useEffect(() => {
    const loadCategoryDrugs = async () => {
      try {
        setIsLoading(true);
        const results = await apiService.searchDrugs({
          category: selectedCategory,
        });
        setSearchResults(results.data || results);
      } catch (error) {
        console.error('Error loading category drugs:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadCategoryDrugs();
  }, [selectedCategory]);

  // Search drugs
  const handleSearch = async () => {
    try {
      setIsLoading(true);
      const results = await apiService.searchDrugs({
        query: searchQuery,
        category: selectedCategory,
      });
      setSearchResults(results.data || results);
      setLastSearch(searchQuery);
    } catch (error) {
      console.error('Error searching drugs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle drug selection
  const handleDrugSelect = async (drug) => {
    try {
      let alternativesWithDetails = [];
      if (drug.alternatives && drug.alternatives.length > 0) {
        const altResults = await apiService.getDrugsByNames(drug.alternatives);
        alternativesWithDetails = altResults.data || altResults;
      }

      setSelectedDrugDetails({
        ...drug,
        alternatives: alternativesWithDetails
      });
      setShowDetailsModal(true);
      
      // Add to search history
      const newSearchHistory = [drug.name, ...preferences.searchHistory.filter(name => name !== drug.name)].slice(0, 10);
      updatePreferences({ searchHistory: newSearchHistory });
    } catch (error) {
      console.error('Error selecting drug:', error);
    }
  };

  // Check drug interactions
  const handleCheckInteraction = async () => {
    if (!selectedDrug || !interactionDrug) return;
    
    try {
      const interaction = await apiService.checkInteraction(selectedDrug.name, interactionDrug);
      
      const newInteraction = {
        id: Date.now(),
        drug1: selectedDrug.name,
        drug2: interactionDrug,
        severity: interaction.severity,
        description: interaction.description
      };
      
      updatePreferences({
        interactions: [...preferences.interactions, newInteraction]
      });
      setLatestInteractionId(newInteraction.id);
      
      setShowInteractionModal(false);
      setInteractionDrug('');
      
      // Add notification
      setNotifications(prev => [{
        type: 'interaction',
        message: `Interaction found: ${selectedDrug.name} + ${interactionDrug}`,
        timestamp: new Date().toISOString()
      }, ...prev]);
    } catch (error) {
      console.error('Error checking interactions:', error);
    }
  };

  // Effect to scroll to and highlight the new interaction
  useEffect(() => {
    if (latestInteractionId && interactionsRef.current) {
      interactionsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      const timer = setTimeout(() => {
        setLatestInteractionId(null);
      }, 3000); // Highlight for 3 seconds
      return () => clearTimeout(timer);
    }
  }, [latestInteractionId, preferences.interactions]);

  // Update notifications periodically
  useEffect(() => {
    const updateNotifications = () => {
      const newNotifications = getProactiveNotifications();
      setNotifications(newNotifications);
    };

    updateNotifications();
    const interval = setInterval(updateNotifications, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [preferences, getProactiveNotifications]);

  // Handle clicks outside suggestions dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Update suggestions when search term changes
  useEffect(() => {
    if (searchQuery.trim().length > 0) {
      const filteredDrugs = searchResults.filter(drug => 
        drug.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        (selectedCategory === 'all' || drug.category === selectedCategory)
      );
      setSuggestions(filteredDrugs.slice(0, 5));
      setShowSuggestions(true);
    } else {
      // Show smart suggestions when search is empty
      const smartSuggestions = getSmartSuggestions(searchQuery, searchResults);
      setSuggestions([
        ...smartSuggestions.frequentSearches,
        ...smartSuggestions.favoriteDrugs,
        ...smartSuggestions.relatedDrugs
      ].slice(0, 5));
      setShowSuggestions(true);
    }
  }, [searchQuery, selectedCategory, getSmartSuggestions, searchResults]);

  const handleSuggestionClick = (drugName) => {
    setSearchQuery(drugName);
    setShowSuggestions(false);
    handleSearch();
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Agentic AI Drug Suggestion App</h1>
      </header>

      {/* Tab Content */}
      <div className="tab-content">
        <>
          {/* Notifications Panel */}
          {notifications.length > 0 && (
            <div className="notifications-panel">
              {notifications.map((notification, index) => (
                <div key={index} className={`notification ${notification.type}`}>
                  {notification.message}
                </div>
              ))}
            </div>
          )}

          <div className="search-container">
            <div className="search-input-container" ref={suggestionsRef}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setShowSuggestions(true)}
                placeholder="Search drugs..."
              />
              {showSuggestions && suggestions.length > 0 && (
                <ul className="suggestions-list">
                  {suggestions.map((drug, index) => (
                    <li
                      key={index}
                      onClick={() => handleSuggestionClick(typeof drug === 'string' ? drug : drug.name)}
                      className="suggestion-item"
                    >
                      <span className="suggestion-name">
                        {typeof drug === 'string' ? drug : drug.name}
                      </span>
                      {typeof drug !== 'string' && (
                        <span className="suggestion-category">{drug.category}</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <select 
              value={selectedCategory} 
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="category-select"
            >
              {Array.isArray(categories) && categories.map(category => (
                <option key={category} value={category}>
                  {category === 'all' ? 'All Categories' : category}
                </option>
              ))}
            </select>
            <button onClick={handleSearch} disabled={isLoading}>
              {isLoading ? 'Searching...' : 'Search'}
            </button>
          </div>

          {isLoading && <div className="loading-spinner"></div>}
          
          {!isLoading && searchResults.length === 0 && (
            <div className="not-found">
              <h2>No drugs found in {selectedCategory === 'all' ? 'any category' : selectedCategory}</h2>
              <p>Please try another category.</p>
            </div>
          )}

          {!isLoading && searchResults.length > 0 && (
            <div className="results-container">
              <h2>Drugs in {selectedCategory === 'all' ? 'All Categories' : selectedCategory}</h2>
              <div className="drug-grid">
                {searchResults.map((drug) => (
                  <div key={drug.name} className="drug-card">
                    <div className="drug-header">
                      <h3>{drug.name}</h3>
                      <div className="drug-actions-header">
                        <button 
                          onClick={() => {
                            const newFavorites = preferences.favoriteDrugs.includes(drug.name)
                              ? preferences.favoriteDrugs.filter(name => name !== drug.name)
                              : [...preferences.favoriteDrugs, drug.name];
                            updatePreferences({ favoriteDrugs: newFavorites });
                          }}
                          className={`favorite-btn ${preferences.favoriteDrugs.includes(drug.name) ? 'active' : ''}`}
                        >
                          {preferences.favoriteDrugs.includes(drug.name) ? '★' : '☆'}
                        </button>
                        <span className="price-tag">₹{drug.price}</span>
                      </div>
                    </div>
                    <div className="drug-info">
                      <p><strong>Combination:</strong> {drug.combination}</p>
                      <p><strong>Strength:</strong> {drug.strength}</p>
                      <p><strong>Dosage Form:</strong> {drug.dosageForm}</p>
                      <p><strong>Manufacturer:</strong> {drug.manufacturer}</p>
                    </div>
                    <div className="drug-actions">
                      <button onClick={() => handleDrugSelect(drug)}>View Details</button>
                    </div>
                    <div className="side-effects">
                      <h4>Common Side Effects:</h4>
                      <ul>
                        {drug.sideEffects.map((effect, index) => (
                          <li key={index}>{effect}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      </div>

      {/* Drug Details Modal - moved outside tab blocks so it works for all tabs */}
      {showDetailsModal && selectedDrugDetails && (
        <div className="modal">
          <div className="modal-content drug-details-modal">
            <div className="modal-header">
              <h3>{selectedDrugDetails.name}</h3>
              <button 
                className="close-btn"
                onClick={() => setShowDetailsModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="drug-details-grid">
                <div className="drug-details-section">
                  <h4>Basic Information</h4>
                  <p><strong>Category:</strong> {selectedDrugDetails.category}</p>
                  <p><strong>Combination:</strong> {selectedDrugDetails.combination}</p>
                  <p><strong>Strength:</strong> {selectedDrugDetails.strength}</p>
                  <p><strong>Dosage Form:</strong> {selectedDrugDetails.dosageForm}</p>
                  <p><strong>Manufacturer:</strong> {selectedDrugDetails.manufacturer}</p>
                  <p><strong>Price:</strong> ₹{selectedDrugDetails.price}</p>
                </div>
                <div className="drug-details-section">
                  <h4>Side Effects</h4>
                  <ul>
                    {selectedDrugDetails.sideEffects && selectedDrugDetails.sideEffects.map((effect, index) => (
                      <li key={index}>{effect}</li>
                    ))}
                  </ul>
                </div>
                <div className="drug-details-section">
                  <h4>Alternatives</h4>
                  <div className="alternatives-list">
                    {selectedDrugDetails.alternatives && selectedDrugDetails.alternatives.length > 0 ? (
                      selectedDrugDetails.alternatives.map((alt, index) => (
                        <div key={index} className="alternative-item">
                          <div className="alt-header">
                            <span className="alt-name">{alt.name}</span>
                            <span className={`price-diff ${alt.price > selectedDrugDetails.price ? 'higher' : 'lower'}`}>
                              {alt.price > selectedDrugDetails.price ? '+' : ''}
                              {((alt.price - selectedDrugDetails.price) / selectedDrugDetails.price * 100).toFixed(1)}%
                            </span>
                          </div>
                          <div className="alt-details">
                            <p>Price: ₹{alt.price}</p>
                            <p>Manufacturer: {alt.manufacturer}</p>
                            {alt.material && <p>Material: {alt.material}</p>}
                            {alt.advantages && (
                              <div className="advantages">
                                <p><strong>Advantages:</strong></p>
                                <ul>
                                  {alt.advantages.map((adv, i) => (
                                    <li key={i}>{adv}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p>No alternatives available</p>
                    )}
                  </div>
                </div>
              </div>
              <div className="modal-actions">
                <button onClick={() => {
                  setSelectedDrug(selectedDrugDetails);
                  setShowInteractionModal(true);
                  setShowDetailsModal(false);
                }}>
                  Check Interactions
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Interaction Checker Modal */}
      {showInteractionModal && (
        <div className="modal">
          <div className="modal-content">
            <h3>Check Drug Interactions</h3>
            <input
              type="text"
              value={interactionDrug}
              onChange={(e) => setInteractionDrug(e.target.value)}
              placeholder="Enter another drug name"
            />
            <div className="modal-actions">
              <button onClick={handleCheckInteraction}>Check</button>
              <button onClick={() => setShowInteractionModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Interactions List */}
      {preferences.interactions.length > 0 && (
        <div className="interactions-container" ref={interactionsRef}>
          <div className="interactions-header">
            <h3>Interaction History</h3>
            <button 
              onClick={() => updatePreferences({ interactions: [] })} 
              className="clear-interactions-btn"
            >
              Clear All
            </button>
          </div>
          <div className="interactions-grid">
            {preferences.interactions.map(interaction => (
              <div 
                key={interaction.id} 
                className={`interaction-card ${interaction.severity.toLowerCase()} ${interaction.id === latestInteractionId ? 'new-interaction' : ''}`}
              >
                <div className="interaction-card-header">
                  <span className={`severity-badge ${interaction.severity.toLowerCase()}`}>
                    {interaction.severity}
                  </span>
                  <h4>{interaction.drug1} + {interaction.drug2}</h4>
                </div>
                <p className="interaction-description">{interaction.description}</p>
                <p className="interaction-timestamp">
                  Checked on: {new Date(interaction.id).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Price Alerts List */}
      {preferences.priceAlerts.length > 0 && (
        <div className="price-alerts-list">
          <h3>Price Alerts</h3>
          <ul>
            {preferences.priceAlerts.map(alert => (
              <li key={alert.id}>
                <strong>{alert.drugName}</strong> - Alert when price ≤ ₹{alert.targetPrice}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Add trending drugs section */}
      {trendingDrugs && trendingDrugs.length > 0 && (
        <div className="trending-drugs">
          <h3>Trending Medications</h3>
          <div className="drug-grid">
            {trendingDrugs.map(drug => (
              <div key={drug.name} className="drug-card">
                <h4>{drug.name}</h4>
                <p>Category: {drug.category}</p>
                <p>Price: ₹{drug.price}</p>
                <button onClick={() => handleDrugSelect(drug)}>View Details</button>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Add category statistics */}
      {categoryStats && categoryStats.length > 0 && (
        <div className="category-stats">
          <h3>Category Statistics</h3>
          <div className="stats-grid">
            {categoryStats.map(stat => (
              <div key={stat.category} className="stat-card">
                <h4>{stat.category}</h4>
                <p>Total Drugs: {stat.count}</p>
                <p>Average Price: ₹{Math.round(stat.avgPrice)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Disclaimer Footer */}
      <footer className="footer-disclaimer">
        Disclaimer: This application is for informational purposes only and does not constitute medical advice. Please consult a qualified medical professional before taking any medicine or drugs.
      </footer>
    </div>
  );
}

export default function AppWithProvider() {
  return (
    <AgentProvider>
      <App />
    </AgentProvider>
  );
} 