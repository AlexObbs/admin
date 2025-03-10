// Import Firebase modules
import { 
    initializeApp 
} from "https://www.gstatic.com/firebasejs/10.1.0/firebase-app.js";
import { 
    getAuth, 
    onAuthStateChanged, 
    signOut 
} from "https://www.gstatic.com/firebasejs/10.1.0/firebase-auth.js";
import { 
    getFirestore, 
    collection, 
    doc, 
    getDoc, 
    getDocs,
    setDoc,
    addDoc, 
    updateDoc, 
    query, 
    where, 
    orderBy, 
    limit,
    onSnapshot,
    writeBatch,
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.1.0/firebase-firestore.js";
import {
    getStorage,
    ref,
    getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.1.0/firebase-storage.js";

// Firebase configuration - replace with your own config
const firebaseConfig = {
    apiKey: "AIzaSyAkT263nxI1qdMvgcZqS2M37-C4OwYL2I0",
    authDomain: "kenya-on-a-budget-safaris.firebaseapp.com",
    projectId: "kenya-on-a-budget-safaris",
    storageBucket: "kenya-on-a-budget-safaris.firebasestorage.app",
    messagingSenderId: "857055399633",
    appId: "1:857055399633:web:8531f564a3ffc3d0f1bff0"
  };

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Global variables
let currentUser = null;
let currentSection = 'dashboard';
let currentMessageThreadId = null;

// DOM Elements
// Navigation elements
const navItems = document.querySelectorAll('.nav-item');
const contentSections = document.querySelectorAll('.content-section');
const toggleSidebarBtn = document.querySelector('.toggle-sidebar');
const sidebar = document.querySelector('.sidebar');
const pageTitle = document.querySelector('.page-title');
const logoutBtn = document.getElementById('logoutBtn');

// Admin profile elements
const adminName = document.getElementById('adminName');
const adminAvatar = document.getElementById('adminAvatar');

// Dashboard elements
const activeBookingsCount = document.getElementById('activeBookingsCount');
const activeGuidesCount = document.getElementById('activeGuidesCount');
const unreadMessagesCount = document.getElementById('unreadMessagesCount');
const monthlyRevenue = document.getElementById('monthlyRevenue');
const recentActivityList = document.getElementById('recentActivityList');
const supportMessagesBadge = document.getElementById('supportMessagesBadge');

// Guide assignment elements
const pendingBookingsList = document.getElementById('pendingBookingsList');
const bookingSearchInput = document.getElementById('bookingSearchInput');
const bookingStatusFilter = document.getElementById('bookingStatusFilter');
const guideAssignmentModal = document.getElementById('guideAssignmentModal');
const closeAssignmentModal = document.getElementById('closeAssignmentModal');
const cancelAssignment = document.getElementById('cancelAssignment');
const confirmAssignment = document.getElementById('confirmAssignment');
const guideSelectDropdown = document.getElementById('guideSelectDropdown');
const selectedGuidePreview = document.getElementById('selectedGuidePreview');
const changeGuideButton = document.getElementById('changeGuideButton');
const assignmentBookingId = document.getElementById('assignmentBookingId');
const assignmentClientName = document.getElementById('assignmentClientName');
const assignmentPackage = document.getElementById('assignmentPackage');
const assignmentBookingDate = document.getElementById('assignmentBookingDate');
const previewGuideImage = document.getElementById('previewGuideImage');
const previewGuideName = document.getElementById('previewGuideName');
const previewGuideExperience = document.getElementById('previewGuideExperience');
const previewGuideLanguages = document.getElementById('previewGuideLanguages');

// Support messages elements
const supportMessagesList = document.getElementById('supportMessagesList');
const messageStatusFilter = document.getElementById('messageStatusFilter');
const messageSearchInput = document.getElementById('messageSearchInput');
const messageDetailPlaceholder = document.getElementById('messageDetailPlaceholder');
const messageDetailContent = document.getElementById('messageDetailContent');
const senderInitials = document.getElementById('senderInitials');
const senderName = document.getElementById('senderName');
const messageSubject = document.getElementById('messageSubject');
const messageThread = document.getElementById('messageThread');
const markAsReadBtn = document.getElementById('markAsReadBtn');
const supportReplyForm = document.getElementById('supportReplyForm');
const replyContent = document.getElementById('replyContent');

// Initialize the dashboard
document.addEventListener('DOMContentLoaded', () => {
    // Check authentication state
    onAuthStateChanged(auth, user => {
        if (user) {
            currentUser = user;
            loadAdminData();
            initializeDashboard();
        } else {
            // Redirect to login page if not logged in
            window.location.href = 'admin-login.html';
        }
    });
    
    // Set up event listeners
    setupEventListeners();
});

// Set up event listeners
function setupEventListeners() {
    // Navigation
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const sectionId = item.getAttribute('data-section');
            if (sectionId) {
                navigateTo(sectionId);
            }
        });
    });
    
    // Toggle sidebar
    if (toggleSidebarBtn) {
        toggleSidebarBtn.addEventListener('click', () => {
            sidebar.classList.toggle('active');
        });
    }
    
    // Logout button
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    // Guide assignment events
    if (bookingSearchInput) {
        bookingSearchInput.addEventListener('input', filterBookings);
    }
    
    if (bookingStatusFilter) {
        bookingStatusFilter.addEventListener('change', loadPendingBookings);
    }
    
    if (guideSelectDropdown) {
        guideSelectDropdown.addEventListener('change', function() {
            const selectedGuideId = this.value;
            if (selectedGuideId) {
                showSelectedGuidePreview(selectedGuideId);
            } else {
                if (selectedGuidePreview) {
                    selectedGuidePreview.style.display = 'none';
                }
            }
        });
    }
    
    if (changeGuideButton) {
        changeGuideButton.addEventListener('click', function() {
            if (selectedGuidePreview && guideSelectDropdown) {
                selectedGuidePreview.style.display = 'none';
                guideSelectDropdown.style.display = 'block';
                guideSelectDropdown.value = '';
            }
        });
    }
    
    // Modal events
    if (closeAssignmentModal) {
        closeAssignmentModal.addEventListener('click', closeModal);
    }
    
    if (cancelAssignment) {
        cancelAssignment.addEventListener('click', closeModal);
    }
    
    if (confirmAssignment) {
        confirmAssignment.addEventListener('click', assignGuideToBooking);
    }
    
    // Support messages events
    if (messageStatusFilter) {
        messageStatusFilter.addEventListener('change', loadSupportMessages);
    }
    
    if (messageSearchInput) {
        messageSearchInput.addEventListener('input', filterMessages);
    }
    
    if (markAsReadBtn) {
        markAsReadBtn.addEventListener('click', markThreadAsRead);
    }
    
    if (supportReplyForm) {
        supportReplyForm.addEventListener('submit', sendSupportReply);
    }
}

// Load admin data
async function loadAdminData() {
    try {
        // Get admin user data
        const userRef = doc(db, "users", currentUser.uid);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
            const userData = userDoc.data();
            
            // Update UI
            if (adminName) adminName.textContent = userData.displayName || 'Admin User';
            
            // Try to get admin avatar
            if (userData.photoURL) {
                if (adminAvatar) adminAvatar.src = userData.photoURL;
            } else {
                // Use default avatar
                if (adminAvatar) adminAvatar.src = 'profile.png';
            }
        }
    } catch (error) {
        console.error('Error loading admin data:', error);
    }
}

// Initialize dashboard data
async function initializeDashboard() {
    try {
        // Load dashboard stats
        loadDashboardStats();
        
        // Load recent activity
        loadRecentActivity();
        
        // Load unread support messages count for badge
        updateSupportMessagesBadge();
        
        // Load initial section content
        loadSectionContent(currentSection);
    } catch (error) {
        console.error('Error initializing dashboard:', error);
    }
}

// Navigate to a specific section
function navigateTo(sectionId) {
    // Update active nav item
    navItems.forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-section') === sectionId) {
            item.classList.add('active');
        }
    });
    
    // Update visible section
    contentSections.forEach(section => {
        section.classList.remove('active');
        if (section.id === `${sectionId}-section`) {
            section.classList.add('active');
        }
    });
    
    // Update page title
    if (pageTitle) {
        const activeNavItem = document.querySelector(`.nav-item[data-section="${sectionId}"]`);
        if (activeNavItem) {
            pageTitle.textContent = activeNavItem.querySelector('span').textContent;
        }
    }
    
    // Update current section
    currentSection = sectionId;
    
    // Load section content
    loadSectionContent(sectionId);
    
    // Close sidebar on mobile
    if (window.innerWidth <= 768) {
        sidebar.classList.remove('active');
    }
}

// Load section content based on section ID
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
        // Add more cases for other sections
        default:
            // Do nothing for other sections yet
            break;
    }
}

// Load dashboard stats
async function loadDashboardStats() {
    try {
        // Get active bookings count
        const bookingsRef = collection(db, "bookings");
        const activeBookingsQuery = query(
            bookingsRef,
            where("status", "==", "Confirmed")
        );
        const activeBookingsSnapshot = await getDocs(activeBookingsQuery);
        
        if (activeBookingsCount) {
            activeBookingsCount.textContent = activeBookingsSnapshot.size;
        }
        
        // Get active guides count
        const guidesRef = collection(db, "guides");
        const activeGuidesQuery = query(
            guidesRef,
            where("status", "==", "Active")
        );
        const activeGuidesSnapshot = await getDocs(activeGuidesQuery);
        
        if (activeGuidesCount) {
            activeGuidesCount.textContent = activeGuidesSnapshot.size;
        }
        
        // Get unread messages count
        const messagesRef = collection(db, "messages");
        const unreadMessagesQuery = query(
            messagesRef,
            where("recipient", "==", "support"),
            where("read", "==", false)
        );
        const unreadMessagesSnapshot = await getDocs(unreadMessagesQuery);
        
        if (unreadMessagesCount) {
            unreadMessagesCount.textContent = unreadMessagesSnapshot.size;
        }
        
        // Calculate monthly revenue
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        
        const revenueQuery = query(
            bookingsRef,
            where("bookingDate", ">=", firstDayOfMonth),
            where("paymentStatus", "==", "Paid")
        );
        const revenueSnapshot = await getDocs(revenueQuery);
        
        let totalRevenue = 0;
        revenueSnapshot.forEach(doc => {
            const booking = doc.data();
            if (booking.packageCost) {
                totalRevenue += booking.packageCost;
            }
        });
        
        if (monthlyRevenue) {
            monthlyRevenue.textContent = `$${totalRevenue.toLocaleString()}`;
        }
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
    }
}

// Load recent activity
async function loadRecentActivity() {
    try {
        if (!recentActivityList) return;
        
        // Clear current list
        recentActivityList.innerHTML = '<div class="loading-row"><div class="spinner"></div><span>Loading activity...</span></div>';
        
        // We'll combine activity from different collections
        let activities = [];
        
        // Get recent bookings
        const bookingsRef = collection(db, "bookings");
        const recentBookingsQuery = query(
            bookingsRef,
            orderBy("createdAt", "desc"),
            limit(5)
        );
        const bookingsSnapshot = await getDocs(recentBookingsQuery);
        
        bookingsSnapshot.forEach(doc => {
            const booking = doc.data();
            activities.push({
                type: 'booking',
                title: 'New Booking',
                description: `${booking.clientName || 'A client'} booked the ${booking.packageName || 'Safari'} Package`,
                timestamp: booking.createdAt,
                iconClass: 'bookings-activity'
            });
        });
        
        // Get recent guide assignments
        const toursRef = collection(db, "tours");
        const recentToursQuery = query(
            toursRef,
            orderBy("createdAt", "desc"),
            limit(5)
        );
        const toursSnapshot = await getDocs(recentToursQuery);
        
        toursSnapshot.forEach(doc => {
            const tour = doc.data();
            activities.push({
                type: 'guide',
                title: 'Guide Assigned',
                description: `${tour.guideName || 'A guide'} was assigned to ${tour.clientName || 'a client'}'s safari`,
                timestamp: tour.createdAt,
                iconClass: 'guides-activity'
            });
        });
        
        // Get recent support messages
        const messagesRef = collection(db, "messages");
        const recentMessagesQuery = query(
            messagesRef,
            where("recipient", "==", "support"),
            orderBy("timestamp", "desc"),
            limit(5)
        );
        const messagesSnapshot = await getDocs(recentMessagesQuery);
        
        messagesSnapshot.forEach(doc => {
            const message = doc.data();
            activities.push({
                type: 'message',
                title: 'Support Message',
                description: `New support request from ${message.senderName || 'a client'}`,
                timestamp: message.timestamp,
                iconClass: 'messages-activity'
            });
        });
        
        // Sort activities by timestamp (newest first)
        activities.sort((a, b) => {
            const timeA = a.timestamp ? a.timestamp.seconds : 0;
            const timeB = b.timestamp ? b.timestamp.seconds : 0;
            return timeB - timeA;
        });
        
        // Take only the 5 most recent activities
        activities = activities.slice(0, 5);
        
        // Build activity HTML
        if (activities.length === 0) {
            recentActivityList.innerHTML = '<div class="empty-state"><i class="fas fa-info-circle"></i><p>No recent activity found</p></div>';
            return;
        }
        
        let activityHTML = '';
        activities.forEach(activity => {
            const time = activity.timestamp 
                ? formatTimeAgo(new Date(activity.timestamp.seconds * 1000))
                : 'Recently';
            
            activityHTML += `
                <div class="activity-item">
                    <div class="activity-icon ${activity.iconClass}">
                        <i class="fas fa-${activity.type === 'booking' ? 'calendar-check' : activity.type === 'guide' ? 'user-plus' : 'envelope'}"></i>
                    </div>
                    <div class="activity-content">
                        <p class="activity-title">${activity.title}</p>
                        <p class="activity-description">${activity.description}</p>
                        <p class="activity-time">${time}</p>
                    </div>
                </div>
            `;
        });
        
        recentActivityList.innerHTML = activityHTML;
    } catch (error) {
        console.error('Error loading recent activity:', error);
        if (recentActivityList) {
            recentActivityList.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-circle"></i><p>Error loading activity</p></div>';
        }
    }
}

// Update support messages badge
async function updateSupportMessagesBadge() {
    try {
        if (!supportMessagesBadge) return;
        
        // Get unread support messages count
        const messagesRef = collection(db, "messages");
        const unreadQuery = query(
            messagesRef,
            where("recipient", "==", "support"),
            where("read", "==", false)
        );
        
        // Use onSnapshot to keep the badge updated in real-time
        onSnapshot(unreadQuery, (snapshot) => {
            const count = snapshot.size;
            supportMessagesBadge.textContent = count;
            
            if (count > 0) {
                supportMessagesBadge.style.display = 'flex';
            } else {
                supportMessagesBadge.style.display = 'none';
            }
        });
    } catch (error) {
        console.error('Error updating support messages badge:', error);
    }
}

// ===== GUIDE ASSIGNMENT FUNCTIONS =====

// Load pending bookings
async function loadPendingBookings() {
    try {
        if (!pendingBookingsList) return;
        
        const statusFilter = bookingStatusFilter ? bookingStatusFilter.value : 'Pending';
        
        // Show loading
        pendingBookingsList.innerHTML = `
            <tr>
                <td colspan="6" class="loading-row">
                    <div class="spinner"></div>
                    <span>Loading bookings...</span>
                </td>
            </tr>
        `;
        
        // Create query based on filter
        const bookingsRef = collection(db, "bookings");
        let bookingsQuery;
        
        if (statusFilter === 'all') {
            bookingsQuery = query(
                bookingsRef,
                orderBy("createdAt", "desc")
            );
        } else {
            bookingsQuery = query(
                bookingsRef,
                where("guideStatus", "==", statusFilter),
                orderBy("createdAt", "desc")
            );
        }
        
        const bookingsSnapshot = await getDocs(bookingsQuery);
        
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
        bookingsSnapshot.forEach(doc => {
            const booking = doc.data();
            booking.id = doc.id;
            
            const bookingDate = booking.bookingDate ? 
                new Date(booking.bookingDate.seconds * 1000).toLocaleDateString() : 
                'Not available';
            
            const statusClass = booking.guideStatus === 'Assigned' ? 
                'status-assigned' : 'status-pending';
            
            html += `
                <tr>
                    <td>${booking.id.substring(0, 8)}...</td>
                    <td>${booking.clientName || 'Unknown'}</td>
                    <td>${booking.packageName || booking.packageType || 'Unknown'}</td>
                    <td>${bookingDate}</td>
                    <td><span class="status-badge ${statusClass}">${booking.guideStatus || 'Pending'}</span></td>
                    <td>
                        <button class="action-btn view" onclick="window.viewBookingDetails('${booking.id}')">
                            <i class="fas fa-eye"></i> View
                        </button>
                        ${booking.guideStatus !== 'Assigned' ? 
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

// Filter bookings based on search input
function filterBookings() {
    if (!bookingSearchInput || !pendingBookingsList) return;
    
    const searchText = bookingSearchInput.value.toLowerCase();
    const rows = pendingBookingsList.querySelectorAll('tr');
    
    rows.forEach(row => {
        if (row.querySelector('.loading-row')) return;
        
        const bookingId = row.cells[0].textContent.toLowerCase();
        const clientName = row.cells[1].textContent.toLowerCase();
        const packageName = row.cells[2].textContent.toLowerCase();
        
        if (
            bookingId.includes(searchText) ||
            clientName.includes(searchText) ||
            packageName.includes(searchText)
        ) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

// Load available guides
async function loadAvailableGuides() {
    try {
        if (!guideSelectDropdown) return;
        
        // Clear dropdown
        guideSelectDropdown.innerHTML = '<option value="" selected disabled>Select a guide...</option>';
        
        const guidesRef = collection(db, "guides");
        const guidesSnapshot = await getDocs(guidesRef);
        
        if (guidesSnapshot.empty) {
            guideSelectDropdown.innerHTML += '<option value="" disabled>No guides available</option>';
            return;
        }
        
        // Populate dropdown
        guidesSnapshot.forEach(doc => {
            const guide = doc.data();
            guide.id = doc.id;
            
            guideSelectDropdown.innerHTML += `
                <option value="${guide.id}">${guide.fullName || 'Guide ' + guide.id.substring(0, 5)}</option>
            `;
        });
        
    } catch (error) {
        console.error('Error loading available guides:', error);
        if (guideSelectDropdown) {
            guideSelectDropdown.innerHTML += '<option value="" disabled>Error loading guides</option>';
        }
    }
}

// Open assignment modal
async function openAssignmentModal(bookingId) {
    try {
        if (!guideAssignmentModal) return;
        
        // Reset guide selection
        if (guideSelectDropdown) {
            guideSelectDropdown.value = '';
            guideSelectDropdown.style.display = 'block';
        }
        
        if (selectedGuidePreview) {
            selectedGuidePreview.style.display = 'none';
        }
        
        // Get booking details
        const bookingRef = doc(db, "bookings", bookingId);
        const bookingDoc = await getDoc(bookingRef);
        
        if (!bookingDoc.exists()) {
            alert('Booking not found');
            return;
        }
        
        const booking = bookingDoc.data();
        
        // Update booking details in modal
        if (assignmentBookingId) assignmentBookingId.textContent = bookingId.substring(0, 8) + '...';
        if (assignmentClientName) assignmentClientName.textContent = booking.clientName || 'Unknown';
        if (assignmentPackage) assignmentPackage.textContent = booking.packageName || booking.packageType || 'Unknown';
        
        const bookingDate = booking.bookingDate ? 
            new Date(booking.bookingDate.seconds * 1000).toLocaleDateString() : 
            'Not available';
        if (assignmentBookingDate) assignmentBookingDate.textContent = bookingDate;
        
        // Store booking ID for assignment
        window.currentBookingId = bookingId;
        
        // Show modal
        guideAssignmentModal.classList.add('active');
        
    } catch (error) {
        console.error('Error opening assignment modal:', error);
        alert('Error loading booking details: ' + error.message);
    }
}

// Show selected guide preview
async function showSelectedGuidePreview(guideId) {
    try {
        if (!selectedGuidePreview || !guideSelectDropdown) return;
        
        // Get guide details
        const guideRef = doc(db, "guides", guideId);
        const guideDoc = await getDoc(guideRef);
        
        if (!guideDoc.exists()) {
            alert('Guide not found');
            return;
        }
        
        const guide = guideDoc.data();
        
        // Update preview
        if (previewGuideName) previewGuideName.textContent = guide.fullName || 'Guide ' + guideId.substring(0, 5);
        if (previewGuideExperience) previewGuideExperience.textContent = `Experience: ${guide.experienceYears || 0} years`;
        
        if (previewGuideLanguages) {
            if (guide.languages && Array.isArray(guide.languages)) {
                previewGuideLanguages.textContent = 'Languages: ' + guide.languages.join(', ');
            } else {
                previewGuideLanguages.textContent = 'Languages: English, Swahili';
            }
        }
        
        // Load guide image if available
        if (previewGuideImage) {
            if (guide.profileImageUrl) {
                previewGuideImage.src = guide.profileImageUrl;
            } else {
                previewGuideImage.src = 'profile.png'; // Default image
            }
        }
        
        // Hide dropdown and show preview
        guideSelectDropdown.style.display = 'none';
        selectedGuidePreview.style.display = 'block';
    } catch (error) {
        console.error('Error showing guide preview:', error);
        alert('Error loading guide details: ' + error.message);
    }
}

// Assign guide to booking
async function assignGuideToBooking() {
    try {
        if (!guideSelectDropdown || !confirmAssignment) return;
        
        const guideId = guideSelectDropdown.value;
        const bookingId = window.currentBookingId;
        
        if (!guideId) {
            alert('Please select a guide');
            return;
        }
        
        if (!bookingId) {
            alert('Booking ID not found');
            return;
        }
        
        // Disable button and show loading
        confirmAssignment.disabled = true;
        confirmAssignment.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Assigning...';
        
        // Get booking details
        const bookingRef = doc(db, "bookings", bookingId);
        const bookingDoc = await getDoc(bookingRef);
        
        if (!bookingDoc.exists()) {
            alert('Booking not found');
            confirmAssignment.disabled = false;
            confirmAssignment.innerHTML = 'Assign Guide';
            return;
        }
        
        const booking = bookingDoc.data();
        
        // Get guide details
        const guideRef = doc(db, "guides", guideId);
        const guideDoc = await getDoc(guideRef);
        
        if (!guideDoc.exists()) {
            alert('Guide not found');
            confirmAssignment.disabled = false;
            confirmAssignment.innerHTML = 'Assign Guide';
            return;
        }
        
        const guide = guideDoc.data();
        
        // Create a tour record linking the guide to the client
        const tourData = {
            bookingId: bookingId,
            packageType: booking.packageType,
            clientId: booking.clientId,
            clientName: booking.clientName,
            guideId: guideId,
            guideName: guide.fullName,
            status: "Confirmed",
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        };
        
        const tourRef = await addDoc(collection(db, "tours"), tourData);
        
        // Update the booking with the guide information
        await updateDoc(bookingRef, {
            guideId: guideId,
            guideName: guide.fullName,
            guideImageUrl: guide.profileImageUrl || null,
            guideExperience: `${guide.experienceYears || 0} years`,
            guideLanguages: guide.languages || ["English"],
            guideStatus: "Assigned",
            updatedAt: serverTimestamp()
        });
        
        // Send welcome message from guide to client
        if (booking.clientId) {
            await addDoc(collection(db, "messages"), {
                threadId: "welcome_tour_" + Date.now(),
                sender: guideId,
                senderName: guide.fullName,
                recipient: booking.clientId,
                recipientName: booking.clientName,
                subject: "Welcome to Your KenyaOnABudget Safari!",
                content: `Hello ${booking.clientName},\n\nMy name is ${guide.fullName} and I'll be your guide for your upcoming safari. I'm excited to show you the beauty of Kenya and make your trip unforgettable!\n\nFeel free to ask me any questions about your trip, and I'll be happy to assist you.\n\nBest regards,\n${guide.fullName}`,
                timestamp: serverTimestamp(),
                read: false,
                isLatest: true
            });
        }
        
        // Close modal
        closeModal();
        
        // Reload bookings
        loadPendingBookings();
        
        // Show success message
        alert('Guide assigned successfully!');
        
    } catch (error) {
        console.error('Error assigning guide:', error);
        alert('Error assigning guide: ' + error.message);
    } finally {
        // Re-enable button
        if (confirmAssignment) {
            confirmAssignment.disabled = false;
            confirmAssignment.innerHTML = 'Assign Guide';
        }
    }
}

// View booking details
function viewBookingDetails(bookingId) {
    // Implement booking details view
    alert('View booking details for: ' + bookingId);
    // You can implement a full booking details modal or page here
}

// Close modal
function closeModal() {
    if (guideAssignmentModal) {
        guideAssignmentModal.classList.remove('active');
    }
    window.currentBookingId = null;
}

// ===== SUPPORT MESSAGES FUNCTIONS =====

// Load support messages
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
        
        if (statusFilter === 'all') {
            messagesQuery = query(
                messagesRef,
                where("recipient", "==", "support"),
                where("isLatest", "==", true),
                orderBy("timestamp", "desc")
            );
        } else if (statusFilter === 'unread') {
            messagesQuery = query(
                messagesRef,
                where("recipient", "==", "support"),
                where("isLatest", "==", true),
                where("read", "==", false),
                orderBy("timestamp", "desc")
            );
        } else if (statusFilter === 'read') {
            messagesQuery = query(
                messagesRef,
                where("recipient", "==", "support"),
                where("isLatest", "==", true),
                where("read", "==", true),
                orderBy("timestamp", "desc")
            );
        }
        
        const messagesSnapshot = await getDocs(messagesQuery);
        
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
            const previewText = message.content.length > 60
                ? message.content.substring(0, 60) + '...'
                : message.content;
            
            html += `
                <div class="message-item ${message.read ? '' : 'unread'}" data-thread-id="${message.threadId}" data-id="${message.id}">
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
        
        // Add click event to message items
        const messageItems = supportMessagesList.querySelectorAll('.message-item');
        messageItems.forEach(item => {
            item.addEventListener('click', function() {
                const threadId = this.getAttribute('data-thread-id');
                const messageId = this.getAttribute('data-id');
                loadMessageThread(threadId, messageId);
                
                // Update active state
                messageItems.forEach(i => i.classList.remove('active'));
                this.classList.add('active');
            });
        });
        
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

// Filter messages based on search input
function filterMessages() {
    if (!messageSearchInput || !supportMessagesList) return;
    
    const searchText = messageSearchInput.value.toLowerCase();
    const messageItems = supportMessagesList.querySelectorAll('.message-item');
    
    messageItems.forEach(item => {
        const senderName = item.querySelector('.message-name').textContent.toLowerCase();
        const subject = item.querySelector('.message-subject').textContent.toLowerCase();
        const preview = item.querySelector('.message-preview-text').textContent.toLowerCase();
        
        if (
            senderName.includes(searchText) ||
            subject.includes(searchText) ||
            preview.includes(searchText)
        ) {
            item.style.display = '';
        } else {
            item.style.display = 'none';
        }
    });
}

// Load message thread
async function loadMessageThread(threadId, messageId) {
    try {
        if (!messageDetailContent || !messageDetailPlaceholder || !messageThread) return;
        
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
        
        const threadSnapshot = await getDocs(threadQuery);
        
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
                        <div class="message-bubble-text">${message.content}</div>
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

// Mark message as read
async function markMessageAsRead(messageId) {
    try {
        await updateDoc(doc(db, "messages", messageId), {
            read: true
        });
        
        // Update UI
        const messageItem = document.querySelector(`.message-item[data-id="${messageId}"]`);
        if (messageItem) {
            messageItem.classList.remove('unread');
            messageItem.querySelector('.message-status-dot')?.remove();
        }
        
        if (markAsReadBtn) {
            markAsReadBtn.style.display = 'none';
        }
        
        // Update unread count
        updateSupportMessagesBadge();
        
    } catch (error) {
        console.error('Error marking message as read:', error);
    }
}

// Mark entire thread as read
async function markThreadAsRead() {
    try {
        if (!currentMessageThreadId) return;
        
        // Get all unread messages in the thread
        const messagesRef = collection(db, "messages");
        const unreadQuery = query(
            messagesRef,
            where("threadId", "==", currentMessageThreadId),
            where("read", "==", false)
        );
        
        const unreadSnapshot = await getDocs(unreadQuery);
        
        if (unreadSnapshot.empty) {
            if (markAsReadBtn) markAsReadBtn.style.display = 'none';
            return;
        }
        
        // Create batch update
        const batch = writeBatch(db);
        unreadSnapshot.forEach(doc => {
            batch.update(doc.ref, { read: true });
        });
        
        await batch.commit();
        
        // Update UI
        const messageItems = document.querySelectorAll(`.message-item[data-thread-id="${currentMessageThreadId}"]`);
        messageItems.forEach(item => {
            item.classList.remove('unread');
            item.querySelector('.message-status-dot')?.remove();
        });
        
        if (markAsReadBtn) {
            markAsReadBtn.style.display = 'none';
        }
        
        // Update unread count
        updateSupportMessagesBadge();
        
    } catch (error) {
        console.error('Error marking thread as read:', error);
    }
}

// Send support reply
async function sendSupportReply(event) {
    try {
        event.preventDefault();
        
        if (!currentMessageThreadId || !replyContent) return;
        
        const content = replyContent.value.trim();
        
        if (!content) {
            alert('Please enter a message');
            return;
        }
        
        // Get original thread info
        const messagesRef = collection(db, "messages");
        const threadQuery = query(
            messagesRef,
            where("threadId", "==", currentMessageThreadId),
            limit(1)
        );
        
        const threadSnapshot = await getDocs(threadQuery);
        
        if (threadSnapshot.empty) {
            alert('Thread not found');
            return;
        }
        
        const originalMessage = threadSnapshot.docs[0].data();
        
        // Update all messages in this thread to not be the latest
        const allThreadQuery = query(messagesRef, where("threadId", "==", currentMessageThreadId));
        const allThreadSnapshot = await getDocs(allThreadQuery);
        
        const batch = writeBatch(db);
        allThreadSnapshot.forEach(doc => {
            batch.update(doc.ref, { isLatest: false });
        });
        await batch.commit();
        
        // Create new reply message
        await addDoc(messagesRef, {
            threadId: currentMessageThreadId,
            sender: 'support',
            senderName: 'Support Team',
            recipient: originalMessage.sender,
            recipientName: originalMessage.senderName,
            subject: originalMessage.subject,
            content: content,
            timestamp: serverTimestamp(),
            read: false,
            isLatest: true
        });
        
        // Clear reply form
        if (supportReplyForm) supportReplyForm.reset();
        
        // Reload thread
        loadMessageThread(currentMessageThreadId);
        
    } catch (error) {
        console.error('Error sending reply:', error);
        alert('Error sending reply: ' + error.message);
    }
}

// ===== UTILITY FUNCTIONS =====

// Format time ago
function formatTimeAgo(date) {
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) {
        return 'Just now';
    }
    
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
        return `${diffInMinutes} min${diffInMinutes > 1 ? 's' : ''} ago`;
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

// Handle logout
async function handleLogout() {
    try {
        await signOut(auth);
        window.location.href = 'admin-login.html';
    } catch (error) {
        console.error('Error logging out:', error);
        alert('Error logging out: ' + error.message);
    }
}

// Make functions available globally for event handlers
window.navigateTo = navigateTo;
window.openAssignmentModal = openAssignmentModal;
window.viewBookingDetails = viewBookingDetails;
