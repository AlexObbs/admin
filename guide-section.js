/**
 * Guide Section Fixes:
 * 1. Fixes status filtering issue
 * 2. Improves guide card appearance
 * 3. Adds guide messaging functionality
 */

// Enhanced function to load all guides with proper filtering
async function loadAllGuidesEnhanced() {
    console.log("Loading all guides with enhanced filtering...");
    
    const guidesList = document.getElementById('guidesList');
    if (!guidesList) return;
    
    // Show loading
    guidesList.innerHTML = `
        <div class="loading-container">
            <div class="spinner"></div>
            <p>Loading guides...</p>
        </div>
    `;
    
    try {
        // Get status filter if available
        const statusFilter = document.getElementById('guideStatusFilter')?.value || 'all';
        console.log(`Status filter selected: ${statusFilter}`);
        
        // Fetch all guides
        const guidesRef = firebase.firestore().collection("guides");
        const guidesSnapshot = await guidesRef.get();
        
        console.log(`Found ${guidesSnapshot.size} total guides`);
        
        if (guidesSnapshot.empty) {
            guidesList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-users"></i>
                    <p>No guides found</p>
                </div>
            `;
            return;
        }
        
        // Process all guides and assign default status if missing
        const allGuides = guidesSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                // Ensure status is defined and normalized
                status: (data.status || 'Active')
            };
        });
        
        console.log(`Processed ${allGuides.length} guides with normalized status values`);
        
        // Filter by status if needed
        let filteredGuides = allGuides;
        
        if (statusFilter !== 'all') {
            console.log(`Filtering guides by status: ${statusFilter}`);
            filteredGuides = filteredGuides.filter(guide => {
                // Fix: Properly compare status (case-insensitive)
                return guide.status.toLowerCase() === statusFilter.toLowerCase();
            });
        }
        
        console.log(`After filtering by '${statusFilter}': ${filteredGuides.length} guides`);
        
        if (filteredGuides.length === 0) {
            guidesList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-filter"></i>
                    <p>No guides match the selected filter</p>
                </div>
            `;
            return;
        }
        
        // Build HTML with improved card design
        let html = '';
        
        filteredGuides.forEach(guide => {
            // Handle guide languages
            const languages = guide.languages && Array.isArray(guide.languages) 
                ? guide.languages.map(lang => `<span class="language-tag">${lang}</span>`).join('')
                : '<span class="language-tag">English</span>';
            
            // Calculate star rating based on experience (1-5 stars)
            const experience = guide.experienceYears || 0;
            const stars = Math.min(5, Math.max(1, Math.ceil(experience / 2)));
            let starsHtml = '';
            for (let i = 0; i < 5; i++) {
                if (i < stars) {
                    starsHtml += '<i class="fas fa-star"></i>';
                } else {
                    starsHtml += '<i class="far fa-star"></i>';
                }
            }
            
            // Create a specialization badge if available
            const specializationBadge = guide.specialization ? 
                `<span class="specialization-badge"><i class="fas fa-award"></i> ${guide.specialization}</span>` : '';
            
            html += `
                <div class="guide-card" data-id="${guide.id}" data-status="${guide.status}">
                    <div class="guide-card-banner"></div>
                    <div class="guide-header">
                        <div class="guide-avatar">
                            <img src="${guide.profileImageUrl || 'profile.png'}" alt="${guide.fullName || 'Guide'}">
                        </div>
                        <div class="guide-status ${guide.status.toLowerCase() === 'active' ? 'status-active' : 'status-inactive'}">
                            ${guide.status}
                        </div>
                        ${specializationBadge}
                    </div>
                    <div class="guide-body">
                        <h3 class="guide-name">${guide.fullName || `Guide ${guide.id.substring(0, 5)}`}</h3>
                        <div class="guide-rating">
                            ${starsHtml}
                            <span class="guide-experience">${experience} years experience</span>
                        </div>
                        <div class="guide-bio">
                            ${guide.bio || `Experienced safari guide with knowledge of local wildlife and terrain.`}
                        </div>
                        <div class="guide-languages">
                            ${languages}
                        </div>
                        <div class="guide-stats">
                            <div class="stat-item">
                                <i class="fas fa-route"></i>
                                <span>${guide.toursCompleted || 0}</span>
                                <label>Tours</label>
                            </div>
                            <div class="stat-item">
                                <i class="fas fa-star"></i>
                                <span>${guide.rating || '4.5'}</span>
                                <label>Rating</label>
                            </div>
                            <div class="stat-item">
                                <i class="fas fa-users"></i>
                                <span>${guide.clientsServed || 0}</span>
                                <label>Clients</label>
                            </div>
                        </div>
                        <div class="guide-actions">
                            <button class="guide-btn view" onclick="window.viewGuideDetails('${guide.id}')" title="View details">
                                <i class="fas fa-eye"></i> View
                            </button>
                            <button class="guide-btn edit" onclick="window.editGuideDetails('${guide.id}')" title="Edit guide">
                                <i class="fas fa-edit"></i> Edit
                            </button>
                            <button class="guide-btn message" onclick="window.openGuideMessageModal('${guide.id}', '${guide.fullName || `Guide ${guide.id.substring(0, 5)}`}')" title="Message guide">
                                <i class="fas fa-envelope"></i> Message
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });
        
        guidesList.innerHTML = html;
        
    } catch (error) {
        console.error('Error loading guides:', error);
        guidesList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Error loading guides: ${error.message}</p>
            </div>
        `;
    }
}

// Enhanced filter function
function filterGuidesEnhanced() {
    const searchInput = document.getElementById('guideSearchInput');
    const guideCards = document.querySelectorAll('.guide-card');
    
    if (!searchInput || !guideCards.length) return;
    
    const searchText = searchInput.value.toLowerCase().trim();
    
    let visibleCount = 0;
    
    guideCards.forEach(card => {
        const name = card.querySelector('.guide-name').textContent.toLowerCase();
        const experience = card.querySelector('.guide-experience').textContent.toLowerCase();
        const languages = card.querySelector('.guide-languages').textContent.toLowerCase();
        const bio = card.querySelector('.guide-bio').textContent.toLowerCase();
        // Also search specialization if present
        const specializationElement = card.querySelector('.specialization-badge');
        const specialization = specializationElement ? specializationElement.textContent.toLowerCase() : '';
        
        if (name.includes(searchText) || 
            experience.includes(searchText) || 
            languages.includes(searchText) || 
            bio.includes(searchText) ||
            specialization.includes(searchText)) {
            card.style.display = '';
            visibleCount++;
        } else {
            card.style.display = 'none';
        }
    });
    
    // Show no results message if needed
    const noResultsMsg = document.getElementById('noGuidesResults');
    if (visibleCount === 0) {
        if (!noResultsMsg) {
            const message = document.createElement('div');
            message.id = 'noGuidesResults';
            message.className = 'empty-state';
            message.innerHTML = `
                <i class="fas fa-search"></i>
                <p>No guides match your search for "${searchText}"</p>
            `;
            document.getElementById('guidesList').appendChild(message);
        }
    } else if (noResultsMsg) {
        noResultsMsg.remove();
    }
}

// Guide Message Modal Creation
function createGuideMessageModal() {
    // Check if modal already exists
    if (document.getElementById('guideMessageModal')) {
        return;
    }
    
    // Create modal element
    const modal = document.createElement('div');
    modal.id = 'guideMessageModal';
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3 class="modal-title">Message to Guide</h3>
                <button class="modal-close" id="closeGuideMessageModal">&times;</button>
            </div>
            <div class="modal-body">
                <div class="guide-info">
                    <div class="guide-message-avatar">
                        <span id="guideMessageInitials">GD</span>
                    </div>
                    <h4 id="guideMessageName">Guide Name</h4>
                </div>
                
                <form id="guideMessageForm">
                    <input type="hidden" id="guideMessageId">
                    <div class="form-group">
                        <label for="guideMessageSubject">Subject:</label>
                        <input type="text" id="guideMessageSubject" class="form-control" placeholder="Enter message subject" required>
                    </div>
                    <div class="form-group">
                        <label for="guideMessageContent">Message:</label>
                        <textarea id="guideMessageContent" class="form-control" placeholder="Type your message here..." rows="6" required></textarea>
                    </div>
                    <div class="form-actions">
                        <button type="button" class="btn btn-cancel" id="cancelGuideMessage">Cancel</button>
                        <button type="submit" class="btn btn-primary">
                            <i class="fas fa-paper-plane"></i> Send Message
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    // Add modal to body
    document.body.appendChild(modal);
    
    // Set up event listeners
    document.getElementById('closeGuideMessageModal').addEventListener('click', () => {
        modal.classList.remove('active');
    });
    
    document.getElementById('cancelGuideMessage').addEventListener('click', () => {
        modal.classList.remove('active');
    });
    
    document.getElementById('guideMessageForm').addEventListener('submit', sendGuideMessage);
}

// Open guide message modal
function openGuideMessageModal(guideId, guideName) {
    // Create modal if it doesn't exist
    createGuideMessageModal();
    
    // Get modal elements
    const modal = document.getElementById('guideMessageModal');
    const guideMessageId = document.getElementById('guideMessageId');
    const guideMessageName = document.getElementById('guideMessageName');
    const guideMessageInitials = document.getElementById('guideMessageInitials');
    
    // Set guide information
    guideMessageId.value = guideId;
    guideMessageName.textContent = guideName;
    
    // Create initials
    const initials = guideName
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);
    guideMessageInitials.textContent = initials;
    
    // Clear previous form data
    document.getElementById('guideMessageSubject').value = '';
    document.getElementById('guideMessageContent').value = '';
    
    // Show modal
    modal.classList.add('active');
}

// Send message to guide
async function sendGuideMessage(event) {
    event.preventDefault();
    
    // Get form data
    const guideId = document.getElementById('guideMessageId').value;
    const subject = document.getElementById('guideMessageSubject').value.trim();
    const content = document.getElementById('guideMessageContent').value.trim();
    const submitBtn = event.target.querySelector('button[type="submit"]');
    
    if (!guideId || !subject || !content) {
        alert('Please fill out all fields');
        return;
    }
    
    // Disable submit button and show loading state
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
    
    try {
        // Get guide information
        const guideDoc = await firebase.firestore().collection('guides').doc(guideId).get();
        
        if (!guideDoc.exists) {
            throw new Error('Guide not found');
        }
        
        const guide = guideDoc.data();
        
        // Create a new thread ID
        const threadId = `admin_to_guide_${Date.now()}`;
        
        // Add message to Firestore
        await firebase.firestore().collection('messages').add({
            threadId: threadId,
            sender: 'admin',
            senderName: 'Admin',
            recipient: guideId,
            recipientName: guide.fullName || `Guide ${guideId.substring(0, 5)}`,
            subject: subject,
            content: content,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            read: false,
            isLatest: true
        });
        
        // Close modal
        document.getElementById('guideMessageModal').classList.remove('active');
        
        // Show success message
        alert('Message sent successfully');
        
    } catch (error) {
        console.error('Error sending message to guide:', error);
        alert(`Error sending message: ${error.message}`);
        
    } finally {
        // Re-enable submit button
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Message';
    }
}

// CSS styles for improved guide cards and message modal
const guideEnhancementStyles = `
/* Enhanced Guide Cards Styling */
.guides-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 25px;
}

.guide-card {
    background-color: white;
    border-radius: 12px;
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.08);
    overflow: hidden;
    transition: transform 0.3s, box-shadow 0.3s;
    position: relative;
    border: 1px solid #f0f0f0;
}

.guide-card:hover {
    transform: translateY(-8px);
    box-shadow: 0 12px 20px rgba(0, 0, 0, 0.12);
}

.guide-card-banner {
    height: 60px;
    background: linear-gradient(135deg, #e67e22 0%, #d35400 100%);
    border-radius: 12px 12px 0 0;
}

.guide-header {
    position: relative;
    padding-top: 5px;
    text-align: center;
    margin-bottom: 10px;
}

.guide-avatar {
    width: 120px;
    height: 120px;
    border-radius: 50%;
    overflow: hidden;
    margin: -5px auto 10px;
    border: 5px solid white;
    box-shadow: 0 3px 12px rgba(0, 0, 0, 0.15);
    position: relative;
    z-index: 2;
}

.guide-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.guide-status {
    position: absolute;
    top: 10px;
    right: 15px;
    padding: 6px 12px;
    border-radius: 20px;
    font-size: 0.8rem;
    font-weight: 600;
    z-index: 3;
}

.status-active {
    background-color: #e6f7ef;
    color: #2ecc71;
}

.status-inactive {
    background-color: #fdecea;
    color: #e74c3c;
}

.specialization-badge {
    position: absolute;
    top: 10px;
    left: 15px;
    padding: 6px 12px;
    border-radius: 20px;
    font-size: 0.8rem;
    font-weight: 600;
    background-color: #fff5eb;
    color: #e67e22;
    z-index: 3;
}

.guide-body {
    padding: 15px 20px 25px;
    text-align: center;
}

.guide-name {
    font-size: 1.3rem;
    font-weight: 600;
    margin-bottom: 5px;
    color: #333;
}

.guide-rating {
    color: #f39c12;
    margin-bottom: 15px;
    font-size: 0.9rem;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
}

.guide-rating i {
    margin-right: 2px;
}

.guide-experience {
    color: #777;
    font-size: 0.9rem;
    margin-left: 5px;
}

.guide-bio {
    color: #555;
    font-size: 0.9rem;
    margin-bottom: 15px;
    line-height: 1.5;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
}

.guide-languages {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 6px;
    margin-bottom: 20px;
}

.language-tag {
    background-color: #f5f5f5;
    padding: 5px 10px;
    border-radius: 20px;
    font-size: 0.8rem;
    color: #555;
    font-weight: 500;
}

.guide-stats {
    display: flex;
    justify-content: space-around;
    margin-bottom: 20px;
    padding: 12px 0;
    border-top: 1px solid #f0f0f0;
    border-bottom: 1px solid #f0f0f0;
}

.stat-item {
    display: flex;
    flex-direction: column;
    align-items: center;
}

.stat-item i {
    color: #e67e22;
    font-size: 1.1rem;
    margin-bottom: 5px;
}

.stat-item span {
    font-size: 1.1rem;
    font-weight: 600;
    color: #333;
}

.stat-item label {
    font-size: 0.8rem;
    color: #777;
    margin-top: 2px;
}

.guide-actions {
    display: flex;
    gap: 10px;
    justify-content: center;
    margin-top: 15px;
}

.guide-btn {
    padding: 8px 15px;
    border-radius: 8px;
    border: none;
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 5px;
    transition: all 0.2s;
}

.guide-btn.view {
    background-color: #e8f4fd;
    color: #3498db;
}

.guide-btn.view:hover {
    background-color: #d6eafb;
}

.guide-btn.edit {
    background-color: #fff5eb;
    color: #e67e22;
}

.guide-btn.edit:hover {
    background-color: #fdebd0;
}

.guide-btn.message {
    background-color: #e6f7ef;
    color: #2ecc71;
}

.guide-btn.message:hover {
    background-color: #d1f2e4;
}

/* Status filter enhancement */
#guideStatusFilter {
    padding: 8px 12px;
    border-radius: 8px;
    border: 1px solid #ddd;
    cursor: pointer;
    font-size: 0.9rem;
    background-color: white;
}

/* Empty state styling */
.empty-state {
    text-align: center;
    padding: 50px 20px;
    color: #777;
}

.empty-state i {
    font-size: 3rem;
    margin-bottom: 15px;
    opacity: 0.3;
}

/* Guide Message Modal Styling */
.modal {
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    z-index: 1000;
    align-items: center;
    justify-content: center;
}

.modal.active {
    display: flex;
}

.modal-content {
    background-color: white;
    border-radius: 10px;
    box-shadow: 0 5px 20px rgba(0, 0, 0, 0.2);
    width: 90%;
    max-width: 500px;
    max-height: 90vh;
    overflow-y: auto;
}

.modal-header {
    padding: 20px;
    border-bottom: 1px solid #eee;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.modal-title {
    font-size: 1.2rem;
    font-weight: 600;
    color: #333;
}

.modal-close {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    color: #777;
}

.modal-body {
    padding: 20px;
}

.guide-info {
    display: flex;
    align-items: center;
    margin-bottom: 20px;
    padding-bottom: 15px;
    border-bottom: 1px solid #eee;
}

.guide-message-avatar {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background-color: #e67e22;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
    font-weight: 600;
    margin-right: 15px;
}

#guideMessageName {
    font-size: 1.2rem;
    color: #333;
    margin: 0;
}

.form-group {
    margin-bottom: 20px;
}

.form-group label {
    display: block;
    margin-bottom: 8px;
    font-weight: 500;
    color: #333;
}

.form-control {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid #ddd;
    border-radius: 8px;
    font-size: 1rem;
}

.form-control:focus {
    outline: none;
    border-color: #e67e22;
}

.form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 20px;
}

.btn {
    padding: 10px 16px;
    border-radius: 8px;
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    border: none;
}

.btn-primary {
    background-color: #e67e22;
    color: white;
}

.btn-primary:hover {
    background-color: #d35400;
}

.btn-cancel {
    background-color: #f5f5f5;
    color: #333;
}

.btn-cancel:hover {
    background-color: #e5e5e5;
}
`;

// Function to add styles to document
function addGuideEnhancementStyles() {
    const styleId = 'guide-enhancement-styles';
    
    // Check if styles already exist
    if (!document.getElementById(styleId)) {
        const styleElement = document.createElement('style');
        styleElement.id = styleId;
        styleElement.textContent = guideEnhancementStyles;
        document.head.appendChild(styleElement);
        console.log('Guide enhancement styles added');
    }
}

// Initialize the enhancements when the document is ready
document.addEventListener('DOMContentLoaded', function() {
    // Add the styles
    addGuideEnhancementStyles();
    
    // Create guide message modal
    createGuideMessageModal();
    
    // Expose functions to window object
    window.openGuideMessageModal = openGuideMessageModal;
    window.loadAllGuidesEnhanced = loadAllGuidesEnhanced;
    window.filterGuidesEnhanced = filterGuidesEnhanced;
    
    // Check if we are replacing existing functions or creating new ones
    if (typeof window.loadAllGuides === 'function') {
        console.log('Replacing existing loadAllGuides function');
        window.loadAllGuides = loadAllGuidesEnhanced;
    }
    
    if (typeof window.filterGuides === 'function') {
        console.log('Replacing existing filterGuides function');
        window.filterGuides = filterGuidesEnhanced;
    }
    
    // Set up event handlers
    const guideSearchInput = document.getElementById('guideSearchInput');
    if (guideSearchInput) {
        guideSearchInput.addEventListener('input', filterGuidesEnhanced);
    }
    
    const guideStatusFilter = document.getElementById('guideStatusFilter');
    if (guideStatusFilter) {
        guideStatusFilter.addEventListener('change', loadAllGuidesEnhanced);
    }
    
    // Try loading guides if we're on the guides section
    const guidesSection = document.getElementById('guides-section');
    if (guidesSection) {
        const sectionHeader = guidesSection.querySelector('.section-header');
        
        if (sectionHeader) {
            // Add refresh button if it doesn't exist
            if (!document.getElementById('refreshGuidesBtn')) {
                const refreshButton = document.createElement('button');
                refreshButton.id = 'refreshGuidesBtn';
                refreshButton.className = 'btn btn-primary';
                refreshButton.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh Guides';
                refreshButton.style.marginLeft = '10px';
                refreshButton.addEventListener('click', loadAllGuidesEnhanced);
                sectionHeader.appendChild(refreshButton);
            }
        }
        
        // Load guides with a small delay to ensure DOM is ready
        setTimeout(loadAllGuidesEnhanced, 500);
    }
});