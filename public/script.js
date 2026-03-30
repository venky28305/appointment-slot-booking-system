document.addEventListener('DOMContentLoaded', () => {
    const dateInput = document.getElementById('date-input');
    const slotsContainer = document.getElementById('slots-container');
    const selectedDateDisplay = document.getElementById('selected-date-display');
    const actionFooter = document.getElementById('action-footer');
    const bookMultipleBtn = document.getElementById('book-multiple-btn');
    const toast = document.getElementById('toast');

    let selectedSlots = new Set();
    let currentSlotsData = [];

    // Set minimum date to today
    const today = new Date().toISOString().split('T')[0];
    dateInput.min = today;
    dateInput.value = today;
    
    // Fetch on initial load
    fetchSlots(today);

    dateInput.addEventListener('change', (e) => {
        selectedSlots.clear(); // Clear selections on date change
        updateFooterState();
        if (e.target.value) {
            fetchSlots(e.target.value);
        } else {
            slotsContainer.innerHTML = '<div class="loading-state">Please select a date to view available slots.</div>';
            selectedDateDisplay.textContent = "Select a date...";
        }
    });

    async function fetchSlots(date) {
        slotsContainer.innerHTML = '<div class="loading-state">Loading slots...</div>';
        
        // Update display header date
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        selectedDateDisplay.textContent = new Date(date).toLocaleDateString(undefined, options);

        try {
            const response = await fetch(`/api/slots?date=${date}`);
            const data = await response.json();
            
            if (data.slots && data.slots.length > 0) {
                currentSlotsData = data.slots;
                renderSlots(data.slots);
            } else {
                slotsContainer.innerHTML = '<div class="loading-state">No slots available for this date.</div>';
            }
        } catch (error) {
            slotsContainer.innerHTML = '<div class="loading-state" style="color:var(--error)">Error loading slots.</div>';
            console.error('Error fetching slots:', error);
        }
    }

    function renderSlots(slots) {
        const grid = document.createElement('div');
        grid.className = 'slots-grid';

        slots.forEach(slot => {
            const btn = document.createElement('button');
            btn.className = 'slot-btn';
            
            // Format time
            const dateObj = new Date(slot.slot_time);
            const timeString = dateObj.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); // e.g., 9:00 AM
            
            const timeSpan = document.createElement('span');
            timeSpan.className = 'slot-time';
            timeSpan.textContent = timeString;

            const statusSpan = document.createElement('span');
            statusSpan.className = 'slot-status';

            if (slot.is_booked === 1) {
                btn.classList.add('booked');
                btn.disabled = true;
                statusSpan.textContent = "BOOKED";
            } else {
                statusSpan.textContent = "AVAILABLE";
                
                // If it was previously selected in the set, add class
                if (selectedSlots.has(slot.slot_time)) {
                    btn.classList.add('selected');
                }

                btn.addEventListener('click', () => toggleSlotSelection(slot.slot_time, btn));
            }
            
            btn.appendChild(timeSpan);
            btn.appendChild(statusSpan);
            grid.appendChild(btn);
        });

        slotsContainer.innerHTML = '';
        slotsContainer.appendChild(grid);
    }

    function toggleSlotSelection(slotTime, btnElement) {
        if (selectedSlots.has(slotTime)) {
            selectedSlots.delete(slotTime);
            btnElement.classList.remove('selected');
        } else {
            selectedSlots.add(slotTime);
            btnElement.classList.add('selected');
        }
        updateFooterState();
    }

    function updateFooterState() {
        if (selectedSlots.size > 0) {
            actionFooter.classList.remove('hidden');
            bookMultipleBtn.textContent = `Book Selected (${selectedSlots.size})`;
        } else {
            actionFooter.classList.add('hidden');
        }
    }

    bookMultipleBtn.addEventListener('click', async () => {
        if (selectedSlots.size === 0) return;
        
        bookMultipleBtn.disabled = true;
        bookMultipleBtn.textContent = "Booking...";
        
        try {
            const payload = { slot_times: Array.from(selectedSlots) };
            
            // Let's assume the API handles an array of slot_times
            const response = await fetch('/api/book-multiple', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            
            const result = await response.json();
            
            if (response.ok) {
                showToast(`Successfully booked ${selectedSlots.size} slots!`, 'success');
                selectedSlots.clear();
                updateFooterState();
                fetchSlots(dateInput.value); // Refresh
            } else {
                showToast(result.error || 'Failed to book some slots', 'error');
                // Refresh slots in case some were booked by someone else
                fetchSlots(dateInput.value);
            }
        } catch (error) {
            console.error('Booking error:', error);
            showToast('Network error while booking', 'error');
        } finally {
            bookMultipleBtn.disabled = false;
        }
    });

    function showToast(message, type) {
        toast.textContent = message;
        toast.className = `toast ${type}`;
        
        setTimeout(() => {
            toast.classList.add('hidden');
        }, 3000);
    }
});
