// api/feedback.js
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  // Airtable API configuration
  const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
  const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
  const AIRTABLE_TABLE_NAME = 'Feedback'; // Your table name
  
  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
    console.error('Missing Airtable configuration');
    return res.status(500).json({ 
      error: 'Server configuration error: Missing Airtable credentials'
    });
  }
  
  // Handle GET request - Fetch reviews from Airtable
  if (req.method === 'GET') {
    try {
      console.log('Fetching reviews from Airtable...');
      
      // Fetch records from Airtable, sorted by creation time (most recent first)
      const airtableResponse = await fetch(
        `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE_NAME)}?sort%5B0%5D%5Bfield%5D=Timestamp&sort%5B0%5D%5Bdirection%5D=desc&maxRecords=100`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      const responseText = await airtableResponse.text();
      console.log('Airtable GET response status:', airtableResponse.status);
      
      if (!airtableResponse.ok) {
        console.error('Airtable GET error:', responseText);
        return res.status(422).json({ 
          error: 'Failed to fetch from Airtable',
          details: responseText
        });
      }
      
      const result = JSON.parse(responseText);
      console.log(`Successfully fetched ${result.records?.length || 0} reviews from Airtable`);
      
      // Transform Airtable records to match frontend format
      const reviews = result.records?.map(record => ({
        name: record.fields.Name || 'Anonymous',
        email: record.fields.Email || '',
        rating: record.fields.Rating || 5,
        category: record.fields.Category || 'general',
        feedback: record.fields.Feedback || '',
        timestamp: record.fields.Timestamp || record.createdTime,
        airtableId: record.id
      })) || [];
      
      res.status(200).json({ 
        success: true, 
        reviews: reviews,
        total: reviews.length
      });
      
    } catch (error) {
      console.error('GET API error:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        details: error.message
      });
    }
    return;
  }
  
  // Handle POST request - Save new review to Airtable
  if (req.method === 'POST') {
    try {
      const { name, email, rating, category, feedback, timestamp } = req.body;
      
      // Validate required fields
      if (!name || !rating || !category || !feedback) {
        return res.status(400).json({ 
          error: 'Missing required fields: name, rating, category, and feedback are required' 
        });
      }
      
      // Validate rating is a number between 1-5
      const ratingNum = parseInt(rating);
      if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
        return res.status(400).json({ 
          error: 'Rating must be a number between 1 and 5' 
        });
      }
      
      // Create current timestamp
      const currentTimestamp = new Date().toISOString();
      
      // Prepare data for Airtable - using exact field names from your table
      const airtableData = {
        records: [
          {
            fields: {
              "Name": name.trim(),                    
              "Email": email ? email.trim() : "",            
              "Rating": ratingNum,      
              "Category": category,            
              "Feedback": feedback.trim(),            
              "Timestamp": timestamp || currentTimestamp,
              "Submitted At": currentTimestamp
            }
          }
        ]
      };
      
      console.log('Sending to Airtable:', JSON.stringify(airtableData, null, 2));
      
      // Send to Airtable
      const airtableResponse = await fetch(
        `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE_NAME)}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(airtableData)
        }
      );
      
      const responseText = await airtableResponse.text();
      console.log('Airtable response status:', airtableResponse.status);
      console.log('Airtable response:', responseText);
      
      if (!airtableResponse.ok) {
        let errorDetails;
        try {
          errorDetails = JSON.parse(responseText);
        } catch (e) {
          errorDetails = responseText;
        }
        
        console.error('Airtable API error:', errorDetails);
        return res.status(422).json({ 
          error: 'Failed to save to Airtable',
          details: errorDetails
        });
      }
      
      const result = JSON.parse(responseText);
      console.log('Successfully saved to Airtable:', result);
      
      res.status(200).json({ 
        success: true, 
        message: 'Feedback submitted successfully',
        data: result 
      });
      
    } catch (error) {
      console.error('POST API error:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        details: error.message
      });
    }
    return;
  }
  
  // Method not allowed
  return res.status(405).json({ error: 'Method not allowed' });
}
