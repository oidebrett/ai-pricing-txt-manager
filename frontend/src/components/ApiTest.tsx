import { useEffect, useState } from 'react';

export function ApiTest() {
  const [status, setStatus] = useState<string>('Loading...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const testApi = async () => {
      try {
        // Test the health endpoint directly
        const healthResponse = await fetch('http://localhost:8003/_healthz');
        const healthData = await healthResponse.json();
        console.log('Health check response:', healthData);
        
        // Test the products endpoint through the proxy
        const productsResponse = await fetch('/routes/api/products');
        if (!productsResponse.ok) {
          throw new Error(`Products API returned ${productsResponse.status}`);
        }
        const productsData = await productsResponse.json();
        console.log('Products data:', productsData);
        
        // Test our new test endpoint
        const testResponse = await fetch('/routes/api/test');
        const testData = await testResponse.json();
        console.log('Test endpoint response:', testData);
        
        setStatus('All API tests completed successfully');
      } catch (err) {
        console.error('API test error:', err);
        setError(err instanceof Error ? err.message : String(err));
        setStatus('Failed');
      }
    };

    testApi();
  }, []);

  return (
    <div style={{ padding: '20px', border: '1px solid #ccc', margin: '20px' }}>
      <h2>API Connection Test</h2>
      <p>Status: {status}</p>
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
    </div>
  );
}