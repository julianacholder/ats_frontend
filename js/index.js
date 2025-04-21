// Main JavaScript file for ATS-Match

// JavaScript to toggle the mobile menu
document.addEventListener('DOMContentLoaded', function() {
  const chevronMenu = document.getElementById('chevronMenu');
  const mobileMenu = document.getElementById('mobileMenu');
  
  // Toggle mobile menu when chevron is clicked
  chevronMenu.addEventListener('click', function() {
    mobileMenu.classList.toggle('show');
    
    // Toggle chevron direction - optional
    const chevronIcon = chevronMenu.querySelector('i');
    if (mobileMenu.classList.contains('show')) {
      chevronIcon.classList.remove('fa-chevron-down');
      chevronIcon.classList.add('fa-chevron-up');
    } else {
      chevronIcon.classList.remove('fa-chevron-up');
      chevronIcon.classList.add('fa-chevron-down');
    }
  });
  
  // Close menu when clicking outside
  document.addEventListener('click', function(event) {
    if (!chevronMenu.contains(event.target) && !mobileMenu.contains(event.target)) {
      mobileMenu.classList.remove('show');
      
      // Reset chevron direction
      const chevronIcon = chevronMenu.querySelector('i');
      chevronIcon.classList.remove('fa-chevron-up');
      chevronIcon.classList.add('fa-chevron-down');
    }
  });
});

// ==================== UI COMPONENTS ====================
function toggleExpand(card) {
  console.log("Card clicked!");
  const isExpanded = card.classList.contains('expanded');
  
  document.querySelectorAll('.viz-card').forEach(c => {
    c.classList.remove('expanded');
  });
  
  if (!isExpanded) {
    card.classList.add('expanded');
    card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function setupVisualizationCards() {
  const container = document.querySelector('.visualizations-container');
  const cardsContainer = document.querySelector('.visualization-cards');
  
  if (!container || !cardsContainer) return;

  // Add scroll arrows
  ['←', '→'].forEach((arrow, i) => {
    const arrowEl = document.createElement('div');
    arrowEl.className = `scroll-arrow scroll-${i ? 'right' : 'left'}`;
    arrowEl.innerHTML = arrow;
    arrowEl.onclick = (e) => {
      e.stopPropagation();
      cardsContainer.scrollBy({ left: i ? 350 : -350, behavior: 'smooth' });
    };
    container.appendChild(arrowEl);
  });

  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    if (['ArrowLeft', 'ArrowRight'].includes(e.key)) {
      cardsContainer.scrollBy({ 
        left: e.key === 'ArrowLeft' ? -350 : 350,
        behavior: 'smooth' 
      });
    }
  });

  // Scroll indicators
  const updateIndicators = () => {
    const arrows = document.querySelectorAll('.scroll-arrow');
    if (!arrows.length) return;
    
    arrows[0].style.opacity = cardsContainer.scrollLeft > 20 ? '1' : '0.3';
    arrows[1].style.opacity = 
      cardsContainer.scrollLeft < (cardsContainer.scrollWidth - cardsContainer.clientWidth - 20) 
      ? '1' : '0.3';
  };

  cardsContainer.addEventListener('scroll', updateIndicators);
  updateIndicators();
}

// ==================== FILE UPLOAD ====================
function setupFileUpload() {
  const fileInput = document.getElementById('resume-file') || createFileInput();
  const resumeDotted = document.querySelector('.resume-dotted');
  const uploadBtn = document.querySelector('.upload-btn');

  // Setup file selection
  uploadBtn?.addEventListener('click', () => fileInput.click());
  
  fileInput.addEventListener('change', () => {
    if (fileInput.files?.[0]) {
      updateFileDisplay(fileInput.files[0].name);
      checkFormRequirements();
    }
  });

  // Drag and drop
  if (resumeDotted) {
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(evt => {
      resumeDotted.addEventListener(evt, preventDefaults, false);
    });

    ['dragenter', 'dragover'].forEach(evt => {
      resumeDotted.addEventListener(evt, () => resumeDotted.classList.add('highlight'), false);
    });

    ['dragleave', 'drop'].forEach(evt => {
      resumeDotted.addEventListener(evt, () => resumeDotted.classList.remove('highlight'), false);
    });

    resumeDotted.addEventListener('drop', handleDrop, false);
  }

  function createFileInput() {
    const input = document.createElement('input');
    input.type = 'file';
    input.id = 'resume-file';
    input.accept = '.pdf,.doc,.docx';
    input.style.display = 'none';
    document.body.appendChild(input);
    return input;
  }

  function updateFileDisplay(filename) {
    let fileNameElement = document.getElementById('selected-file-name');
    if (!fileNameElement) {
      fileNameElement = document.createElement('p');
      fileNameElement.id = 'selected-file-name';
      fileNameElement.className = 'selected-file';
      resumeDotted?.appendChild(fileNameElement);
    }
    fileNameElement.textContent = filename;
    resumeDotted?.classList.add('file-selected');
  }

  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  function handleDrop(e) {
    const file = e.dataTransfer.files?.[0];
    if (file) {
      fileInput.files = e.dataTransfer.files;
      updateFileDisplay(file.name);
      checkFormRequirements();
    }
  }
}

// ==================== FORM HANDLING ====================
function checkFormRequirements() {
  const fileInput = document.getElementById('resume-file');
  const jobTextarea = document.querySelector('textarea');
  const resultBtn = document.getElementById('result-btn');
  
  if (!resultBtn) return;

  const hasFile = fileInput?.files?.length > 0;
  const hasJobText = jobTextarea?.value.trim().length > 0;

  resultBtn.disabled = !(hasFile && hasJobText);
  resultBtn.classList.toggle('disabled', !(hasFile && hasJobText));
}

function setupFormSubmission() {
  const jobTextarea = document.querySelector('textarea');
  const resultBtn = document.getElementById('result-btn');

  jobTextarea?.addEventListener('input', checkFormRequirements);

  resultBtn?.addEventListener('click', async (e) => {
    e.preventDefault();
    if (resultBtn.disabled) return;

    const fileInput = document.getElementById('resume-file');
    const file = fileInput?.files?.[0];
    
    // Validation
    if (!file) {
      alert('Please select a resume file');
      return;
    }

    const validTypes = ['pdf', 'doc', 'docx'];
    const fileExt = file.name.split('.').pop().toLowerCase();
    if (!validTypes.includes(fileExt)) {
      alert('Please upload a PDF or Word document (.pdf, .doc, .docx)');
      return;
    }

    if (!jobTextarea?.value.trim()) {
      alert('Please enter a job description');
      return;
    }

    // Prepare request
    resultBtn.disabled = true;
    resultBtn.textContent = 'Processing...';

    const formData = new FormData();
    formData.append('resume', file);
    formData.append('job_text', jobTextarea.value);

    try {
      const response = await fetchWithTimeout(
        'https://ats-match-ml-powered-resume-job-production.up.railway.app/api/predict_resume_file', 
        {
          method: 'POST',
          body: formData
        },
        180000 // 30 second timeout
      );

      if (!response.ok) {
        const errorData = await tryParseResponse(response);
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      displayResults(data);
      console.log("Results received:", data);
    } catch (error) {
      console.error('API Error:', error);
      alert(`Error: ${error.message || 'Failed to process request'}`);
    } finally {
      resultBtn.disabled = false;
      resultBtn.textContent = 'Get Result';
    }
  });
}

async function fetchWithTimeout(url, options, timeout) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request timed out. Please try again.');
    }
    throw error;
  }
}

async function tryParseResponse(response) {
  try {
    return await response.json();
  } catch {
    return {
      message: await response.text() || response.statusText
    };
  }
}

// ==================== RESULTS DISPLAY ====================

function updateConfidenceBar(confidenceValue) {
  const confidenceBar = document.getElementById("confidence-bar");
  
  // Reset to 0 first for animation
  confidenceBar.style.width = "0%";
  
  // Use a slight delay to ensure the animation works
  setTimeout(() => {
    confidenceBar.style.width = confidenceValue + "%";
    
    // Set color based on confidence level
    if (confidenceValue >= 80) {
      confidenceBar.style.background = "linear-gradient(90deg, #4caf50, #2e7d32)";
    } else if (confidenceValue >= 60) {
      confidenceBar.style.background = "linear-gradient(90deg, #8bc34a, #558b2f)";
    } else if (confidenceValue >= 40) {
      confidenceBar.style.background = "linear-gradient(90deg, #ffc107, #ff8f00)";
    } else {
      confidenceBar.style.background = "linear-gradient(90deg, #ff5722, #c62828)";
    }
  }, 100);
}
function displayResults(data) {
  const modal = document.getElementById("result-modal");
  const label = document.getElementById("prediction-label");
  const confidence = document.getElementById("match-confidence");
  const matchSkills = document.getElementById("matching-skills");
  const missingSkills = document.getElementById("missing-skills");
  
  // Set prediction label with appropriate styling
  const isMatch = data.prediction_label.toLowerCase().includes("relevant");
  label.textContent = data.prediction_label;
  label.className = isMatch ? "match-positive" : "match-negative";
  
  // Set confidence percentage
  const confidenceValue = Math.round(data.probability * 100);
  confidence.textContent = confidenceValue;
  
  // Limit and display matching skills
  const matchingSkillsList = data.matching_skills?.join(", ") || "None";
  matchSkills.textContent = matchingSkillsList;
  
  // Limit missing skills to 6 and display
  const limitedMissingSkills = data.missing_skills?.slice(0, 6) || [];
  missingSkills.textContent = limitedMissingSkills.join(", ") || "None";
  
  // Show more missing skills if there are more than 6
  const missingSkillsContainer = document.getElementById("missing-skills-container");
  const showMoreBtn = document.getElementById("show-more-skills");
  
  if (data.missing_skills?.length > 6) {
    showMoreBtn.style.display = "inline-block";
    showMoreBtn.onclick = function() {
      missingSkills.textContent = data.missing_skills.join(", ");
      showMoreBtn.style.display = "none";
    };
  } else {
    showMoreBtn.style.display = "none";
  }
  
  // Display the modal with animation
  modal.classList.remove("hidden");
  setTimeout(() => {
    modal.classList.add("active");
  }, 10);
}

// Close modal function
function closeModal() {
  const modal = document.getElementById("result-modal");
  modal.classList.remove("active");
  setTimeout(() => {
    modal.classList.add("hidden");
  }, 300);
  console.log("Closing modal...");
}

// Add event listeners
document.addEventListener("DOMContentLoaded", function () {
  document.querySelector(".close-button").addEventListener("click", closeModal);
});


// Close modal when clicking outside the content
document.getElementById("result-modal").addEventListener("click", function(event) {
  if (event.target === this) {
    closeModal();
  }
});

// Escape key to close modal
document.addEventListener("keydown", function(event) {
  if (event.key === "Escape" && !document.getElementById("result-modal").classList.contains("hidden")) {
    closeModal();
  }
});

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', function() {
  console.log("Initializing ATS-Match frontend");
  
  setupVisualizationCards();
  setupFileUpload();
  setupFormSubmission();
  checkFormRequirements();
  
  console.log("Frontend initialized successfully");
});

document.addEventListener("DOMContentLoaded", function () {
  const textarea = document.getElementById("job-description");
  const wordCountDisplay = document.getElementById("word-count");
  const maxWords = 250;

  textarea.addEventListener("input", () => {
    let words = textarea.value.trim().split(/\s+/);
    let wordCount = words.filter(word => word !== "").length;

    if (wordCount > maxWords) {
      words = words.slice(0, maxWords);
      textarea.value = words.join(" ");
      wordCount = maxWords;
    }

    wordCountDisplay.textContent = `${wordCount} / ${maxWords} words`;
  });
});
