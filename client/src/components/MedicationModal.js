import React, { useState, useEffect } from 'react';
import { familyApiService } from '../services/familyApi';

const MedicationModal = ({ member, onSave, onClose }) => {
  const [medications, setMedications] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingMedication, setEditingMedication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadMedications();
  }, [member.id]);

  const loadMedications = async () => {
    try {
      setLoading(true);
      const meds = await familyApiService.getFamilyMedications(member.id);
      setMedications(meds);
      setError(null);
    } catch (err) {
      setError('Failed to load medications: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMedication = () => {
    setEditingMedication(null);
    setShowAddForm(true);
  };

  const handleEditMedication = (medication) => {
    setEditingMedication(medication);
    setShowAddForm(true);
  };

  const handleDeleteMedication = async (medicationId) => {
    if (!window.confirm('Are you sure you want to remove this medication?')) {
      return;
    }

    try {
      await familyApiService.deleteFamilyMedication(medicationId);
      await loadMedications();
    } catch (err) {
      setError('Failed to delete medication: ' + err.message);
    }
  };

  const handleMedicationSaved = async () => {
    setShowAddForm(false);
    setEditingMedication(null);
    await loadMedications();
  };

  return (
    <div className="modal-overlay">
      <div className="medication-modal">
        <div className="modal-header">
          <h2>Medications for {member.name}</h2>
          <button onClick={onClose} className="close-btn">×</button>
        </div>

        {error && (
          <div className="error-message">
            <span className="error-icon">⚠️</span>
            {error}
          </div>
        )}

        <div className="modal-content">
          {loading ? (
            <div className="loading-spinner">
              <div className="spinner"></div>
              <p>Loading medications...</p>
            </div>
          ) : (
            <>
              <div className="medications-header">
                <h3>Current Medications ({medications.length})</h3>
                <button onClick={handleAddMedication} className="btn-primary">
                  + Add Medication
                </button>
              </div>

              <div className="medications-list">
                {medications.length === 0 ? (
                  <div className="empty-medications">
                    <div className="empty-icon">💊</div>
                    <p>No medications found</p>
                    <button onClick={handleAddMedication} className="btn-primary">
                      Add First Medication
                    </button>
                  </div>
                ) : (
                  medications.map(medication => (
                    <MedicationCard
                      key={medication.id}
                      medication={medication}
                      onEdit={handleEditMedication}
                      onDelete={handleDeleteMedication}
                    />
                  ))
                )}
              </div>
            </>
          )}
        </div>

        {showAddForm && (
          <MedicationForm
            memberId={member.id}
            medication={editingMedication}
            onSave={handleMedicationSaved}
            onCancel={() => {
              setShowAddForm(false);
              setEditingMedication(null);
            }}
          />
        )}

        <div className="modal-actions">
          <button onClick={onSave} className="btn-primary">
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

const MedicationCard = ({ medication, onEdit, onDelete }) => {
  const sideEffects = medication.drug.sideEffects ? JSON.parse(medication.drug.sideEffects) : [];
  const alternatives = medication.drug.alternatives ? JSON.parse(medication.drug.alternatives) : [];

  return (
    <div className="medication-card">
      <div className="medication-header">
        <h4>{medication.drug.name}</h4>
        <div className="medication-meta">
          <span className="category">{medication.drug.category}</span>
          {medication.drug.manufacturer && (
            <span className="manufacturer">{medication.drug.manufacturer}</span>
          )}
        </div>
      </div>

      <div className="medication-details">
        {medication.dosage && (
          <div className="detail-item">
            <strong>Dosage:</strong> {medication.dosage}
          </div>
        )}
        {medication.frequency && (
          <div className="detail-item">
            <strong>Frequency:</strong> {medication.frequency}
          </div>
        )}
        {medication.cost && (
          <div className="detail-item">
            <strong>Cost:</strong> ₹{medication.cost}
          </div>
        )}
        {medication.notes && (
          <div className="detail-item">
            <strong>Notes:</strong> {medication.notes}
          </div>
        )}
      </div>

      {sideEffects.length > 0 && (
        <div className="side-effects">
          <strong>Side Effects:</strong>
          <div className="effects-list">
            {sideEffects.slice(0, 3).map((effect, index) => (
              <span key={index} className="effect-chip">{effect}</span>
            ))}
            {sideEffects.length > 3 && (
              <span className="more-effects">+{sideEffects.length - 3} more</span>
            )}
          </div>
        </div>
      )}

      <div className="medication-actions">
        <button onClick={() => onEdit(medication)} className="btn-secondary">
          Edit
        </button>
        <button onClick={() => onDelete(medication.id)} className="btn-danger">
          Remove
        </button>
      </div>
    </div>
  );
};

const MedicationForm = ({ memberId, medication, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    drugId: '',
    dosage: '',
    frequency: '',
    notes: '',
    cost: ''
  });
  const [drugSearch, setDrugSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedDrug, setSelectedDrug] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (medication) {
      setFormData({
        drugId: medication.drugId,
        dosage: medication.dosage || '',
        frequency: medication.frequency || '',
        notes: medication.notes || '',
        cost: medication.cost || ''
      });
      setSelectedDrug(medication.drug);
    }
  }, [medication]);

  useEffect(() => {
    if (drugSearch.length > 2) {
      searchDrugs();
    } else {
      setSearchResults([]);
    }
  }, [drugSearch]);

  const searchDrugs = async () => {
    try {
      setSearching(true);
      const results = await familyApiService.searchDrugs(drugSearch, { limit: 10 });
      setSearchResults(results);
    } catch (err) {
      console.warn('Drug search failed:', err);
    } finally {
      setSearching(false);
    }
  };

  const selectDrug = (drug) => {
    setSelectedDrug(drug);
    setFormData(prev => ({ ...prev, drugId: drug.id }));
    setDrugSearch(drug.name);
    setSearchResults([]);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDrug) {
      setError('Please select a medication');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const submitData = {
        familyMemberId: memberId,
        drugId: selectedDrug.id,
        dosage: formData.dosage,
        frequency: formData.frequency,
        notes: formData.notes,
        cost: formData.cost ? parseFloat(formData.cost) : null
      };

      if (medication) {
        await familyApiService.updateFamilyMedication(medication.id, submitData);
      } else {
        await familyApiService.addFamilyMedication(submitData);
      }

      onSave();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="medication-form-overlay">
      <div className="medication-form">
        <div className="form-header">
          <h3>{medication ? 'Edit Medication' : 'Add Medication'}</h3>
          <button onClick={onCancel} className="close-btn">×</button>
        </div>

        {error && (
          <div className="error-message">
            <span className="error-icon">⚠️</span>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Search Medication *</label>
            <div className="drug-search">
              <input
                type="text"
                value={drugSearch}
                onChange={(e) => setDrugSearch(e.target.value)}
                placeholder="Search for a medication..."
                required
              />
              {searching && <div className="search-spinner">🔍</div>}
            </div>

            {searchResults.length > 0 && (
              <div className="search-results">
                {searchResults.map(drug => (
                  <div
                    key={drug.id}
                    onClick={() => selectDrug(drug)}
                    className="search-result-item"
                  >
                    <div className="drug-name">{drug.name}</div>
                    <div className="drug-details">
                      {drug.category} • {drug.manufacturer}
                      {drug.price && <span> • ₹{drug.price}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {selectedDrug && (
              <div className="selected-drug">
                <h4>Selected: {selectedDrug.name}</h4>
                <p>{selectedDrug.category} • {selectedDrug.manufacturer}</p>
                {selectedDrug.price && <p>Price: ₹{selectedDrug.price}</p>}
              </div>
            )}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="dosage">Dosage</label>
              <input
                type="text"
                id="dosage"
                name="dosage"
                value={formData.dosage}
                onChange={handleInputChange}
                placeholder="e.g., 500mg"
              />
            </div>
            <div className="form-group">
              <label htmlFor="frequency">Frequency</label>
              <input
                type="text"
                id="frequency"
                name="frequency"
                value={formData.frequency}
                onChange={handleInputChange}
                placeholder="e.g., Twice daily"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="cost">Cost (₹)</label>
            <input
              type="number"
              id="cost"
              name="cost"
              value={formData.cost}
              onChange={handleInputChange}
              step="0.01"
              min="0"
              placeholder="Medication cost"
            />
          </div>

          <div className="form-group">
            <label htmlFor="notes">Notes</label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              placeholder="Additional notes..."
              rows="3"
            />
          </div>

          <div className="form-actions">
            <button type="button" onClick={onCancel} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Saving...' : (medication ? 'Update' : 'Add')} Medication
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MedicationModal;