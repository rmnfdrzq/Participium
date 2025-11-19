import { useState, useEffect } from 'react';
import API from '../../../API/API.mjs';
import { useNavigate } from 'react-router';
import './RelationOfficerPage.css';

function RelationOfficerPage() {
  const [reports, setReports] = useState([]);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      const data = await API.getAllPendingReports();
      setReports(data);
    } catch (err) {
      setError('Failed to load reports: ' + err);
    }
  };

  const formatDate = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('it-IT', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="reports-page">

      <div className="reports-content">

        {error && (
          <div className="alert alert-error">
            {error}
            <button className="alert-close" onClick={() => setError('')}>×</button>
          </div>
        )}

        <div className="content-header">
          <h1 className="page-title">Pending Reports</h1>
        </div>

        <div className="reports-table-container">
          <table className="reports-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Title</th>
                <th>Created At</th>
              </tr>
            </thead>

            <tbody>
              {reports.map(report => (
                <tr key={report.id}>
                  <td className="report-id">{report.id}</td>
                  <td className="report-title">{report.title}</td>
                  <td className="report-date">{formatDate(report.created_at)}</td>
                </tr>
              ))}
            </tbody>

          </table>
        </div>

      </div>
    </div>
  );
}

export default RelationOfficerPage;
