require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.warn('WARNING: Missing Supabase credentials in environment variables! Ensure they are set in Vercel Project Settings.');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Helper to map postgres boolean to 1/0 for frontend compatibility without rewriting script.js again
const mapSlots = (rows) => rows.map(r => ({ ...r, is_booked: r.is_booked ? 1 : 0 }));

// GET /api/slots?date=YYYY-MM-DD
app.get('/api/slots', async (req, res) => {
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: "Date parameter is required (YYYY-MM-DD)" });
    
    try {
        const { data: rows, error } = await supabase
            .from('slots')
            .select('*')
            .like('slot_time', `${date}%`)
            .order('slot_time', { ascending: true });
            
        if (error) throw error;
        
        // Dynamically create slots if this date has none yet
        if (!rows || rows.length === 0) {
            const newSlots = [];
            for (let hour = 9; hour <= 17; hour++) {
                const timeString = `${hour.toString().padStart(2, '0')}:00:00`;
                const slotTime = `${date}T${timeString}`; 
                newSlots.push({ slot_time: slotTime, is_booked: false });
            }
            
            // Insert new slots, ignoring duplicates logic
            const { error: insertError } = await supabase
                .from('slots')
                .upsert(newSlots, { onConflict: 'slot_time', ignoreDuplicates: true });
                
            if (insertError) throw insertError;
            
            // Fetch newly created slots
            const { data: newRows, error: fetchError } = await supabase
                .from('slots')
                .select('*')
                .like('slot_time', `${date}%`)
                .order('slot_time', { ascending: true });
                
            if (fetchError) throw fetchError;
            return res.json({ slots: mapSlots(newRows) });
        } else {
            return res.json({ slots: mapSlots(rows) });
        }
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Database error" });
    }
});

// POST /api/book-multiple
app.post('/api/book-multiple', async (req, res) => {
    const { slot_times } = req.body;
    
    if (!slot_times || !Array.isArray(slot_times) || slot_times.length === 0) {
        return res.status(400).json({ error: "slot_times array is required" });
    }
    
    try {
        // Step 1: Verify all requested slots are available
        const { data: existingSlots, error: fetchError } = await supabase
            .from('slots')
            .select('slot_time, is_booked')
            .in('slot_time', slot_times);
            
        if (fetchError) throw fetchError;
        
        if (!existingSlots || existingSlots.length !== slot_times.length) {
            return res.status(400).json({ error: "One or more slots are invalid." });
        }
        
        const alreadyBooked = existingSlots.some(slot => slot.is_booked);
        if (alreadyBooked) {
             return res.status(400).json({ error: "One or more slots are already booked." });
        }
        
        // Step 2: Book them securely
        const updates = slot_times.map(time => ({ slot_time: time, is_booked: true }));
        
        const { error: updateError } = await supabase
            .from('slots')
            .upsert(updates, { onConflict: 'slot_time' });
            
        if (updateError) throw updateError;
        
        return res.json({ success: true, message: `Successfully booked ${slot_times.length} slots` });
        
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Database error" });
    }
});

if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`Supabase Server listening on port ${PORT}`);
    });
}

// Export the Express API for Vercel
module.exports = app;
