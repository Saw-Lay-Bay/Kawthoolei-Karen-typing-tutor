// api/feedback.js - Vercel Serverless Function
export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    // Handle preflight request
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    // Get environment variables
    const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
    const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
    const AIRTABLE_TABLE_NAME = 'Feedback'; // Your table name

    // Check if environment variables are set
    if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
        return res.status(500).json({ 
            message: 'Server configuration error: Missing Airtable credentials' 
        });
    }

    try {
        console.log('Received feedback data:', req.body);

        // Save to Airtable
        const airtableResponse = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                records: [{
                    fields: {
                        'Name': req.body.name || 'Anonymous',
                        'Email': req.body.email || '',
                        'Rating': req.body.rating || 5,
                        'Category': req.body.category || 'general',
                        'Message': req.body.feedback || '',
                        'Date': req.body.timestamp ? req.body.timestamp.split('T')[0] : new Date().toISOString().split('T')[0],
                        'Status': 'New'
                    }
                }]
            }),
        });

        const airtableResult = await airtableResponse.json();

        if (airtableResponse.ok) {
            console.log('Successfully saved to Airtable:', airtableResult);
            res.status(200).json({ 
                message: 'Feedback submitted successfully',
                id: airtableResult.records[0].id
            });
        } else {
            console.error('Airtable API error:', airtableResult);
            res.status(400).json({ 
                message: 'Failed to save feedback',
                error: airtableResult
            });
        }
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ 
            message: 'Internal server error',
            error: error.message
        });
    }
}
