import React from 'react';
import { useAuth } from '../context/AuthContext';

export default function Management() {
  const { user } = useAuth();
  return (
    <div style={{ padding: 20 }}>
      <h2>Master Management</h2>
      <p>Manage master data (HR #{user?.id ?? '—'})</p>
      {/* TODO: implement CRUD UI for master records */}
    </div>
  );
}