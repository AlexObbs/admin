// ===== SUPPORT MESSAGES SECTION FIXES =====

// Updated function to load support messages
async function loadSupportMessages() {
    try {
        if (!supportMessagesList) return;
        
        // Get filter value
        const statusFilter = messageStatusFilter ? messageStatusFilter.value : 'all';
        
        // Show loading
        supportMessagesList.innerHTML = `
            <div class="loading-container">
                <div class="spinner"></div>
                <p>Loading messages...</p>
            </div>
        `;
        
        // Clear message detail
        if (messageDetailPlaceholder && messageDetailContent) {
            messageDetailPlaceholder.style.display = 'flex';
            messageDetailContent.style.display = 'none';
        }
        
        // Create query based on filter
        const messagesRef = collection(db, "messages");
        let messagesQuery;
        
        // Simplified query to make sure we get messages
        if (statusFilter === 'all') {
            messagesQuery = query(
                messagesRef,
                where("recipient", "==", "support"),
                orderBy("timestamp", "desc"),
                limit(50)
            );
        } else if (statusFilter === 'unread') {
            messagesQuery = query(
                messagesRef,
                where("recipient", "==", "support"),
                where("read", "==", false),
                orderBy("timestamp", "desc"),
                limit(50)
            );
        } else if (statusFilter === 'read') {
            messagesQuery = query(
                messagesRef,
                where("recipient", "==", "support"),
                where("read", "==", true),
                orderBy("timestamp", "desc"),
                limit(50)
            );
        }
        
        // Log query parameters for debugging
        console.log('Messages query:', statusFilter);
        
        const messagesSnapshot = await getDocs(messagesQuery);
        console.log('Messages found:', messagesSnapshot.size);
        
        if (messagesSnapshot.empty) {
            supportMessagesList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-envelope-open"></i>
                    <p>No messages found</p>
                </div>
            `;
            return;
        }
        
        // Build HTML
        let html = '';
        messagesSnapshot.forEach(doc => {
            const message = doc.data();
            message.id = doc.id;
            
            // Create initials for avatar
            let initials = 'C';
            if (message.senderName) {
                initials = message.senderName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
            }
            
            // Format timestamp
            const timestamp = message.timestamp ? 
                formatTimeAgo(new Date(message.timestamp.seconds * 1000)) : 
                'Recently';
            
            // Set message preview (truncate if too long)
            const previewText = message.content ? 
                (message.content.length > 60 ? message.content.substring(0, 60) + '...' : message.content) : 
                'No content';
            
            html += `
                <div class="message-item ${message.read ? '' : 'unread'}" data-thread-id="${message.threadId}" data-id="${message.id}" onclick="window.viewThread('${message.threadId}', '${message.id}')">
                    <div class="message-avatar">${initials}</div>
                    <div class="message-preview">
                        <div class="message-name">${message.senderName || 'Client'}</div>
                        <div class="message-subject">${message.subject || 'No subject'}</div>
                        <div class="message-preview-text">${previewText}</div>
                    </div>
                    <div class="message-meta">
                        <div class="message-time">${timestamp}</div>
                        ${message.read ? '' : '<div class="message-status-dot"></div>'}
                    </div>
                </div>
            `;
        });
        
        supportMessagesList.innerHTML = html;
        
    } catch (error) {
        console.error('Error loading support messages:', error);
        if (supportMessagesList) {
            supportMessagesList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>Error loading messages: ${error.message}</p>
                </div>
            `;
        }
    }
}

// Function to view message thread - make globally accessible
window.viewThread = function(threadId, messageId) {
    loadMessageThread(threadId, messageId);
};

// Updated function to load message thread
async function loadMessageThread(threadId, messageId) {
    try {
        if (!messageDetailContent || !messageDetailPlaceholder || !messageThread) return;
        
        console.log('Loading thread:', threadId, 'Message ID:', messageId);
        currentMessageThreadId = threadId;
        
        // Show loading
        messageDetailPlaceholder.style.display = 'none';
        messageDetailContent.style.display = 'block';
        messageThread.innerHTML = `
            <div class="loading-container">
                <div class="spinner"></div>
                <p>Loading conversation...</p>
            </div>
        `;
        
        // Get all messages in the thread
        const messagesRef = collection(db, "messages");
        const threadQuery = query(
            messagesRef,
            where("threadId", "==", threadId),
            orderBy("timestamp", "asc")
        );
        
        console.log('Thread query parameters:', threadId);
        const threadSnapshot = await getDocs(threadQuery);
        console.log('Thread messages found:', threadSnapshot.size);
        
        if (threadSnapshot.empty) {
            messageThread.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>No messages found in this thread</p>
                </div>
            `;
            return;
        }
        
        // Get the first message for header info
        const firstMessage = threadSnapshot.docs[0].data();
        console.log('First message:', firstMessage);
        
        // Update header info
        if (senderInitials) {
            if (firstMessage.senderName) {
                senderInitials.textContent = firstMessage.senderName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
            } else {
                senderInitials.textContent = 'C';
            }
        }
        
        if (senderName) senderName.textContent = firstMessage.senderName || 'Client';
        if (messageSubject) messageSubject.textContent = firstMessage.subject || 'No subject';
        
        // Show/hide mark as read button based on read status
        if (markAsReadBtn) {
            if (messageId) {
                const messageDoc = await getDoc(doc(db, "messages", messageId));
                if (messageDoc.exists()) {
                    const messageData = messageDoc.data();
                    markAsReadBtn.style.display = messageData.read ? 'none' : 'inline-flex';
                }
            }
        }
        
        // Build thread HTML
        let threadHTML = '';
        threadSnapshot.forEach(doc => {
            const message = doc.data();
            const isSupport = message.sender === 'support';
            
            // Format timestamp
            const timestamp = message.timestamp ? 
                new Date(message.timestamp.seconds * 1000).toLocaleString() : 
                'Recently';
            
            // Get sender initials
            let bubbleInitials;
            if (isSupport) {
                bubbleInitials = 'S';
            } else if (message.senderName) {
                bubbleInitials = message.senderName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
            } else {
                bubbleInitials = 'C';
            }
            
            threadHTML += `
                <div class="message-bubble ${isSupport ? 'support' : 'client'}">
                    <div class="message-bubble-avatar">${bubbleInitials}</div>
                    <div class="message-bubble-content">
                        <div class="message-bubble-header">
                            <div class="message-bubble-name">${isSupport ? 'Support Team' : message.senderName || 'Client'}</div>
                            <div class="message-bubble-time">${timestamp}</div>
                        </div>
                        <div class="message-bubble-text">${message.content || 'No content'}</div>
                    </div>
                </div>
            `;
        });
        
        messageThread.innerHTML = threadHTML;
        
        // Scroll to bottom of thread
        messageThread.scrollTop = messageThread.scrollHeight;
        
        // Mark message as read if it's unread
        if (messageId) {
            const messageDoc = await getDoc(doc(db, "messages", messageId));
            if (messageDoc.exists() && !messageDoc.data().read) {
                markMessageAsRead(messageId);
            }
        }
        
    } catch (error) {
        console.error('Error loading message thread:', error);
        if (messageThread) {
            messageThread.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>Error loading conversation: ${error.message}</p>
                </div>
            `;
        }
    }
}

// ===== BOOKINGS SECTION FIXES =====

// Updated function to load pending bookings
async function loadPendingBookings() {
    try {
        if (!pendingBookingsList) return;
        
        const statusFilter = bookingStatusFilter ? bookingStatusFilter.value : 'all';
        
        // Show loading
        pendingBookingsList.innerHTML = `
            <tr>
                <td colspan="6" class="loading-row">
                    <div class="spinner"></div>
                    <span>Loading bookings...</span>
                </td>
            </tr>
        `;
        
        // Create query based on filter - simplified to ensure we get results
        const bookingsRef = collection(db, "bookings");
        let bookingsQuery;
        
        if (statusFilter === 'all') {
            bookingsQuery = query(
                bookingsRef,
                orderBy("createdAt", "desc")
            );
        } else {
            // Try a more lenient query to see if we get any results
            bookingsQuery = query(
                bookingsRef,
                orderBy("createdAt", "desc")
            );
        }
        
        // Log query parameters for debugging
        console.log('Bookings query:', statusFilter);
        
        const bookingsSnapshot = await getDocs(bookingsQuery);
        console.log('Bookings found:', bookingsSnapshot.size);
        
        if (bookingsSnapshot.empty) {
            pendingBookingsList.innerHTML = `
                <tr>
                    <td colspan="6" class="loading-row">
                        <i class="fas fa-info-circle"></i>
                        <span>No bookings found</span>
                    </td>
                </tr>
            `;
            return;
        }
        
        // Build HTML
        let html = '';
        
        // If using a lenient query, filter results manually based on the status filter
        const filteredDocs = statusFilter === 'all' 
            ? bookingsSnapshot.docs 
            : bookingsSnapshot.docs.filter(doc => {
                const data = doc.data();
                return data.guideStatus === statusFilter;
            });
        
        // If no matches after filtering
        if (filteredDocs.length === 0) {
            pendingBookingsList.innerHTML = `
                <tr>
                    <td colspan="6" class="loading-row">
                        <i class="fas fa-info-circle"></i>
                        <span>No bookings matching the selected filter</span>
                    </td>
                </tr>
            `;
            return;
        }
        
        filteredDocs.forEach(doc => {
            const booking = doc.data();
            booking.id = doc.id;
            
            // Format dates safely
            const bookingDate = booking.bookingDate 
                ? new Date(booking.bookingDate.seconds * 1000).toLocaleDateString() 
                : (booking.createdAt 
                    ? new Date(booking.createdAt.seconds * 1000).toLocaleDateString() 
                    : 'Not available');
            
            // Determine guide status - default to 'Pending' if not specified
            const guideStatus = booking.guideStatus || 'Pending';
            const statusClass = guideStatus === 'Assigned' ? 'status-assigned' : 'status-pending';
            
            html += `
                <tr>
                    <td>${booking.id.substring(0, 8)}...</td>
                    <td>${booking.clientName || 'Unknown'}</td>
                    <td>${booking.packageName || booking.packageType || 'Unknown'}</td>
                    <td>${bookingDate}</td>
                    <td><span class="status-badge ${statusClass}">${guideStatus}</span></td>
                    <td>
                        <button class="action-btn view" onclick="window.viewBookingDetails('${booking.id}')">
                            <i class="fas fa-eye"></i> View
                        </button>
                        ${guideStatus !== 'Assigned' ? 
                            `<button class="action-btn" onclick="window.openAssignmentModal('${booking.id}')">
                                <i class="fas fa-user-plus"></i> Assign Guide
                            </button>` : 
                            ''}
                    </td>
                </tr>
            `;
        });
        
        pendingBookingsList.innerHTML = html;
        
    } catch (error) {
        console.error('Error loading pending bookings:', error);
        if (pendingBookingsList) {
            pendingBookingsList.innerHTML = `
                <tr>
                    <td colspan="6" class="loading-row">
                        <i class="fas fa-exclamation-circle"></i>
                        <span>Error loading bookings: ${error.message}</span>
                    </td>
                </tr>
            `;
        }
    }
}

// ===== GUIDES SECTION IMPLEMENTATION =====

// Add this to the loadSectionContent function in your main script
function loadSectionContent(sectionId) {
    switch (sectionId) {
        case 'dashboard':
            // Dashboard is already loaded
            break;
        case 'guide-assignment':
            loadPendingBookings();
            loadAvailableGuides();
            break;
        case 'support-messages':
            loadSupportMessages();
            break;
        case 'guides':
            loadAllGuides(); // Add this line
            break;
        // Add more cases for other sections
        default:
            // Do nothing for other sections yet
            break;
    }
}

// Function to load all guides
async function loadAllGuides() {
    const guidesSection = document.getElementById('guides-section');
    if (!guidesSection) return;
    
    // Replace placeholder content with actual guide list
    guidesSection.innerHTML = `
        <div class="section-header">
            <h2>All Guides</h2>
            <p class="section-description">Manage safari guides</p>
        </div>
        
        <div class="card">
            <div class="card-header">
                <h3>Safari Guides</h3>
                <div class="header-actions">
                    <div class="search-box">
                        <input type="text" id="guideSearchInput" placeholder="Search guides...">
                        <i class="fas fa-search"></i>
                    </div>
                    <select id="guideStatusFilter">
                        <option value="all">All Statuses</option>
                        <option value="Active" selected>Active</option>
                        <option value="Inactive">Inactive</option>
                    </select>
                    <button class="action-btn" id="addGuideBtn">
                        <i class="fas fa-plus"></i> Add Guide
                    </button>
                </div>
            </div>
            <div class="card-body">
                <div class="guide-grid" id="guidesList">
                    <div class="loading-container">
                        <div class="spinner"></div>
                        <p>Loading guides...</p>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Add search functionality
    const guideSearchInput = document.getElementById('guideSearchInput');
    if (guideSearchInput) {
        guideSearchInput.addEventListener('input', filterGuides);
    }
    
    // Add filter functionality
    const guideStatusFilter = document.getElementById('guideStatusFilter');
    if (guideStatusFilter) {
        guideStatusFilter.addEventListener('change', () => {
            loadGuidesData();
        });
    }
    
    // Add button event
    const addGuideBtn = document.getElementById('addGuideBtn');
    if (addGuideBtn) {
        addGuideBtn.addEventListener('click', () => {
            alert('Add guide functionality will be implemented soon');
        });
    }
    
    // Load guides data
    loadGuidesData();
}

// Function to load guides data
async function loadGuidesData() {
    const guidesList = document.getElementById('guidesList');
    if (!guidesList) return;
    
    try {
        const statusFilter = document.getElementById('guideStatusFilter')?.value || 'all';
        
        // Show loading
        guidesList.innerHTML = `
            <div class="loading-container">
                <div class="spinner"></div>
                <p>Loading guides...</p>
            </div>
        `;
        
        // Create query based on filter
        const guidesRef = collection(db, "guides");
        let guidesQuery;
        
        if (statusFilter === 'all') {
            guidesQuery = query(guidesRef);
        } else {
            guidesQuery = query(
                guidesRef,
                where("status", "==", statusFilter)
            );
        }
        
        const guidesSnapshot = await getDocs(guidesQuery);
        
        if (guidesSnapshot.empty) {
            guidesList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-users"></i>
                    <p>No guides found</p>
                </div>
            `;
            return;
        }
        
        // Build guides grid
        let html = '';
        guidesSnapshot.forEach(doc => {
            const guide = doc.data();
            guide.id = doc.id;
            
            // Create guide card
            html += `
                <div class="guide-card" data-id="${guide.id}">
                    <div class="guide-card-header">
                        <div class="guide-avatar">
                            <img src="${guide.profileImageUrl || 'profile.png'}" alt="${guide.fullName || 'Guide'}">
                        </div>
                        <div class="guide-status ${guide.status === 'Active' ? 'status-active' : 'status-inactive'}">
                            ${guide.status || 'Active'}
                        </div>
                    </div>
                    <div class="guide-card-body">
                        <h3 class="guide-name">${guide.fullName || 'Guide ' + guide.id.substring(0, 5)}</h3>
                        <p class="guide-experience">${guide.experienceYears || 0} years experience</p>
                        <div class="guide-languages">
                            ${guide.languages && Array.isArray(guide.languages) ? 
                                guide.languages.map(lang => `<span class="language-tag">${lang}</span>`).join('') : 
                                '<span class="language-tag">English</span>'}
                        </div>
                    </div>
                    <div class="guide-card-footer">
                        <button class="guide-action-btn view" onclick="window.viewGuideDetails('${guide.id}')">
                            <i class="fas fa-eye"></i> View
                        </button>
                        <button class="guide-action-btn edit" onclick="window.editGuide('${guide.id}')">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                    </div>
                </div>
            `;
        });
        
        guidesList.innerHTML = html;
        
        // Add CSS for guides grid
        const styleElement = document.createElement('style');
        styleElement.textContent = `
            .guide-grid {
                display: grid;
                grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
                gap: 20px;
            }
            
            .guide-card {
                background-color: white;
                border-radius: 10px;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
                overflow: hidden;
                transition: transform 0.2s, box-shadow 0.2s;
            }
            
            .guide-card:hover {
                transform: translateY(-5px);
                box-shadow: 0 8px 15px rgba(0, 0, 0, 0.1);
            }
            
            .guide-card-header {
                position: relative;
                padding-top: 20px;
                display: flex;
                justify-content: center;
            }
            
            .guide-avatar {
                width: 100px;
                height: 100px;
                border-radius: 50%;
                overflow: hidden;
                border: 4px solid #fff;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            }
            
            .guide-avatar img {
                width: 100%;
                height: 100%;
                object-fit: cover;
            }
            
            .guide-status {
                position: absolute;
                top: 15px;
                right: 15px;
                padding: 5px 10px;
                border-radius: 20px;
                font-size: 0.8rem;
                font-weight: 500;
            }
            
            .status-active {
                background-color: #e6f7ef;
                color: #2ecc71;
            }
            
            .status-inactive {
                background-color: #fde7e6;
                color: #e74c3c;
            }
            
            .guide-card-body {
                padding: 20px;
                text-align: center;
            }
            
            .guide-name {
                font-size: 1.2rem;
                font-weight: 500;
                color: #333;
                margin-bottom: 5px;
            }
            
            .guide-experience {
                font-size: 0.9rem;
                color: #777;
                margin-bottom: 10px;
            }
            
            .guide-languages {
                display: flex;
                flex-wrap: wrap;
                justify-content: center;
                gap: 5px;
            }
            
            .language-tag {
                background-color: #f8f9fa;
                padding: 3px 8px;
                border-radius: 20px;
                font-size: 0.8rem;
                color: #555;
            }
            
            .guide-card-footer {
                padding: 15px;
                border-top: 1px solid #eee;
                display: flex;
                justify-content: space-between;
            }
            
            .guide-action-btn {
                background-color: #f8f9fa;
                color: #555;
                border: none;
                padding: 8px 12px;
                border-radius: 5px;
                font-size: 0.9rem;
                cursor: pointer;
                transition: background-color 0.2s;
                display: flex;
                align-items: center;
                gap: 5px;
            }
            
            .guide-action-btn:hover {
                background-color: #e9ecef;
            }
            
            .guide-action-btn.view {
                background-color: #e8f4fd;
                color: #3498db;
            }
            
            .guide-action-btn.view:hover {
                background-color: #d6eaf8;
            }
            
            .guide-action-btn.edit {
                background-color: #fff5eb;
                color: #e67e22;
            }
            
            .guide-action-btn.edit:hover {
                background-color: #fdebd0;
            }
        `;
        document.head.appendChild(styleElement);
        
    } catch (error) {
        console.error('Error loading guides:', error);
        if (guidesList) {
            guidesList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>Error loading guides: ${error.message}</p>
                </div>
            `;
        }
    }
}

// Function to filter guides
function filterGuides() {
    const guideSearchInput = document.getElementById('guideSearchInput');
    if (!guideSearchInput) return;
    
    const searchText = guideSearchInput.value.toLowerCase();
    const guideCards = document.querySelectorAll('.guide-card');
    
    guideCards.forEach(card => {
        const guideName = card.querySelector('.guide-name').textContent.toLowerCase();
        const guideExperience = card.querySelector('.guide-experience').textContent.toLowerCase();
        const guideLanguages = card.querySelector('.guide-languages').textContent.toLowerCase();
        
        if (
            guideName.includes(searchText) ||
            guideExperience.includes(searchText) ||
            guideLanguages.includes(searchText)
        ) {
            card.style.display = '';
        } else {
            card.style.display = 'none';
        }
    });
}

// Add guide action functions
window.viewGuideDetails = function(guideId) {
    alert(`View guide with ID: ${guideId}\nThis functionality will be implemented soon.`);
};

window.editGuide = function(guideId) {
    alert(`Edit guide with ID: ${guideId}\nThis functionality will be implemented soon.`);
};