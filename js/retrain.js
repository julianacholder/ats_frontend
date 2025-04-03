// Constants
const API_BASE_URL = 'http://127.0.0.1:8000';
const RETRAIN_STATUS_INTERVAL = 5000; // Check status every 5 seconds

// DOM Elements
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM loaded, initializing elements');
  
  // Get elements by ID for more reliable selection
  const fileDropArea = document.querySelector('.resume-dotted');
  const uploadLabel = fileDropArea.querySelector('h3');
  const uploadDesc = fileDropArea.querySelector('p');
  const retrainButton = document.getElementById('retrain-button');
  const downloadSampleButton = document.getElementById('download-sample');
  const loadingModal = document.getElementById('loading-modal');
  const trainingProgress = document.getElementById('training-progress');
  
  // Status elements with IDs
  const modelStatusSpan = document.getElementById('model-status');
  const lastRetrainedSpan = document.getElementById('last-retrained');
  const performanceSpan = document.getElementById('performance');
  const dataSizeSpan = document.getElementById('data-size');
  const lossSpan = document.getElementById('loss');
  const recallSpan = document.getElementById('recall');
  
  const stepsElements = document.querySelectorAll('.stepss .step');
  
  // Add a hidden file input for CSV
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.csv';
  fileInput.style.display = 'none';
  fileInput.id = 'csv-file';
  document.body.appendChild(fileInput);
  
  let selectedFile = null;
  let isRetraining = false;

  // Fetch initial model status
  fetchModelStatus();
  
  // Event Listeners
  fileDropArea.addEventListener('click', () => fileInput.click());
  
  // File selection event
  fileInput.addEventListener('change', function(e) {
    if (this.files.length > 0) {
      selectedFile = this.files[0];
      uploadLabel.textContent = selectedFile.name;
      uploadDesc.textContent = `${formatFileSize(selectedFile.size)} - Click to change`;
      fileDropArea.classList.add('file-selected');
    }
  });
  
  // Drag and drop events
  fileDropArea.addEventListener('dragover', function(e) {
    e.preventDefault();
    fileDropArea.classList.add('dragover');
  });
  
  fileDropArea.addEventListener('dragleave', function() {
    fileDropArea.classList.remove('dragover');
  });
  
  fileDropArea.addEventListener('drop', function(e) {
    e.preventDefault();
    fileDropArea.classList.remove('dragover');
    
    if (e.dataTransfer.files.length > 0) {
      selectedFile = e.dataTransfer.files[0];
      
      if (!selectedFile.name.endsWith('.csv')) {
        showToast('Only CSV files are allowed', 'error');
        return;
      }
      
      uploadLabel.textContent = selectedFile.name;
      uploadDesc.textContent = `${formatFileSize(selectedFile.size)} - Drag new file to change`;
      fileDropArea.classList.add('file-selected');
    }
  });
  
  // Retrain button click
  retrainButton.addEventListener('click', function() {
    if (isRetraining) {
      showToast('Retraining is already in progress', 'info');
      return;
    }
    
    if (selectedFile) {
      uploadCSVAndRetrain(selectedFile);
    } else {
      // If no file is selected, just trigger retraining with existing data
      triggerRetrain();
    }
  });
  
  // Download sample CSV
  downloadSampleButton.addEventListener('click', function() {
    downloadSampleCSV();
  });
  
  // Functions
  function fetchModelStatus() {
    console.log('Fetching model status...');
    fetch(`${API_BASE_URL}/api/retrain_status`)
      .then(response => response.json())
      .then(data => {
        console.log('Retrain status data:', data);
        isRetraining = data.retraining;
        
        if (isRetraining) {
          modelStatusSpan.textContent = 'Retraining';
          modelStatusSpan.className = 'status-retraining';
          retrainButton.classList.add('disabled');
          loadingModal.style.display = 'block';
          
          // Update progress message
          if (data.stage) {
            trainingProgress.textContent = `Status: ${data.stage}`;
          }
          
          // Update training steps based on stage
          if (data.stage === 'preprocessing') {
            updateTrainingSteps(2);
          } else if (data.stage === 'training') {
            updateTrainingSteps(3);
          } else if (data.stage === 'evaluation') {
            updateTrainingSteps(4);
          }
          
          // Check again after interval
          setTimeout(fetchModelStatus, RETRAIN_STATUS_INTERVAL);
        } else {
          modelStatusSpan.textContent = 'Ready';
          modelStatusSpan.className = 'status-ready';
          retrainButton.classList.remove('disabled');
          loadingModal.style.display = 'none';
          updateTrainingSteps(1); // Reset to upload step
          
          // Also fetch status endpoint for additional info
          fetch(`${API_BASE_URL}/status`)
            .then(response => response.json())
            .then(statusData => {
              console.log('Status data:', statusData);
              if (statusData.status === 'ready') {
                // Update all status fields
                if (statusData.last_retrained) {
                  lastRetrainedSpan.textContent = formatDate(statusData.last_retrained);
                }
                
                if (statusData.performance) {
                  performanceSpan.textContent = statusData.performance;
                }
                
                if (statusData.data_size) {
                  dataSizeSpan.textContent = statusData.data_size;
                }
                
                // Update loss and recall if available
                if (statusData.metrics) {
                  if (statusData.metrics.loss) {
                    lossSpan.textContent = statusData.metrics.loss.toFixed(4);
                  }
                  if (statusData.metrics.recall) {
                    recallSpan.textContent = statusData.metrics.recall.toFixed(4);
                  }
                }
              }
            })
            .catch(error => {
              console.error('Status fetch error:', error);
              showToast('Error connecting to API', 'error');
            });
        }
      })
      .catch(error => {
        console.error('Error fetching retrain status:', error);
        modelStatusSpan.textContent = 'Error';
        modelStatusSpan.className = 'status-error';
        loadingModal.style.display = 'none';
        showToast('Error connecting to API. Is your FastAPI server running?', 'error');
      });
  }
  
  function uploadCSVAndRetrain(file) {
    const formData = new FormData();
    formData.append('file', file);
    
    updateTrainingSteps(1);
    showToast('Uploading CSV file...', 'info');
    
    fetch(`${API_BASE_URL}/api/upload`, {
      method: 'POST',
      body: formData
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('File upload failed');
        }
        return response.json();
      })
      .then(data => {
        showToast(`Upload successful! ${data.rows} rows added.`, 'success');
        triggerRetrain();
      })
      .catch(error => {
        console.error('Upload error:', error);
        showToast('Error uploading file. Please try again.', 'error');
      });
  }
  
  function triggerRetrain() {
    fetch(`${API_BASE_URL}/api/retrain`, {
      method: 'POST'
    })
      .then(response => {
        if (!response.ok) {
          return response.json().then(data => {
            throw new Error(data.error || 'Retraining failed');
          });
        }
        return response.json();
      })
      .then(data => {
        isRetraining = true;
        updateTrainingSteps(2);
        loadingModal.style.display = 'block';
        trainingProgress.textContent = 'Status: Starting retraining process';
        showToast('Retraining started! This may take several minutes.', 'success');
        
        // Start polling for status
        setTimeout(fetchModelStatus, RETRAIN_STATUS_INTERVAL);
      })
      .catch(error => {
        console.error('Retrain error:', error);
        loadingModal.style.display = 'none';
        showToast(error.message || 'Error starting retraining', 'error');
      });
  }
  
  function downloadSampleCSV() {
    // Fetch the sample CSV file from the server
    fetch('sample_data/ats_match_sample.csv')
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to download sample CSV');
        }
        return response.blob();
      })
      .then(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'ats_match_sample.csv';
        document.body.appendChild(a);
        a.click();
        
        // Clean up
        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 100);
      })
      .catch(error => {
        console.error('Download error:', error);
        showToast('Error downloading sample file', 'error');
      });
  }
  
  function updateTrainingSteps(activeStep) {
    // Reset all steps
    stepsElements.forEach((step, index) => {
      step.classList.remove('active', 'completed');
      
      // Mark completed steps
      if (index + 1 < activeStep) {
        step.classList.add('completed');
      }
      
      // Mark active step
      if (index + 1 === activeStep) {
        step.classList.add('active');
      }
    });
  }
  
  // Utility functions
  function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' bytes';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  }
  
  function formatDate(dateString) {
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch (e) {
      console.error('Error formatting date:', e);
      return dateString; // Return the raw string if formatting fails
    }
  }
  
  function showToast(message, type = 'info') {
    console.log(`Toast: ${type} - ${message}`);
    
    // Create toast container if it doesn't exist
    let toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.className = 'toast-container';
      document.body.appendChild(toastContainer);
    }
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    // Add to container
    toastContainer.appendChild(toast);
    
    // Animate and remove after delay
    setTimeout(() => {
      toast.classList.add('show');
    }, 10);
    
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        if (toastContainer.contains(toast)) {
          toastContainer.removeChild(toast);
        }
      }, 300);
    }, 3000);
  }
});