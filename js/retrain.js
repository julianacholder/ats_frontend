// Constants
const API_BASE_URL = 'https://ats-match-ml-powered-resume-job-production.up.railway.app';
const RETRAIN_STATUS_INTERVAL = 5000; // Check status every 5 seconds

// Main function when DOM loads
document.addEventListener('DOMContentLoaded', function() {
  // DOM Elements
  const fileDropArea = document.querySelector('.resume-dotted');
  const uploadLabel = fileDropArea.querySelector('h3');
  const uploadDesc = fileDropArea.querySelector('p');
  const retrainButton = document.getElementById('retrain-button');
  const downloadSampleButton = document.getElementById('download-sample');
  const loadingModal = document.getElementById('loading-modal');
  const trainingProgress = document.getElementById('training-progress');
  
  // Status display elements
  const modelStatusSpan = document.getElementById('model-status');
  const lastRetrainedSpan = document.getElementById('last-retrained');
  const performanceSpan = document.getElementById('performance');
  const dataSizeSpan = document.getElementById('data-size');
  const lossSpan = document.getElementById('loss');
  const recallSpan = document.getElementById('recall');
  
  const stepsElements = document.querySelectorAll('.stepss .step');
  
  // Create hidden file input
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.csv';
  fileInput.style.display = 'none';
  fileInput.id = 'csv-file';
  document.body.appendChild(fileInput);
  
  // State variables
  let selectedFile = null;
  let isRetraining = false;

  // Initialize button state
  retrainButton.disabled = true;

  // Event Listeners
  fileDropArea.addEventListener('click', () => fileInput.click());
  
  fileInput.addEventListener('change', function(e) {
    handleFileSelection(this.files);
  });
  
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
    handleFileSelection(e.dataTransfer.files);
  });
  
  retrainButton.addEventListener('click', function() {
    if (isRetraining) {
      showToast('Retraining is already in progress', 'info');
      return;
    }
    
    if (selectedFile) {
      uploadCSVAndRetrain(selectedFile);
    } else {
      triggerRetrain();
    }
  });
  
  downloadSampleButton.addEventListener('click', downloadSampleCSV);
  
  // Initialize page
  fetchModelStatus();

  // =====================
  // Core Functions
  // =====================

  function handleFileSelection(files) {
    if (files.length > 0) {
      selectedFile = files[0];
      
      if (!selectedFile.name.endsWith('.csv')) {
        showToast('Only CSV files are allowed', 'error');
        retrainButton.disabled = true;
        retrainButton.classList.remove('file-selected'); // Remove orange class
        return;
      }
      
      // Update UI
      uploadLabel.textContent = selectedFile.name;
      uploadDesc.textContent = `${formatFileSize(selectedFile.size)} - Click to change`;
      fileDropArea.classList.add('file-selected');
      
      // Enable and style the button
      retrainButton.disabled = false;
      retrainButton.classList.add('file-selected'); // Add orange class
    } else {
      retrainButton.disabled = true;
      retrainButton.classList.remove('file-selected'); // Remove orange class
    }
  }

  function fetchModelStatus() {
    fetch(`${API_BASE_URL}/api/retrain_status`)
      .then(response => response.json())
      .then(data => {
        isRetraining = data.retraining;
        
        if (isRetraining) {
          // Update UI for retraining state
          modelStatusSpan.textContent = 'Retraining';
          modelStatusSpan.className = 'status-retraining';
          retrainButton.disabled = true;
          loadingModal.style.display = 'block';
          
          // Update progress message
          if (data.stage) {
            trainingProgress.textContent = `Status: ${data.stage}`;
            updateTrainingSteps(
              data.stage === 'preprocessing' ? 2 :
              data.stage === 'training' ? 3 :
              data.stage === 'evaluation' ? 4 : 1
            );
          }
          
          // Continue polling
          setTimeout(fetchModelStatus, RETRAIN_STATUS_INTERVAL);
        } else {
          // If we were previously retraining but now we're not, update the UI
          modelStatusSpan.textContent = 'Ready';
          modelStatusSpan.className = 'status-ready';
          loadingModal.style.display = 'none';
          retrainButton.disabled = selectedFile ? false : true; // Re-enable button if file is selected
          if (selectedFile) {
            retrainButton.classList.add('file-selected');
          }
          updateTrainingSteps(1);
          
          // Fetch the latest model status
          fetchModelDetails();
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

  // Create a separate function for fetching model details
  function fetchModelDetails() {
    fetch(`${API_BASE_URL}/status`)
      .then(response => response.json())
      .then(statusData => {
        console.log('Status data:', statusData);
        if (statusData.status === 'ready') {
          if (statusData.last_retrained) {
            lastRetrainedSpan.textContent = formatDate(statusData.last_retrained);
          }
          
          if (statusData.performance) {
            performanceSpan.textContent = statusData.performance;
          }
          
          if (statusData.data_size) {
            dataSizeSpan.textContent = statusData.data_size;
          }
          
          // Enhanced metrics handling with debug output
          console.log('Metrics data:', statusData.metrics);
          
          if (statusData.metrics) {
            // Check if lossSpan and recallSpan exist in the DOM
            if (lossSpan) {
              if (statusData.metrics.loss !== undefined) {
                console.log('Setting loss value:', statusData.metrics.loss);
                lossSpan.textContent = statusData.metrics.loss.toFixed(4);
              } else {
                console.log('Loss value is undefined');
                lossSpan.textContent = 'N/A';
              }
            } else {
              console.error('Element with ID "loss" not found in the DOM');
            }
            
            if (recallSpan) {
              if (statusData.metrics.recall !== undefined) {
                console.log('Setting recall value:', statusData.metrics.recall);
                recallSpan.textContent = statusData.metrics.recall.toFixed(4);
              } else {
                console.log('Recall value is undefined');
                recallSpan.textContent = 'N/A';
              }
            } else {
              console.error('Element with ID "recall" not found in the DOM');
            }
          } else {
            console.log('No metrics data available in API response');
            // Set default values when metrics are missing
            if (lossSpan) lossSpan.textContent = 'N/A';
            if (recallSpan) recallSpan.textContent = 'N/A';
          }
        }
      })
      .catch(error => {
        console.error('Status fetch error:', error);
        showToast('Error connecting to API', 'error');
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
    fetch('sample_data/resume_data.csv')
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
        a.download = 'resume_data.csv';
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

  // =====================
  // Utility Functions
  // =====================

  function updateTrainingSteps(activeStep) {
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

  function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' bytes';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  }

  function formatDate(dateString) {
    try {
      return new Date(dateString).toLocaleString();
    } catch (e) {
      return dateString;
    }
  }

  function showToast(message, type = 'info') {
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
    
    // Animate in
    setTimeout(() => {
      toast.classList.add('show');
    }, 10);
    
    // Remove after delay
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