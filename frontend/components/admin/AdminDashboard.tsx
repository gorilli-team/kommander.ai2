import { useEffect, useState } from 'react';
import { fetcher } from '@/frontend/lib/utils';

const AdminDashboard = () => {
  const [costSummary, setCostSummary] = useState(null);
  const [clientAnalysis, setClientAnalysis] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCostSummary = async () => {
      try {
        const response = await fetcher('/api/admin/cost-summary', {
          headers: { 'x-admin-secret': 'admin-k2m4x9-secret' }
        });
        setCostSummary(response.data);
      } catch (err) {
        setError('Failed to fetch cost summary');
      }
    };

    const fetchClientAnalysis = async () => {
      try {
        const response = await fetcher('/api/admin/client-analysis', {
          headers: { 'x-admin-secret': 'admin-k2m4x9-secret' }
        });
        setClientAnalysis(response.data);
      } catch (err) {
        setError('Failed to fetch client analysis');
      }
    };

    fetchCostSummary();
    fetchClientAnalysis();
  }, []);

  return (
    <div className="admin-dashboard">
      <h1>Admin Dashboard</h1>
      {error && <div className="error">{error}</div>}
      <div className="cost-summary">
        <h2>Cost Summary</h2>
        {costSummary ? (
          <div>
            <p>Total Cost: ${costSummary.totalCost}</p>
            <p>Total Tokens: {costSummary.totalTokens}</p>
            <p>Average Cost Per Request: ${costSummary.averageCostPerRequest.toFixed(4)}</p>
          </div>
        ) : (
          <p>Loading cost summary...</p>
        )}
      </div>

      <div className="client-analysis">
        <h2>Client Analysis</h2>
        {clientAnalysis ? (
          <div>
            <p>Top Clients: {clientAnalysis.summary.totalClients}</p>
            <p>High Risk Clients: {clientAnalysis.summary.highRiskClients}</p>
            <p>Medium Risk Clients: {clientAnalysis.summary.mediumRiskClients}</p>
            <p>Low Risk Clients: {clientAnalysis.summary.lowRiskClients}</p>
          </div>
        ) : (
          <p>Loading client analysis...</p>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
