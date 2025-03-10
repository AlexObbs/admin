/**
 * Complete Messaging System Fixes:
 * 1. Fix guide messaging functionality
 * 2. Group messages by contact instead of separate threads
 */

// ==============================================
// GUIDE MESSAGING FUNCTIONALITY
// ==============================================

// Create and inject the guide message modal
function setupGuideMessagingSystem() {
    console.log("Setting up guide messaging system...");
    
    // First, check if modal already exists
    if (!document.getElementById('guideMessageModal')) {
        // Create the modal HTML
        const modalHTML = `
            <div class="modal" id="guideMessageModal">
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
            </div>
        `;
        
        // Create a container for the modal
        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = modalHTML;
        document.body.appendChild(modalContainer.firstElementChild);
        
        // Add event listeners
        document.getElementById('closeGuideMessageModal').addEventListener('click', () => {
            document.getElementById('guideMessageModal').classList.remove('active');
        });
        
        document.getElementById('cancelGuideMessage').addEventListener('click', () => {
            document.getElementById('guideMessageModal').classList.remove('active');
        });
        
        document.getElementById('guideMessageForm').addEventListener('submit', sendGuideMessage);
        
        console.log("Guide message modal created and added to DOM");
    }
    
    // Add styling if not already present
    addMessagingStyles();
    
    // Override the existing messageGuideDirectly function
    window.messageGuideDirectly = function(guideId) {
        console.log(`Opening message modal for guide: ${guideId}`);
        
        // Find guide name from the card if available
        let guideName = `Guide ${guideId.substring(0, 5)}`;
        const guideCard = document.querySelector(`.guide-card[data-id="${guideId}"]`);
        if (guideCard) {
            const nameElement = guideCard.querySelector('.guide-name');
            if (nameElement) {
                guideName = nameElement.textContent;
            }
        }
        
        openGuideMessageModal(guideId, guideName);
    };
    
    // Find all guide message buttons and update their onclick
    updateGuideMessageButtons();
    
    console.log("Guide messaging system setup complete");
}

// Find and update all guide message buttons
function updateGuideMessageButtons() {
    // Find all message buttons in guide cards
    document.querySelectorAll('.guide-card .guide-btn.message').forEach(btn => {
        // Extract guide ID from button
        const guideId = btn.closest('.guide-card').getAttribute('data-id');
        if (guideId) {
            // Update onclick handler
            btn.onclick = function() {
                window.messageGuideDirectly(guideId);
            };
        }
    });
}

// Open guide message modal
function openGuideMessageModal(guideId, guideName) {
    console.log(`Opening message modal for: ${guideName} (${guideId})`);
    
    // Get modal elements
    const modal = document.getElementById('guideMessageModal');
    if (!modal) {
        console.error("Guide message modal not found in DOM");
        alert("Error: Message modal not found. Please refresh the page and try again.");
        return;
    }
    
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
        console.log(`Sending message to guide: ${guideId}`);
        
        // Get guide information
        const guideDoc = await firebase.firestore().collection('guides').doc(guideId).get();
        
        if (!guideDoc.exists) {
            throw new Error('Guide not found');
        }
        
        const guide = guideDoc.data();
        
        // Create a new thread ID
        const threadId = `admin_to_guide_${Date.now()}`;
        
        // Get current user info
        let senderName = 'Admin';
        if (firebase.auth().currentUser) {
            const adminDoc = await firebase.firestore().collection('admins').doc(firebase.auth().currentUser.uid).get();
            if (adminDoc.exists) {
                senderName = adminDoc.data().fullName || 'Admin';
            }
        }
        
        // Add message to Firestore
        await firebase.firestore().collection('messages').add({
            threadId: threadId,
            sender: 'admin',
            senderName: senderName,
            recipient: guideId,
            recipientName: guide.fullName || `Guide ${guideId.substring(0, 5)}`,
            subject: subject,
            content: content,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            read: false,
            isLatest: true
        });
        
        console.log("Message sent successfully");
        
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

// ==============================================
// SUPPORT MESSAGES SECTION - GROUP BY CONTACT
// ==============================================

// Enhanced function to load messages grouped by contact
async function loadMessagesGroupedByContact() {
    console.log("Loading messages grouped by contact...");
    
    const messagesList = document.getElementById('supportMessagesList');
    if (!messagesList) {
        console.error("Support messages list not found");
        return;
    }
    
    // Show loading
    messagesList.innerHTML = `
        <div class="loading-container">
            <div class="spinner"></div>
            <p>Loading messages...</p>
        </div>
    `;
    
    try {
        // Get status filter if available
        const statusFilter = document.getElementById('messageStatusFilter')?.value || 'all';
        
        // Fetch ALL messages to ensure we get data
        const messagesRef = firebase.firestore().collection("messages");
        const allMessagesSnapshot = await messagesRef.get();
        
        console.log(`Found ${allMessagesSnapshot.size} total messages`);
        
        if (allMessagesSnapshot.empty) {
            messagesList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-envelope-open"></i>
                    <p>No messages found</p>
                </div>
            `;
            return;
        }
        
        // Filter support messages (to or from support)
        let supportMessages = allMessagesSnapshot.docs.filter(doc => {
            const data = doc.data();
            return data.recipient === "support" || data.sender === "support";
        });
        
        console.log(`Found ${supportMessages.length} support messages`);
        
        // Group messages by contact (not thread)
        const contactMap = new Map();
        
        supportMessages.forEach(doc => {
            const message = doc.data();
            message.id = doc.id;
            
            // Determine the contact (the person who is not support)
            const isIncoming = message.recipient === "support";
            const contactId = isIncoming ? message.sender : message.recipient;
            const contactName = isIncoming ? message.senderName : message.recipientName;
            
            // Create contact entry if it doesn't exist
            if (!contactMap.has(contactId)) {
                contactMap.set(contactId, {
                    id: contactId,
                    name: contactName || contactId,
                    messages: [],
                    lastMessage: null,
                    lastMessageTime: 0,
                    hasUnread: false
                });
            }
            
            // Add message to contact's messages
            const contact = contactMap.get(contactId);
            contact.messages.push(message);
            
            // Update last message if this one is newer
            if (!message.timestamp) return;
            
            const messageTime = message.timestamp.seconds;
            if (messageTime > contact.lastMessageTime) {
                contact.lastMessage = message;
                contact.lastMessageTime = messageTime;
            }
            
            // Check if there are unread messages
            if (isIncoming && !message.read) {
                contact.hasUnread = true;
            }
        });
        
        // Convert to array and sort by last message time
        let contacts = Array.from(contactMap.values()).sort((a, b) => {
            return b.lastMessageTime - a.lastMessageTime;
        });
        
        // Apply read/unread filter
        if (statusFilter === 'unread') {
            contacts = contacts.filter(contact => contact.hasUnread);
        } else if (statusFilter === 'read') {
            contacts = contacts.filter(contact => !contact.hasUnread);
        }
        
        console.log(`Displaying ${contacts.length} contacts with messages`);
        
        // Display contacts
        if (contacts.length === 0) {
            messagesList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-envelope-open"></i>
                    <p>No ${statusFilter === 'all' ? '' : statusFilter + ' '}messages found</p>
                </div>
            `;
            return;
        }
        
        // Build HTML for contacts list
        let html = '';
        
        for (const contact of contacts) {
            // Skip if no last message
            if (!contact.lastMessage) continue;
            
            // Create initials
            const initials = contact.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
            
            // Format time
            const timestamp = contact.lastMessage.timestamp ? 
                formatTimeAgo(new Date(contact.lastMessage.timestamp.seconds * 1000)) : 
                'Recently';
            
            // Set message preview (truncate if too long)
            const previewText = contact.lastMessage.content ? 
                (contact.lastMessage.content.length > 60 ? 
                    contact.lastMessage.content.substring(0, 60) + '...' : 
                    contact.lastMessage.content) : 
                'No content';
            
            html += `
                <div class="message-item ${contact.hasUnread ? 'unread' : ''}" 
                    data-contact-id="${contact.id}" 
                    data-contact-name="${contact.name}"
                    onclick="window.viewContactThread('${contact.id}')">
                    <div class="message-avatar">${initials}</div>
                    <div class="message-preview">
                        <div class="message-name">${contact.name}</div>
                        <div class="message-subject">${contact.lastMessage.subject || 'No subject'}</div>
                        <div class="message-preview-text">${previewText}</div>
                    </div>
                    <div class="message-meta">
                        <div class="message-time">${timestamp}</div>
                        ${contact.hasUnread ? '<div class="message-status-dot"></div>' : ''}
                    </div>
                </div>
            `;
        }
        
        messagesList.innerHTML = html;
        
    } catch (error) {
        console.error('Error loading messages:', error);
        messagesList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-circle"></i>
                <p>Error loading messages: ${error.message}</p>
            </div>
        `;
    }
}

// View contact thread (all messages with a specific contact)
async function viewContactThread(contactId) {
    console.log(`Viewing conversation with contact: ${contactId}`);
    
    // Get DOM elements
    const placeholder = document.getElementById('messageDetailPlaceholder');
    const detail = document.getElementById('messageDetailContent');
    const thread = document.getElementById('messageThread');
    const senderInitials = document.getElementById('senderInitials');
    const senderName = document.getElementById('senderName');
    const messageSubject = document.getElementById('messageSubject');
    const markAsReadBtn = document.getElementById('markAsReadBtn');
    
    if (!placeholder || !detail || !thread) {
        console.error("Message detail elements not found!");
        return;
    }
    
    // Hide placeholder, show detail with loading
    placeholder.style.display = 'none';
    detail.style.display = 'flex';
    thread.innerHTML = `
        <div class="loading-container">
            <div class="spinner"></div>
            <p>Loading conversation...</p>
        </div>
    `;
    
    // Highlight active contact
    document.querySelectorAll('.message-item').forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-contact-id') === contactId) {
            item.classList.add('active');
        }
    });
    
    try {
        // Get contact info
        const contactItem = document.querySelector(`.message-item[data-contact-id="${contactId}"]`);
        const contactName = contactItem ? contactItem.getAttribute('data-contact-name') : contactId;
        
        // Update contact info in header
        if (senderName) senderName.textContent = contactName;
        if (senderInitials) {
            const initials = contactName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
            senderInitials.textContent = initials;
        }
        
        // Get all messages for this contact (to and from)
        const messagesRef = firebase.firestore().collection("messages");
        const sentQuery = await messagesRef.where("recipient", "==", contactId).where("sender", "==", "support").get();
        const receivedQuery = await messagesRef.where("sender", "==", contactId).where("recipient", "==", "support").get();
        
        // Combine messages
        const allMessages = [...sentQuery.docs, ...receivedQuery.docs].map(doc => {
            return { id: doc.id, ...doc.data() };
        });
        
        console.log(`Found ${allMessages.length} messages with contact ${contactId}`);
        
        if (allMessages.length === 0) {
            thread.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>No messages found with this contact</p>
                </div>
            `;
            return;
        }
        
        // Sort messages by timestamp
        allMessages.sort((a, b) => {
            const timeA = a.timestamp ? a.timestamp.seconds : 0;
            const timeB = b.timestamp ? b.timestamp.seconds : 0;
            return timeA - timeB;
        });
        
        // Update subject in header (use subject from the latest message)
        if (messageSubject) {
            // Find the latest message with a subject
            const latestWithSubject = [...allMessages]
                .reverse()
                .find(msg => msg.subject && msg.subject.trim() !== '');
                
            messageSubject.textContent = latestWithSubject?.subject || 'Conversation';
        }
        
        // Show/hide mark as read button
        if (markAsReadBtn) {
            const hasUnread = allMessages.some(msg => msg.sender === contactId && !msg.read);
            markAsReadBtn.style.display = hasUnread ? 'inline-flex' : 'none';
        }
        
        // Build thread HTML
        let threadHTML = '';
        
        for (const message of allMessages) {
            const isOutgoing = message.sender === 'support';
            
            // Format timestamp
            const timestamp = message.timestamp ? 
                new Date(message.timestamp.seconds * 1000).toLocaleString() : 
                'Recently';
            
            // Get sender name
            const senderDisplayName = isOutgoing ? 'Support Team' : (message.senderName || contactName);
            
            // Get sender initials
            const bubbleInitials = isOutgoing ? 'S' : 
                senderDisplayName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
            
            threadHTML += `
                <div class="message-bubble ${isOutgoing ? 'support' : 'client'}" data-message-id="${message.id}">
                    <div class="message-bubble-avatar">${bubbleInitials}</div>
                    <div class="message-bubble-content">
                        <div class="message-bubble-header">
                            <div class="message-bubble-name">${senderDisplayName}</div>
                            <div class="message-bubble-time">${timestamp}</div>
                        </div>
                        <div class="message-bubble-text">${message.content || 'No content'}</div>
                    </div>
                </div>
            `;
            
            // Mark message as read if from contact and unread
            if (message.sender === contactId && !message.read) {
                markMessageAsRead(message.id);
            }
        }
        
        thread.innerHTML = threadHTML;
        
        // Scroll to bottom of thread
        thread.scrollTop = thread.scrollHeight;
        
        // Store contact ID for reply
        thread.setAttribute('data-contact-id', contactId);
        
    } catch (error) {
        console.error('Error viewing contact thread:', error);
        thread.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-circle"></i>
                <p>Error loading thread: ${error.message}</p>
            </div>
        `;
    }
}

// Mark message as read
async function markMessageAsRead(messageId) {
    try {
        await firebase.firestore().collection("messages").doc(messageId).update({
            read: true
        });
        
        console.log(`Marked message ${messageId} as read`);
    } catch (error) {
        console.error('Error marking message as read:', error);
    }
}

// Mark all messages from contact as read
async function markContactMessagesAsRead() {
    const thread = document.getElementById('messageThread');
    if (!thread) return;
    
    const contactId = thread.getAttribute('data-contact-id');
    if (!contactId) return;
    
    try {
        console.log(`Marking all messages from contact ${contactId} as read`);
        
        // Find all unread messages from this contact
        const messagesRef = firebase.firestore().collection("messages");
        const unreadQuery = await messagesRef
            .where("sender", "==", contactId)
            .where("recipient", "==", "support")
            .where("read", "==", false)
            .get();
        
        if (unreadQuery.empty) {
            console.log("No unread messages to mark");
            return;
        }
        
        console.log(`Marking ${unreadQuery.size} messages as read`);
        
        // Create a batch for better performance
        const batch = firebase.firestore().batch();
        
        unreadQuery.forEach(doc => {
            batch.update(doc.ref, { read: true });
        });
        
        await batch.commit();
        
        console.log("Successfully marked all messages as read");
        
        // Update UI
        const contactItem = document.querySelector(`.message-item[data-contact-id="${contactId}"]`);
        if (contactItem) {
            contactItem.classList.remove('unread');
            const statusDot = contactItem.querySelector('.message-status-dot');
            if (statusDot) statusDot.remove();
        }
        
        // Hide mark as read button
        const markAsReadBtn = document.getElementById('markAsReadBtn');
        if (markAsReadBtn) {
            markAsReadBtn.style.display = 'none';
        }
        
    } catch (error) {
        console.error('Error marking messages as read:', error);
        alert('Failed to mark messages as read: ' + error.message);
    }
}

// Handle reply submission
async function handleContactReplySubmit(event) {
    event.preventDefault();
    
    const thread = document.getElementById('messageThread');
    if (!thread) return;
    
    const contactId = thread.getAttribute('data-contact-id');
    if (!contactId) {
        alert('No contact selected!');
        return;
    }
    
    const replyContent = document.getElementById('replyContent')?.value.trim();
    
    if (!replyContent) {
        alert('Please enter a reply message!');
        return;
    }
    
    const submitBtn = event.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
    
    try {
        console.log(`Sending reply to contact: ${contactId}`);
        
        // Get contact item to get name
        const contactItem = document.querySelector(`.message-item[data-contact-id="${contactId}"]`);
        const contactName = contactItem ? 
            contactItem.getAttribute('data-contact-name') : 
            'Contact';
        
        // Generate a thread ID if needed
        const threadId = `support_${contactId}_${Date.now()}`;
        
        // Get subject from header
        const subjectElement = document.getElementById('messageSubject');
        const subject = subjectElement ? 
            subjectElement.textContent : 
            'Re: Support';
        
        // Send the message
        await firebase.firestore().collection("messages").add({
            threadId: threadId,
            sender: 'support',
            senderName: 'Support Team',
            recipient: contactId,
            recipientName: contactName,
            subject: subject,
            content: replyContent,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            read: false,
            isLatest: true
        });
        
        console.log("Reply sent successfully");
        
        // Clear the reply box
        document.getElementById('replyContent').value = '';
        
        // Refresh the thread
        viewContactThread(contactId);
        
    } catch (error) {
        console.error('Error sending reply:', error);
        alert('Failed to send reply: ' + error.message);
    } finally {
        // Re-enable the button
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Reply';
    }
}

// Helper function to format time ago
function formatTimeAgo(date) {
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) {
        return 'Just now';
    }
    
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
        return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
    }
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
        return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    }
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) {
        return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    }
    
    return date.toLocaleDateString();
}

// ==============================================
// STYLES
// ==============================================

// CSS styles for messaging
const messagingStyles = `
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

/* Message Thread Styles */
.message-thread {
    flex: 1;
    padding: 20px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 20px;
    max-height: 400px;
    min-height: 200px;
}

.message-bubble {
    display: flex;
    align-items: flex-start;
    max-width: 80%;
}

.message-bubble.client {
    align-self: flex-start;
}

.message-bubble.support {
    align-self: flex-end;
    flex-direction: row-reverse;
}

.message-bubble-avatar {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background-color: #f39c12;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    margin: 0 10px;
    font-size: 0.9rem;
}

.message-bubble.support .message-bubble-avatar {
    background-color: #3498db;
}

.message-bubble-content {
    background-color: #f5f5f5;
    padding: 15px;
    border-radius: 10px;
    position: relative;
    max-width: calc(100% - 60px);
}

.message-bubble.support .message-bubble-content {
    background-color: #e8f4fd;
}

.message-bubble-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 5px;
    font-size: 0.8rem;
}

.message-bubble-name {
    font-weight: 600;
    color: #444;
}

.message-bubble-time {
    color: #777;
}

.message-bubble-text {
    color: #333;
    line-height: 1.5;
    word-break: break-word;
}

/* Message List Styles */
.message-item {
    display: flex;
    padding: 15px;
    border-bottom: 1px solid #eee;
    cursor: pointer;
    transition: background-color 0.2s;
}

.message-item:hover {
    background-color: #f5f5f5;
}

.message-item.active {
    background-color: #fff5eb;
}

.message-item.unread {
    border-left: 3px solid #e67e22;
}

.message-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background-color: #e67e22;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    margin-right: 15px;
    flex-shrink: 0;
}

.message-preview {
    flex: 1;
    min-width: 0;
}

.message-name {
    font-weight: 600;
    color: #333;
    margin-bottom: 3px;
}

.message-subject {
    font-weight: 500;
    margin-bottom: 3px;
    color: #555;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.message-preview-text {
    color: #777;
    font-size: 0.9rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.message-meta {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    margin-left: 15px;
}

.message-time {
    font-size: 0.8rem;
    color: #777;
    margin-bottom: 5px;
}

.message-status-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background-color: #e67e22;
}
`;

// Function to add styles to document
function addMessagingStyles() {
    const styleId = 'messaging-system-styles';
    
    // Check if styles already exist
    if (!document.getElementById(styleId)) {
        const styleElement = document.createElement('style');
        styleElement.id = styleId;
        styleElement.textContent = messagingStyles;
        document.head.appendChild(styleElement);
        console.log('Messaging system styles added');
    }
}

// ==============================================
// INITIALIZATION
// ==============================================

// Initialize all messaging enhancements
document.addEventListener('DOMContentLoaded', function() {
    console.log("Initializing messaging system enhancements...");
    
    // Add styles
    addMessagingStyles();
    
    // Setup guide messaging system
    setupGuideMessagingSystem();
    
    // Override messaging functions
    window.viewContactThread = viewContactThread;
    
    // Replace loadMessages function if it exists
    if (typeof window.loadMessages === 'function') {
        console.log("Replacing loadMessages function with grouped version");
        window.loadMessages = loadMessagesGroupedByContact;
    }
    
    // Add event listener for mark as read button
    const markAsReadBtn = document.getElementById('markAsReadBtn');
    if (markAsReadBtn) {
        markAsReadBtn.removeEventListener('click', window.markThreadAsRead);
        markAsReadBtn.addEventListener('click', markContactMessagesAsRead);
    }
    
    // Set up reply form
    const supportReplyForm = document.getElementById('supportReplyForm');
    if (supportReplyForm) {
        supportReplyForm.removeEventListener('submit', window.handleReplySubmit);
        supportReplyForm.addEventListener('submit', handleContactReplySubmit);
    }
    
    // Load grouped messages
    const supportMessagesList = document.getElementById('supportMessagesList');
    if (supportMessagesList) {
        setTimeout(loadMessagesGroupedByContact, 500);
    }
    
    console.log("Messaging system enhancements initialized");
});