import { useState, useEffect } from 'react';
import API from '../../../API/API.mjs';
import { useNavigate } from 'react-router';
import './AdminPage.css';

function AdminPage({user}) {
    const [users, setUsers] = useState([]);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const navigate = useNavigate();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const data = await API.getAllOperators();
      setUsers(data);
    } catch (err) {
      setError('Failed to load users: ' + err);
    }
  };

  const handleCreateUserClick = () => {
    navigate('/admin/createuser');
  };


  const getRoleDisplay = (role) => {
    const roleMap = {
      'citizen': 'Citizen',
      'organization_office': 'Organization Office',
      'technical_office': 'Technical Office',
      'admin': 'Admin',
      'municipality_user': 'Municipality User',
      'urban_planner': 'Urban Planner'
    };
    return roleMap[role] || role;
  };

  const getRoleClass = (role) => {
    switch (role) {
      case 'citizen':
        return 'role-citizen';
      case 'organization_office':
        return 'role-organization';
      case 'technical_office':
        return 'role-technical';
      default:
        return 'role-default';
    }
  };

  return (
    <div className="admin-page">

      <div className="admin-content">
        {error && (
          <div className="alert alert-error">
            {error}
            <button className="alert-close" onClick={() => setError('')}>×</button>
          </div>
        )}

        {success && (
          <div className="alert alert-success">
            {success}
            <button className="alert-close" onClick={() => setSuccess('')}>×</button>
          </div>
        )}

        <div className="content-header">
          <h1 className="page-title">Users</h1>
          <button className="btn-create" onClick={handleCreateUserClick}>
            Create municipal user
          </button>
        </div>

        <div className="users-table-container">
          <table className="users-table">
            <thead>
              <tr>
                <th>Name & Surname</th>
                <th>Login</th>
                <th>Role</th>
              </tr>
            </thead>
            <tbody>
              {users.map(userItem => (
                <tr key={userItem.id}>
                  <td className="user-name">{userItem.username}</td>
                  <td className="user-login">{userItem.email}</td>
                  <td className="role-cell">
                    <span className={getRoleClass(userItem.role)}>
                      {getRoleDisplay(userItem.role)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default AdminPage;