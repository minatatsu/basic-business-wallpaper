import { Hono } from 'npm:hono';
import { cors } from 'npm:hono/cors';
import { logger } from 'npm:hono/logger';

const app = new Hono();

app.use('*', cors());
app.use('*', logger(console.log));

// Figma API proxy endpoint
app.get('/make-server-b35d308f/figma/images', async (c) => {
  try {
    const fileKey = c.req.query('fileKey');
    const nodeIds = c.req.query('nodeIds');
    const format = c.req.query('format'); // 'base64' or undefined

    if (!fileKey || !nodeIds) {
      return c.json({ error: 'Missing fileKey or nodeIds' }, 400);
    }

    const figmaToken = Deno.env.get('FIGMA_ACCESS_TOKEN');
    if (!figmaToken) {
      console.error('FIGMA_ACCESS_TOKEN not set');
      return c.json({ error: 'Figma token not configured' }, 500);
    }

    console.log(`Requesting Figma images for ${nodeIds.split(',').length} nodes (format: ${format || 'url'})...`);

    // Call Figma API to get image URLs with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

    const url = `https://api.figma.com/v1/images/${fileKey}?ids=${nodeIds}&format=png&scale=2`;

    try {
      const response = await fetch(url, {
        headers: {
          'X-Figma-Token': figmaToken,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Figma API error:', response.status, errorText);
        return c.json({ error: 'Figma API error', details: errorText }, response.status);
      }

      const data = await response.json();
      console.log(`✓ Successfully fetched ${Object.keys(data.images || {}).length} image URLs`);

      // base64変換が必要な場合
      if (format === 'base64' && data.images) {
        const base64Images: Record<string, string> = {};

        for (const [nodeId, imageUrl] of Object.entries(data.images)) {
          if (typeof imageUrl === 'string') {
            try {
              console.log(`Converting image to base64: ${nodeId}`);
              const imgResponse = await fetch(imageUrl);

              if (!imgResponse.ok) {
                console.error(`Failed to fetch image for ${nodeId}:`, imgResponse.status);
                continue;
              }

              const arrayBuffer = await imgResponse.arrayBuffer();
              const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
              base64Images[nodeId] = `data:image/png;base64,${base64}`;
              console.log(`✓ Converted ${nodeId} to base64 (${base64.length} chars)`);
            } catch (err) {
              console.error(`Error converting ${nodeId} to base64:`, err);
            }
          }
        }

        return c.json({ images: base64Images });
      }

      return c.json(data);
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        console.error('Figma API request timed out');
        return c.json({ error: 'Request to Figma API timed out' }, 504);
      }
      throw fetchError;
    }
  } catch (error) {
    console.error('Error in Figma images proxy:', error);
    return c.json({ error: 'Internal server error', message: error.message }, 500);
  }
});

// Get Figma file structure (for debugging)
app.get('/make-server-b35d308f/figma/file', async (c) => {
  try {
    const fileKey = c.req.query('fileKey');
    
    if (!fileKey) {
      return c.json({ error: 'Missing fileKey' }, 400);
    }

    const figmaToken = Deno.env.get('FIGMA_ACCESS_TOKEN');
    if (!figmaToken) {
      return c.json({ error: 'Figma token not configured' }, 500);
    }

    const url = `https://api.figma.com/v1/files/${fileKey}`;
    const response = await fetch(url, {
      headers: {
        'X-Figma-Token': figmaToken,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Figma API error:', response.status, errorText);
      return c.json({ error: 'Figma API error', details: errorText }, response.status);
    }

    const data = await response.json();
    return c.json(data);
  } catch (error) {
    console.error('Error in Figma proxy:', error);
    return c.json({ error: 'Internal server error', message: error.message }, 500);
  }
});

// Get specific nodes
app.get('/make-server-b35d308f/figma/nodes', async (c) => {
  try {
    const fileKey = c.req.query('fileKey');
    const nodeIds = c.req.query('nodeIds');
    
    if (!fileKey || !nodeIds) {
      return c.json({ error: 'Missing fileKey or nodeIds' }, 400);
    }

    const figmaToken = Deno.env.get('FIGMA_ACCESS_TOKEN');
    if (!figmaToken) {
      return c.json({ error: 'Figma token not configured' }, 500);
    }

    console.log(`Requesting Figma nodes for ${nodeIds.split(',').length} nodes...`);

    // Call Figma API with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout
    
    const url = `https://api.figma.com/v1/files/${fileKey}/nodes?ids=${nodeIds}`;
    
    try {
      const response = await fetch(url, {
        headers: {
          'X-Figma-Token': figmaToken,
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Figma API error:', response.status, errorText);
        return c.json({ error: 'Figma API error', details: errorText }, response.status);
      }

      const data = await response.json();
      console.log(`✓ Successfully fetched ${Object.keys(data.nodes || {}).length} node structures`);
      return c.json(data);
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        console.error('Figma API request timed out');
        return c.json({ error: 'Request to Figma API timed out' }, 504);
      }
      throw fetchError;
    }
  } catch (error) {
    console.error('Error in Figma nodes proxy:', error);
    return c.json({ error: 'Internal server error', message: error.message }, 500);
  }
});

// Image proxy endpoint to bypass CORS
app.get('/make-server-b35d308f/image-proxy', async (c) => {
  try {
    const imageUrl = c.req.query('url');

    if (!imageUrl) {
      return c.json({ error: 'Missing url parameter' }, 400);
    }

    console.log(`Proxying image: ${imageUrl}`);

    // Fetch the image from Figma S3
    const response = await fetch(imageUrl);

    if (!response.ok) {
      console.error('Failed to fetch image:', response.status);
      return c.json({ error: 'Failed to fetch image' }, response.status);
    }

    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();

    console.log(`✓ Successfully proxied image (${arrayBuffer.byteLength} bytes)`);

    // Return the image with CORS headers
    return new Response(arrayBuffer, {
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'image/png',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Error in image proxy:', error);
    return c.json({ error: 'Internal server error', message: error.message }, 500);
  }
});

app.get('/make-server-b35d308f/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

Deno.serve(app.fetch);